// Read-only deterministic comparison. No source rewriting, user saves, or browser storage.
// node tools/astral-growth-balance.mjs --seeds=12 --beam=6 --branch-seeds=4 > design/production/deck-growth-results.json
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const engineURL = new URL('../v4-1/planning-engine.js', import.meta.url);
const plain = value => JSON.parse(JSON.stringify(value));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
export const mean = values => values.length ? +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(3) : null;
export const DEFAULTS = Object.freeze({ seeds: 12, beam: 6, branchSeeds: 4, maxCards: 10, maxTurns: 60, maxActions: 2000 });
export const ORIGINS = ['frost', 'storm', 'mirror'];
const BASICS = ['basicStrike', 'basicWard'];

export function loadEngine(source = fs.readFileSync(engineURL, 'utf8')) {
  const context = {};
  for (const file of ['planning-v1-engine.js', 'planning-v2-engine.js']) {
    vm.runInNewContext(fs.readFileSync(new URL(`../v4-1/${file}`, import.meta.url), 'utf8'), context);
  }
  vm.runInNewContext(source, context);
  return context.ShinkaV43;
}

export function parseOptions(args) {
  const options = { ...DEFAULTS };
  const keys = { seeds: 'seeds', beam: 'beam', 'branch-seeds': 'branchSeeds', 'max-turns': 'maxTurns' };
  for (const arg of args) {
    const match = /^--([^=]+)=(\d+)$/.exec(arg);
    assert(match && keys[match[1]], `Unknown or invalid argument: ${arg}`);
    options[keys[match[1]]] = Number(match[2]);
  }
  for (const [key, max] of [['seeds', 256], ['beam', 32], ['branchSeeds', 32], ['maxTurns', 200]]) {
    assert(Number.isInteger(options[key]) && options[key] >= 1 && options[key] <= max, `Invalid ${key}`);
  }
  return options;
}

export function restored(engine, save) {
  const game = engine.createGame(engine.seededRandom(1));
  assert.equal(game.restoreSave(plain(save)), true,
    `Restore rejected version ${save.version}, ${save.state.phase}, battle ${save.state.battle}, turn ${save.state.turn}`);
  return game;
}

export function checkedRoundTrip(engine, game, audit) {
  const save = plain(game.exportSave());
  const copy = restored(engine, save);
  assert.deepEqual(plain(copy.exportSave()), save, 'Save/RNG round trip changed state');
  if (audit) {
    audit.checks++;
    audit.phases[save.state.phase] = (audit.phases[save.state.phase] || 0) + 1;
  }
  return copy;
}

function terminalValue(before, after) {
  return after.stats.dealt - before.stats.dealt - 2 * (after.stats.taken - before.stats.taken)
    + 1.6 * (after.stats.healed - before.stats.healed)
    + (after.phase === 'battle' ? after.energy * 2 + (after.block + after.focus + after.weaken) * .65 : 0)
    + (after.phase === 'victory' ? 1000 : after.phase === 'defeat' ? -10000 : 0);
}

function stateKey(save) {
  const s = save.state;
  return JSON.stringify([save.rngState, s.phase, s.hp, s.enemyHp, s.energy, s.block, s.focus, s.weaken,
    s.reflect, s.pendingBlock, s.pendingFocus, s.turnLastAttack, s.usedExhaustThisTurn,
    s.turnDamage, s.spellCount, s.interrupted, s.flags, s.hand, s.draw, s.discard, s.exhaust]);
}

export function planTurn(engine, game, options = DEFAULTS, counters = { expandedNodes: 0 }) {
  const before = game.snapshot();
  assert.equal(before.phase, 'battle');
  let beam = [{ save: game.exportSave(), plays: [] }], best = null;
  for (let depth = 0; depth <= options.maxCards && beam.length; depth++) {
    const next = [], seen = new Set();
    for (const node of beam) {
      const candidate = restored(engine, node.save), state = candidate.snapshot();
      const end = restored(engine, node.save);
      if (state.phase === 'battle') assert(end.endTurn());
      const value = terminalValue(before, end.snapshot());
      if (!best || value > best.value + 1e-9 || (Math.abs(value - best.value) < 1e-9 && node.plays.length < best.plays.length)) {
        best = { value, plays: node.plays };
      }
      if (depth === options.maxCards || state.phase !== 'battle') continue;
      const used = new Set();
      for (let index = 0; index < state.hand.length; index++) {
        if (used.has(state.hand[index]) || candidate.previewCard(index).cost > state.energy) continue;
        used.add(state.hand[index]);
        const child = restored(engine, node.save);
        assert(child.play(index)); counters.expandedNodes++;
        const save = child.exportSave(), childState = save.state, key = stateKey(save);
        if (seen.has(key)) continue;
        seen.add(key);
        const probe = restored(engine, save);
        if (childState.phase === 'battle') assert(probe.endTurn());
        const hasAttack = childState.hand.some(id => engine.card(id).isAttack);
        const rank = terminalValue(before, probe.snapshot()) + (hasAttack ? childState.focus * .8 : 0)
          + Math.min(childState.hand.length, 7) * .1;
        next.push({ save, plays: [...node.plays, index], rank });
      }
    }
    beam = next.sort((a, b) => b.rank - a.rank).slice(0, options.beam);
  }
  return best.plays;
}

// A play can activate several tags. Count tagged plays separately from tag occurrences.
// Origin passives and mere base damage/block are not combo activations.
export function comboTags(state, card) {
  return Object.entries({
    focus: card.isAttack && state.focus > 0,
    secondAttack: card.combo && state.spellCount > 0,
    weakness: card.weakBonus && state.weaken > 0,
    weaknessThreshold: card.weakThresholdCondition,
    blockToDamage: card.blockDamage && state.block > 0,
    reflectToDamage: card.actualReflectDamage > 0,
    attacklessIntent: card.recoverCondition,
    emptyMana: (card.emptyBonus && state.energy === 0) || card.emptyWeakCondition || (card.emptyNextBlock && state.energy === card.cost),
    bankedMana: (card.bankBonus && state.energy >= 4) || card.bankBlockCondition,
    previousEmpty: card.prevEmptyBlock && state.prevEndEmpty,
    previousAttack: card.actualMemory > 0,
    priorExhaust: card.exhaustCondition,
    interrupted: card.breakCondition,
    blockTransfer: card.actualTransferredBlock > 0,
    attackRecycled: Boolean(card.recycleTargetId)
  }).filter(([, active]) => active).map(([tag]) => tag);
}

export function rewardType(card) {
  if (card.combo || card.blockDamage || card.focus || card.nextFocus || card.recycleAttack || card.memoryCap || card.transferBlockCap) {
    return 'starter-compatible-combo';
  }
  if (card.weakBonus || card.weakThreshold || card.exhaustBlock || card.reflectDamageCap || card.breakBlock) {
    return 'additional-setup-or-encounter';
  }
  return 'standalone-or-mana-timing';
}

export function rewardScore(engine, id, state) {
  const card = engine.card(id), cards = state.deck.map(x => engine.card(x));
  const attacks = cards.filter(x => x.isAttack).length, guards = cards.filter(x => x.block).length;
  const weak = cards.some(x => x.weaken || x.emptyWeak), reflect = cards.some(x => x.reflect) || state.origin === 'mirror';
  return (card.damage || 0) + (card.block || 0) * .6 + (card.draw || 0) * 3
    + (card.heal || 0) * .7 + (card.weaken || card.emptyWeak || 0) * 1.5 + (card.reflect || 0)
    + (card.energy || 0) * 3 + (attacks ? (card.focus || 0) * .8 + (card.nextFocus || 0) * .55 : 0)
    + (attacks > 2 ? (card.combo || 0) * .8 : 0) + (guards > 2 ? (card.blockDamage || 0) * .5 : 0)
    + (weak ? (card.weakBonus || card.thresholdBonus || 0) * .6 : 0)
    + (reflect ? (card.reflectDamageCap || 0) * .5 : 0) + (card.recoverBonus || 0) * .4
    + (card.emptyBonus || 0) * .5 + (card.memoryCap || 0) * .4 - card.cost * 2;
}

function execute(engine, game, command, audit) {
  const copy = checkedRoundTrip(engine, game, audit);
  assert.equal(game[command[0]](...command.slice(1)), true, `Rejected command ${command}`);
  assert.equal(copy[command[0]](...command.slice(1)), true);
  assert.deepEqual(plain(copy.exportSave()), plain(game.exportSave()), `Restore changed next action: ${command}`);
}

export function fight(engine, game, options = DEFAULTS, audit = { checks: 0, phases: {} }, counters = { expandedNodes: 0 }) {
  const initial = game.snapshot();
  const result = { battle: initial.battle, enemy: initial.enemyId, startHp: initial.hp, startDeckSize: initial.deck.length,
    turns: 0, cardPlays: 0, basicPlays: 0, rewardCardPlays: 0, comboPlays: 0, comboTags: {}, battleActions: 0,
    turnsWithMultiplePlays: 0, turnsWithCombo: 0, maxPlaysPerTurn: 0, turnsTakingDamage: 0, maxTurnDamageTaken: 0 };
  while (game.snapshot().phase === 'battle' && result.turns < options.maxTurns) {
    const before = game.snapshot();
    const plan = planTurn(engine, game, options, counters);
    result.turns++;
    let comboThisTurn = false;
    for (const index of plan) {
      const state = game.snapshot(), card = game.previewCard(index), tags = comboTags(state, card);
      result.cardPlays++; result.battleActions++;
      result.basicPlays += Number(BASICS.includes(card.base));
      result.rewardCardPlays += Number(state.rewards.includes(card.base));
      result.comboPlays += Number(tags.length > 0); comboThisTurn ||= tags.length > 0;
      for (const tag of tags) result.comboTags[tag] = (result.comboTags[tag] || 0) + 1;
      execute(engine, game, ['play', index], audit);
    }
    if (game.snapshot().phase === 'battle') { execute(engine, game, ['endTurn'], audit); result.battleActions++; }
    const after = game.snapshot(), taken = after.stats.taken - before.stats.taken;
    result.turnsWithCombo += Number(comboThisTurn);
    result.turnsWithMultiplePlays += Number(plan.length >= 2);
    result.maxPlaysPerTurn = Math.max(result.maxPlaysPerTurn, plan.length);
    result.turnsTakingDamage += Number(taken > 0);
    result.maxTurnDamageTaken = Math.max(result.maxTurnDamageTaken, taken);
  }
  const end = game.snapshot();
  checkedRoundTrip(engine, game, audit);
  return { ...result, result: end.phase === 'battle' ? 'turn-budget-exhausted' : end.phase,
    win: end.phase === 'victory', endHp: end.hp, damageTaken: end.stats.taken - initial.stats.taken,
    damageDealt: end.stats.dealt - initial.stats.dealt, healing: end.stats.healed - initial.stats.healed,
    interrupts: end.stats.interrupts - initial.stats.interrupts,
    cardPlaysPerTurn: +(result.cardPlays / result.turns).toFixed(3), actionsPerTurn: +(result.battleActions / result.turns).toFixed(3) };
}

export function runTrial(engine, { seed = 1, origin = 'frost', ruleset = 'growth-v1', ...provided } = {}) {
  const options = { ...DEFAULTS, ...provided }, game = engine.createGame(engine.seededRandom(seed), { ruleset });
  assert(game.selectOrigin(origin));
  const audit = { checks: 0, phases: {} }, counters = { expandedNodes: 0 };
  const row = { seed, origin, ruleset, battles: [], rewardChoices: [], totalTurns: 0, totalCardPlays: 0,
    totalBattleActions: 0, totalComboPlays: 0, firstRewardAtTurn: null };
  let campSave = null, actions = 0;
  while (!['complete', 'defeat'].includes(game.snapshot().phase) && actions < options.maxActions) {
    const state = game.snapshot();
    if (state.phase === 'battle') {
      const battle = fight(engine, game, options, audit, counters);
      row.battles.push(battle); row.totalTurns += battle.turns; row.totalCardPlays += battle.cardPlays;
      row.totalBattleActions += battle.battleActions; row.totalComboPlays += battle.comboPlays; actions += battle.battleActions;
      if (battle.result === 'turn-budget-exhausted') break;
      continue;
    }
    let command;
    if (state.phase === 'reward') {
      const offers = plain(game.rewardOptions());
      const selected = [...offers].sort((a, b) => rewardScore(engine, b, state) - rewardScore(engine, a, state))[0];
      row.rewardChoices.push({ afterBattle: state.battle, selected, selectedType: rewardType(engine.card(selected)),
        offers: offers.map(id => ({ id, type: rewardType(engine.card(id)), score: +rewardScore(engine, id, state).toFixed(3) })) });
      if (row.firstRewardAtTurn === null) row.firstRewardAtTurn = row.totalTurns;
      command = ['chooseReward', selected];
    } else {
      if (state.phase === 'sanctuary' && state.battle === 2) campSave = plain(game.exportSave());
      command = { intro: ['start'], victory: ['openReward'], route: ['chooseRoute', 'moon'],
        chapter: ['chooseChapter', 'library'], sanctuary: ['chooseSanctuary', 'rest'],
        camp: ['chooseCamp', 'rest'], ready: ['nextBattle'] }[state.phase];
    }
    if (!command) break;
    execute(engine, game, command, audit); actions++;
  }
  const end = game.snapshot();
  checkedRoundTrip(engine, game, audit);
  row.terminal = ['complete', 'defeat'].includes(end.phase) ? end.phase
    : row.battles.at(-1)?.result === 'turn-budget-exhausted' ? 'turn-budget-exhausted' : 'action-budget-or-unhandled-phase';
  row.wins = end.wins; row.endHp = end.hp; row.finalDeckSize = end.deck.length;
  row.cardPlaysPerTurn = row.totalTurns ? +(row.totalCardPlays / row.totalTurns).toFixed(3) : null;
  row.actionsPerTurn = row.totalTurns ? +(row.totalBattleActions / row.totalTurns).toFixed(3) : null;
  row.saveAudit = audit; row.expandedNodes = counters.expandedNodes;
  return { row, campSave };
}

export function campBranches(engine, campSave, options = DEFAULTS, hp = null) {
  const saved = plain(campSave);
  if (hp !== null) saved.state.hp = hp;
  const rows = [], choices = ['rest', 'evolve:basicStrike', 'evolve:basicWard', 'remove:basicStrike', 'remove:basicWard'];
  for (const choice of choices) {
    const game = restored(engine, saved), audit = { checks: 0, phases: {} }, counters = { expandedNodes: 0 };
    const [action, id] = choice.split(':');
    execute(engine, game, ['chooseSanctuary', action], audit);
    if (action === 'evolve') execute(engine, game, ['evolve', id], audit);
    if (action === 'remove') execute(engine, game, ['removeCard', id], audit);
    const afterChoice = game.snapshot();
    execute(engine, game, ['nextBattle'], audit);
    rows.push({ choice, hpAfterChoice: afterChoice.hp, deckSize: afterChoice.deck.length,
      ...fight(engine, game, options, audit, counters), saveAudit: audit, expandedNodes: counters.expandedNodes });
  }
  return { inputHp: saved.state.hp, syntheticHp: hp !== null, branches: rows };
}

function battleSummary(rows, battle) {
  const values = rows.flatMap(row => row.battles.filter(b => b.battle === battle));
  return { battle, reached: values.length, wins: values.filter(x => x.win).length,
    meanTurns: mean(values.map(x => x.turns)), meanCardPlays: mean(values.map(x => x.cardPlays)),
    meanBattleActions: mean(values.map(x => x.battleActions)), meanBasicPlays: mean(values.map(x => x.basicPlays)), meanDamageTaken: mean(values.map(x => x.damageTaken)),
    meanCardPlaysPerTurn: mean(values.map(x => x.cardPlaysPerTurn)),
    meanActionsPerTurn: mean(values.map(x => x.actionsPerTurn)), meanComboPlays: mean(values.map(x => x.comboPlays)),
    meanRewardCardPlays: mean(values.map(x => x.rewardCardPlays)) };
}

export function summarize(rows) {
  return { runs: rows.length, complete: rows.filter(x => x.terminal === 'complete').length,
    defeat: rows.filter(x => x.terminal === 'defeat').length,
    budgetOrUnhandled: rows.filter(x => !['complete', 'defeat'].includes(x.terminal)).length,
    meanWins: mean(rows.map(x => x.wins)), meanTotalTurns: mean(rows.map(x => x.totalTurns)),
    meanTotalCardPlays: mean(rows.map(x => x.totalCardPlays)), meanTotalBattleActions: mean(rows.map(x => x.totalBattleActions)),
    meanFirstRewardTurn: mean(rows.map(x => x.firstRewardAtTurn).filter(x => x !== null)),
    meanFirstFightCardPlays: mean(rows.map(x => x.battles[0]?.cardPlays).filter(x => x !== undefined)),
    meanFirstFightActions: mean(rows.map(x => x.battles[0]?.battleActions).filter(x => x !== undefined)),
    meanCardPlaysPerTurn: mean(rows.map(x => x.cardPlaysPerTurn)), meanActionsPerTurn: mean(rows.map(x => x.actionsPerTurn)),
    meanComboPlays: mean(rows.map(x => x.totalComboPlays)),
    rewardSelectedTypes: rows.flatMap(x => x.rewardChoices).reduce((counts, x) => {
      counts[x.selectedType] = (counts[x.selectedType] || 0) + 1; return counts;
    }, {}),
    battles: Array.from({ length: 6 }, (_, i) => battleSummary(rows, i + 1)) };
}

function branchSummary(rows) {
  const result = {};
  for (const hpClass of ['observed', 'low-20', 'full-60']) {
    const selected = rows.filter(x => x.hpClass === hpClass);
    result[hpClass] = { pairs: selected.length, choices: {}, uniqueBestNextBattle: {}, tiedBestNextBattle: 0 };
    for (const choice of ['rest', 'evolve:basicStrike', 'evolve:basicWard', 'remove:basicStrike', 'remove:basicWard']) {
      const values = selected.map(x => x.branches.find(b => b.choice === choice));
      result[hpClass].choices[choice] = { attempts: values.length, wins: values.filter(x => x.win).length,
        meanEndHp: mean(values.map(x => x.endHp)), meanDamageTaken: mean(values.map(x => x.damageTaken)),
        meanTurns: mean(values.map(x => x.turns)), meanCardPlaysPerTurn: mean(values.map(x => x.cardPlaysPerTurn)) };
    }
    for (const row of selected) {
      const rank = branch => [Number(branch.win), branch.endHp, -branch.turns];
      const order = (a, b) => { const x = rank(a), y = rank(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; };
      const sorted = [...row.branches].sort(order);
      if (order(sorted[0], sorted[1]) === 0) result[hpClass].tiedBestNextBattle++;
      else result[hpClass].uniqueBestNextBattle[sorted[0].choice] = (result[hpClass].uniqueBestNextBattle[sorted[0].choice] || 0) + 1;
    }
  }
  return result;
}

export function legacyCompatibility(engine) {
  const fixture = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/astral-v412-baseline.json', import.meta.url), 'utf8'));
  const rows = [];
  for (const [name, save] of Object.entries(fixture.saves)) {
    const restoredGame = restored(engine, save);
    assert.deepEqual(plain(restoredGame.exportSave()), save);
    rows.push({ name, version: save.version, phase: save.state.phase, exact: true });
  }
  return { source: 'tests/fixtures/astral-v412-baseline.json', exactRestores: rows.length, rows };
}

export function buildReport(options = DEFAULTS, progress = () => {}) {
  const started = performance.now(), source = fs.readFileSync(engineURL, 'utf8'), engine = loadEngine(source);
  const timings = [], mark = (phase, start) => { const seconds = +((performance.now() - start) / 1000).toFixed(3); timings.push({ phase, seconds }); progress(`${phase}: ${seconds}s`); };
  const report = { schemaVersion: 1, sourceSha256: digest(source), harnessSha256: digest(fs.readFileSync(new URL(import.meta.url), 'utf8')),
    command: `node tools/astral-growth-balance.mjs --seeds=${options.seeds} --beam=${options.beam} --branch-seeds=${options.branchSeeds} --max-turns=${options.maxTurns}`,
    nodeVersion: process.version, options,
    policy: { name: 'bounded full-turn beam, real enemy response', horizon: 'One player turn and its enemy response',
      score: 'dealt - 2*taken + 1.6*healed + 2*carried energy + .65*(next-turn block+focus+weakness); victory +1000; defeat -10000',
      ranking: 'Preserves focus setup with remaining attacks and a small hand-size potential; stable ties prefer fewer plays. Residual resources have zero value after victory or defeat.',
      rewards: 'Highest exported rewardScore; one chosen card at every reward. Same formula and policy across both rulesets.',
      path: 'Moon, library, rest at every stop in full runs. First-stop alternatives are independently replayed.',
      oracleWarning: 'Search sees deterministic within-turn draw outcomes. Not an optimal policy or a model of human knowledge, enjoyment, discoverability, or play duration.' },
    definitions: { timeProxy: 'Sum of player turns actually examined in reached battles. Report reach counts; early defeats can artificially lower total turns.',
      comboPlays: 'A played card with one or more exported comboTags conditions active. Multiple tags count once as a combo play. Passive origin effects excluded.',
      rewardCardPlays: 'Play of a base ID acquired as a reward; classic may already have that ID, so this does not identify individual copies.',
      actionsPerTurn: 'Card plays plus end-turn presses divided by observed player turns. Excludes menu decisions.',
      rewardTypes: 'Static mechanical grouping, not a quality rating. Setup requirements differ by acquired deck and encounter.',
      damageTaken: 'Actual stats.taken, not net HP change; healing cannot hide damage.',
      campBranches: 'Exact same save/RNG after battle 2 through battle 3 only; five alternatives. Low/full HP copies are explicit synthetic probes, not naturally observed rates.',
      pairing: 'Seeds and origins matched, but different decks/reward pools consume RNG differently. Later encounters are survivor-conditioned. Removal also changes shuffle order.' },
    legacyCompatibility: legacyCompatibility(engine), rows: [], campBranches: [] };
  mark('load-and-legacy-compatibility', started);
  for (const origin of ORIGINS) {
    const phaseStart = performance.now();
    for (let seed = 1; seed <= options.seeds; seed++) {
      for (const ruleset of ['classic', 'growth-v1']) {
        const run = runTrial(engine, { ...options, origin, seed, ruleset });
        report.rows.push(run.row);
        if (ruleset === 'growth-v1' && seed <= options.branchSeeds && run.campSave) {
          for (const [hpClass, hp] of [['observed', null], ['low-20', 20], ['full-60', 60]]) {
            report.campBranches.push({ seed, origin, hpClass, ...campBranches(engine, run.campSave, options, hp) });
          }
        }
      }
    }
    mark(`matched-runs-and-branches:${origin}`, phaseStart);
  }
  report.summary = Object.fromEntries(['classic', 'growth-v1'].map(ruleset => [ruleset, summarize(report.rows.filter(x => x.ruleset === ruleset))]));
  report.byOrigin = Object.fromEntries(ORIGINS.map(origin => [origin, Object.fromEntries(['classic', 'growth-v1'].map(ruleset => [ruleset,
    summarize(report.rows.filter(x => x.origin === origin && x.ruleset === ruleset))]))]));
  report.pairedBattles = Array.from({ length: 6 }, (_, i) => {
    const battle = i + 1, pairs = [];
    for (const classic of report.rows.filter(x => x.ruleset === 'classic')) {
      const growth = report.rows.find(x => x.ruleset === 'growth-v1' && x.seed === classic.seed && x.origin === classic.origin);
      const a = classic.battles.find(x => x.battle === battle), b = growth.battles.find(x => x.battle === battle);
      if (a && b) pairs.push([a, b]);
    }
    return { battle, pairedReached: pairs.length, meanGrowthMinusClassicTurns: mean(pairs.map(([a, b]) => b.turns - a.turns)),
      meanGrowthMinusClassicDamageTaken: mean(pairs.map(([a, b]) => b.damageTaken - a.damageTaken)),
      meanGrowthMinusClassicCardPlays: mean(pairs.map(([a, b]) => b.cardPlays - a.cardPlays)),
      meanGrowthMinusClassicActions: mean(pairs.map(([a, b]) => b.battleActions - a.battleActions)) };
  });
  report.campSummary = branchSummary(report.campBranches);
  const audits = [...report.rows.map(x => x.saveAudit), ...report.campBranches.flatMap(x => x.branches.map(b => b.saveAudit))];
  report.saveAudit = { checks: audits.reduce((n, x) => n + x.checks, 0), phases: [...new Set(audits.flatMap(x => Object.keys(x.phases)))].sort(),
    method: 'Every executed action is replayed from public export/restore; compare exact next save and RNG. Every reached terminal state round-tripped.' };
  report.expandedNodes = report.rows.reduce((n, x) => n + x.expandedNodes, 0)
    + report.campBranches.flatMap(x => x.branches).reduce((n, x) => n + x.expandedNodes, 0);
  report.timings = timings; report.wallSeconds = +((performance.now() - started) / 1000).toFixed(3);
  assert.equal(digest(fs.readFileSync(engineURL, 'utf8')), report.sourceSha256, 'Engine changed during run; rerun against final source');
  return report;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const report = buildReport(parseOptions(process.argv.slice(2)), message => console.error(message));
  console.log(JSON.stringify(report, null, 2));
}
