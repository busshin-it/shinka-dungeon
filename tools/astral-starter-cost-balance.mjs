// Read-only deterministic paired comparison; no runtime rewriting or user-save access.
// node tools/astral-starter-cost-balance.mjs --seeds=24 --beam=6 --branch-seeds=8 > design/production/starter-cost-results.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { DEFAULTS, ORIGINS, loadEngine, parseOptions, restored, planTurn, runTrial, campBranches, summarize, mean } from './astral-growth-balance.mjs';

const BASELINE_COMMIT = 'a84ec049d3ff5e94b818b2f3447abe29739da513';
const RULESETS = ['growth-v1', 'growth-v2'];
const BASICS = ['basicStrike', 'basicWard', 'basicStrike+', 'basicWard+'];
const plain = value => JSON.parse(JSON.stringify(value));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const historical = path => execFileSync('git', ['show', `${BASELINE_COMMIT}:${path}`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });

function checkEconomies(baseline, candidate, options) {
  assert.deepEqual(plain(candidate.GROWTH_ENEMIES), plain(baseline.GROWTH_ENEMIES), 'Enemy definitions changed');
  assert.deepEqual(plain(candidate.BASIC_STARTER), plain(baseline.BASIC_STARTER));
  assert.deepEqual(plain(candidate.CARDS), plain(baseline.CARDS), 'Shared static card data changed');
  assert.deepEqual(plain(candidate.FIRST_REWARD_POOLS), plain(baseline.FIRST_REWARD_POOLS));
  assert.equal(candidate.createGame(candidate.seededRandom(1)).snapshot().ruleset, 'growth-v2');
  const rows = [];
  for (const ruleset of RULESETS) {
    const engine = ruleset === 'growth-v1' ? baseline : candidate;
    const game = engine.createGame(engine.seededRandom(1), { ruleset });
    assert(game.selectOrigin('frost')); assert(game.start());
    const expectedCost = ruleset === 'growth-v2' ? 1 : 0;
    for (const id of BASICS) {
      const c = game.card ? game.card(id) : engine.card(id);
      assert.equal(c.cost, expectedCost);
      assert.equal(engine.card(id, game.snapshot()).cost, expectedCost);
      if (id.endsWith('+')) assert.equal(c.damage || c.block, 5);
    }
    const initial = game.snapshot(), openingPlan = planTurn(engine, game, options);
    const costTrace = [];
    for (const index of openingPlan) {
      const s = game.snapshot(), c = game.previewCard(index);
      assert(c.cost <= s.energy);
      costTrace.push({ card: c.id, cost: c.cost, energyBefore: s.energy });
      assert(game.play(index));
    }
    const zeroSave = engine.createGame(engine.seededRandom(1), { ruleset });
    assert(zeroSave.start());
    const zero = zeroSave.exportSave(); zero.state.energy = 0;
    const zeroPlan = planTurn(engine, restored(engine, zero), options);
    if (ruleset === 'growth-v2') assert.deepEqual(zeroPlan, [], 'Search tried to play a paid starter at zero mana');
    else assert(zeroPlan.length > 0, 'Old free starters should remain playable at zero mana');
    const regenGame = engine.createGame(engine.seededRandom(1), { ruleset });
    assert(regenGame.start()); assert(regenGame.endTurn());
    const energyAfterEmptyTurn = regenGame.snapshot().energy;
    assert.equal(energyAfterEmptyTurn, ruleset === 'growth-v2' ? 5 : 3);
    rows.push({ ruleset, saveVersion: game.exportSave().version, basicCost: expectedCost,
      startingMana: initial.energy, maxMana: initial.maxEnergy, manaRegen: ruleset === 'growth-v2' ? 3 : 1,
      openingHand: initial.hand, openingPlan: costTrace, zeroManaPlanCardCount: zeroPlan.length, energyAfterEmptyTurn });
  }
  return { sameEnemyDefinitions: true, sameStarterDeck: true, sameSharedCardData: true, sameFirstRewardPools: true,
    newRunDefault: 'growth-v2', affordability: 'Imported planTurn tests candidate.previewCard(index).cost; zero-mana and sequential payment probes pass.', rows };
}

function addMetrics(row) {
  // runTrial performs one round-trip per command, one after each fight, and one at run end.
  row.totalActionsIncludingMenus = row.saveAudit.checks - row.battles.length - 1;
  row.menuActions = row.totalActionsIncludingMenus - row.totalBattleActions;
  row.firstRewardAtAction = row.firstRewardAtTurn === null ? null : row.battles[0].battleActions + 2;
  row.firstFightTurns = row.battles[0]?.turns ?? null;
  return row;
}

function fullSummary(rows) {
  const histogram = values => values.reduce((out, value) => { out[value] = (out[value] || 0) + 1; return out; }, {});
  return { ...summarize(rows), meanFirstFightTurns: mean(rows.map(x => x.firstFightTurns)),
    meanFirstRewardAction: mean(rows.map(x => x.firstRewardAtAction).filter(x => x !== null)),
    meanTotalActionsIncludingMenus: mean(rows.map(x => x.totalActionsIncludingMenus)),
    meanMenuActions: mean(rows.map(x => x.menuActions)), firstFightTurnCounts: histogram(rows.map(x => x.firstFightTurns)),
    firstFightCardPlayCounts: histogram(rows.map(x => x.battles[0].cardPlays)),
    completedRuns: { count: rows.filter(x => x.terminal === 'complete').length,
      meanTotalTurns: mean(rows.filter(x => x.terminal === 'complete').map(x => x.totalTurns)),
      meanTotalCardPlays: mean(rows.filter(x => x.terminal === 'complete').map(x => x.totalCardPlays)),
      meanTotalBattleActions: mean(rows.filter(x => x.terminal === 'complete').map(x => x.totalBattleActions)) } };
}

function summarizeBranches(rows) {
  return Object.fromEntries(RULESETS.map(ruleset => [ruleset, Object.fromEntries(['observed', 'low-20', 'full-60'].map(hpClass => {
    const selected = rows.filter(row => row.ruleset === ruleset && row.hpClass === hpClass);
    const summary = { saves: selected.length, choices: {}, uniqueBestNextBattle: {}, tiedBestNextBattle: 0 };
    for (const choice of ['rest', 'evolve:basicStrike', 'evolve:basicWard', 'remove:basicStrike', 'remove:basicWard']) {
      const values = selected.map(x => x.branches.find(b => b.choice === choice));
      summary.choices[choice] = { attempts: values.length, wins: values.filter(x => x.win).length,
        meanEndHp: mean(values.map(x => x.endHp)), meanDamageTaken: mean(values.map(x => x.damageTaken)),
        meanTurns: mean(values.map(x => x.turns)), meanCardPlays: mean(values.map(x => x.cardPlays)),
        meanBattleActions: mean(values.map(x => x.battleActions)) };
    }
    const order = (a, b) => Number(b.win) - Number(a.win) || b.endHp - a.endHp || a.turns - b.turns;
    for (const row of selected) {
      const sorted = [...row.branches].sort(order);
      if (order(sorted[0], sorted[1]) === 0) summary.tiedBestNextBattle++;
      else summary.uniqueBestNextBattle[sorted[0].choice] = (summary.uniqueBestNextBattle[sorted[0].choice] || 0) + 1;
    }
    return [hpClass, summary];
  }))]));
}

export function buildStarterCostReport(options = { ...DEFAULTS, seeds: 24, branchSeeds: 8 }, progress = () => {}) {
  const started = performance.now(), source = read('../v4-1/planning-engine.js'), oldSource = historical('v4-1/planning-engine.js');
  const importedSource = read('./astral-growth-balance.mjs'), ownSource = read('./astral-starter-cost-balance.mjs');
  const dependencies = {};
  for (const name of ['planning-v1-engine.js', 'planning-v2-engine.js']) {
    const current = read(`../v4-1/${name}`);
    assert.equal(current, historical(`v4-1/${name}`), `${name} changed from baseline`);
    dependencies[name] = digest(current);
  }
  const engines = { 'growth-v1': loadEngine(oldSource), 'growth-v2': loadEngine(source) };
  const report = { schemaVersion: 1, baselineCommit: BASELINE_COMMIT, baselineSourceSha256: digest(oldSource),
    sourceSha256: digest(source), harnessSha256: digest(ownSource), importedHarnessSha256: digest(importedSource), dependencySha256: dependencies,
    command: `node tools/astral-starter-cost-balance.mjs --seeds=${options.seeds} --beam=${options.beam} --branch-seeds=${options.branchSeeds} --max-turns=${options.maxTurns}`,
    nodeVersion: process.version, options,
    policy: { implementation: 'Unmodified exports from tools/astral-growth-balance.mjs: planTurn, runTrial, rewardScore, campBranches.',
      name: 'Bounded one-player-turn beam search including the actual enemy response',
      score: 'dealt - 2*taken + 1.6*healed + 2*carried energy + .65*(next-turn block+focus+weakness); victory +1000; defeat -10000',
      ranking: 'Preserves focus setup with remaining attacks and a small hand-size potential; stable ties prefer fewer plays. Residual resources have zero value after victory or defeat.',
      rewards: 'Same exported rewardScore for both arms, choosing its highest-ranked offered card.',
      path: 'Moon, library, rest at every stop in full runs. First sanctuary alternatives independently replayed through battle 3.',
      limits: 'Not an optimal policy, human play test, or enjoyment estimate. Search knows deterministic within-turn draw outcomes. Reward heuristic was not retuned for paid starters.' },
    definitions: { baseline: 'Exact main-branch engine source at baselineCommit, explicit growth-v1 (free basics, +1 mana).',
      candidate: 'Current engine, fresh growth-v2 (cost-1 basics, +3 mana); same seed, origin, initial deck, enemies, route and policy.',
      pairing: 'Pair labels match seeds/origins, not every later draw or reward: different play sequences consume shuffle RNG differently. Enemy sequence and definitions stay equal.',
      turns: 'Player turns examined in reached fights; not seconds. Defeats truncate totals, so report reach counts and completed-run subsets.',
      cardPlays: 'Successful card plays, used as a card-click proxy. UI animations, inspection, thinking time and accidental inputs are excluded.',
      battleActions: 'Successful card plays plus end-turn presses. No end-turn press is counted when a card ends the battle.',
      totalActionsIncludingMenus: 'All executed runTrial commands, including start and menu choices; excludes selecting origin and inspection clicks.',
      firstRewardAction: 'Actions through displaying the first reward: start + first-fight battleActions + openReward. Does not include choosing the reward.',
      campBranches: 'Each arm uses its own exact post-battle-2 save/RNG. Observed HP is natural; low-20/full-60 copies are synthetic. Five options, next battle only. Best is win, then HP, then fewer turns.',
      compatibility: 'Nine matched full growth-v1 trials against current engine must exactly match baseline rows and first-sanctuary saves.',
      comboPlays: 'Imported comboTags conditions; passive origin effects do not count.',
      damageTaken: 'Actual stats.taken, not net HP change.' },
    economyAudit: checkEconomies(engines['growth-v1'], engines['growth-v2'], options),
    growthV1Compatibility: [], rows: [], campBranches: [], timings: [] };
  const currentEngine = engines['growth-v2'];
  for (const origin of ORIGINS) {
    const originStart = performance.now();
    for (let seed = 1; seed <= options.seeds; seed++) {
      for (const ruleset of RULESETS) {
        const result = runTrial(engines[ruleset], { ...options, seed, origin, ruleset });
        if (ruleset === 'growth-v1' && [...new Set([1, Math.ceil(options.seeds / 2), options.seeds])].includes(seed)) {
          const current = runTrial(currentEngine, { ...options, seed, origin, ruleset });
          assert.deepEqual(current, result, `Current growth-v1 changed from baseline: ${origin}/${seed}`);
          report.growthV1Compatibility.push({ origin, seed, exactRowAndCampSave: true });
        }
        report.rows.push(addMetrics(result.row));
        if (seed <= options.branchSeeds && result.campSave) {
          for (const [hpClass, hp] of [['observed', null], ['low-20', 20], ['full-60', 60]]) {
            report.campBranches.push({ origin, seed, ruleset, hpClass, ...campBranches(engines[ruleset], result.campSave, options, hp) });
          }
        }
      }
      if (seed % 4 === 0) progress(`${origin}: ${seed}/${options.seeds} paired seeds measured`);
    }
    report.timings.push({ phase: `runs-and-branches:${origin}`, seconds: +((performance.now() - originStart) / 1000).toFixed(3) });
  }
  report.summary = Object.fromEntries(RULESETS.map(ruleset => [ruleset, fullSummary(report.rows.filter(x => x.ruleset === ruleset))]));
  report.byOrigin = Object.fromEntries(ORIGINS.map(origin => [origin, Object.fromEntries(RULESETS.map(ruleset => [ruleset,
    fullSummary(report.rows.filter(x => x.origin === origin && x.ruleset === ruleset))]))]));
  const pairs = report.rows.filter(x => x.ruleset === 'growth-v1').map(a => [a,
    report.rows.find(x => x.ruleset === 'growth-v2' && x.seed === a.seed && x.origin === a.origin)]);
  report.pairedRuns = { pairs: pairs.length, bothComplete: pairs.filter(([a, b]) => a.terminal === 'complete' && b.terminal === 'complete').length,
    baselineOnlyComplete: pairs.filter(([a, b]) => a.terminal === 'complete' && b.terminal !== 'complete').length,
    candidateOnlyComplete: pairs.filter(([a, b]) => a.terminal !== 'complete' && b.terminal === 'complete').length,
    neitherComplete: pairs.filter(([a, b]) => a.terminal !== 'complete' && b.terminal !== 'complete').length,
    meanCandidateMinusBaselineTurns: mean(pairs.map(([a, b]) => b.totalTurns - a.totalTurns)),
    meanCandidateMinusBaselineCardPlays: mean(pairs.map(([a, b]) => b.totalCardPlays - a.totalCardPlays)),
    meanCandidateMinusBaselineBattleActions: mean(pairs.map(([a, b]) => b.totalBattleActions - a.totalBattleActions)),
    bothCompleteMeanTurnDelta: mean(pairs.filter(([a, b]) => a.terminal === 'complete' && b.terminal === 'complete').map(([a, b]) => b.totalTurns - a.totalTurns)),
    bothCompleteMeanCardPlayDelta: mean(pairs.filter(([a, b]) => a.terminal === 'complete' && b.terminal === 'complete').map(([a, b]) => b.totalCardPlays - a.totalCardPlays)) };
  report.pairedBattles = Array.from({ length: 6 }, (_, i) => {
    const battle = i + 1, reached = pairs.map(([a, b]) => [a.battles.find(x => x.battle === battle), b.battles.find(x => x.battle === battle)]).filter(([a, b]) => a && b);
    assert(reached.every(([a, b]) => a.enemy === b.enemy), 'Paired enemy sequence diverged');
    return { battle, pairedReached: reached.length,
      meanCandidateMinusBaselineTurns: mean(reached.map(([a, b]) => b.turns - a.turns)),
      meanCandidateMinusBaselineCardPlays: mean(reached.map(([a, b]) => b.cardPlays - a.cardPlays)),
      meanCandidateMinusBaselineActions: mean(reached.map(([a, b]) => b.battleActions - a.battleActions)),
      meanCandidateMinusBaselineDamageTaken: mean(reached.map(([a, b]) => b.damageTaken - a.damageTaken)) };
  });
  report.campSummary = summarizeBranches(report.campBranches);
  const audits = [...report.rows.map(x => x.saveAudit), ...report.campBranches.flatMap(x => x.branches.map(b => b.saveAudit))];
  report.saveAudit = { checks: audits.reduce((n, x) => n + x.checks, 0), phases: [...new Set(audits.flatMap(x => Object.keys(x.phases)))].sort(),
    method: 'Every measured command replayed from public export/restore, comparing exact next save and RNG; reached fight and run terminal states round-tripped.' };
  report.expandedNodes = report.rows.reduce((n, x) => n + x.expandedNodes, 0) + report.campBranches.flatMap(x => x.branches).reduce((n, x) => n + x.expandedNodes, 0);
  report.wallSeconds = +((performance.now() - started) / 1000).toFixed(3);
  assert.equal(digest(read('../v4-1/planning-engine.js')), report.sourceSha256, 'Engine changed during measurement');
  assert.equal(digest(read('./astral-growth-balance.mjs')), report.importedHarnessSha256, 'Imported policy changed during measurement');
  assert.equal(digest(read('./astral-starter-cost-balance.mjs')), report.harnessSha256, 'Harness changed during measurement');
  return report;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const options = parseOptions(['--seeds=24', '--branch-seeds=8', ...process.argv.slice(2)]);
  console.log(JSON.stringify(buildStarterCostReport(options, message => console.error(message)), null, 2));
}
