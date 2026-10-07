import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadEngine, parseOptions, DEFAULTS, mean, restored, checkedRoundTrip, comboTags, rewardType,
  rewardScore, planTurn, runTrial, campBranches, summarize, legacyCompatibility
} from '../tools/astral-growth-balance.mjs';

const engine = loadEngine();
const options = { ...DEFAULTS, beam: 2, seeds: 1, branchSeeds: 1 };
const plain = value => JSON.parse(JSON.stringify(value));

// The harness itself is a product of this trial. Check its counts rather than
// assuming a successful engine test proves the comparison is trustworthy.
test('growth analysis arguments have explicit bounded defaults and reject invalid input', () => {
  assert.deepEqual(parseOptions([]), DEFAULTS);
  assert.equal(parseOptions(['--seeds=24', '--beam=6', '--branch-seeds=8']).branchSeeds, 8);
  for (const arg of ['--seeds=0', '--seeds=257', '--beam=33', '--beam=foo', '--random=1', '--max-turns=201', '--branch-seeds=0']) {
    assert.throws(() => parseOptions([arg]));
  }
  assert.equal(mean([]), null);
  assert.equal(mean([1, 2, 3]), 2);
});

test('comparison preserves exact legacy saves and distinct classic/growth rulesets', () => {
  const compatibility = legacyCompatibility(engine);
  assert(compatibility.exactRestores > 0);
  assert(compatibility.rows.every(x => x.exact && x.version === 3));
  const classic = engine.createGame(engine.seededRandom(19), { ruleset: 'classic' });
  const growth = engine.createGame(engine.seededRandom(19));
  assert.equal(classic.exportSave().version, 3);
  assert.equal(growth.exportSave().version, 4);
  assert.equal(classic.snapshot().ruleset, undefined);
  assert.equal(growth.snapshot().ruleset, 'growth-v1');
  assert.equal(growth.snapshot().deck.filter(x => x === 'basicStrike').length, 5);
  assert.equal(growth.snapshot().deck.filter(x => x === 'basicWard').length, 5);
});

test('combo counters separate real conditions from base effects and passive origins', () => {
  const empty = { focus: 0, spellCount: 0, weaken: 0, block: 0, energy: 2, prevEndEmpty: false };
  assert.deepEqual(comboTags(empty, { ...engine.card('basicStrike'), actualMemory: 0 }), []);
  assert.deepEqual(comboTags(empty, { ...engine.card('basicWard'), actualReflect: 2 }), []);
  assert.deepEqual(comboTags({ ...empty, focus: 4, spellCount: 1 }, engine.card('chain')), ['focus', 'secondAttack']);
  assert.deepEqual(comboTags({ ...empty, block: 5 }, engine.card('shieldStrike')), ['blockToDamage']);
  assert.deepEqual(comboTags(empty, { ...engine.card('quietComet'), recoverCondition: true }), ['attacklessIntent']);
  assert.deepEqual(comboTags(empty, { ...engine.card('quietComet'), recoverCondition: false }), []);
  assert.deepEqual(comboTags(empty, { ...engine.card('starBookmark'), recycleTargetId: 'basicStrike' }), ['attackRecycled']);
  assert.deepEqual(comboTags({ ...empty, energy: 0 }, engine.card('spark')), ['emptyMana']);
  assert.deepEqual(comboTags(empty, { ...engine.card('frostPierce'), weakThresholdCondition: false }), []);
});

test('reward grouping describes setup and score can see basic-deck synergy', () => {
  assert.equal(rewardType(engine.card('bolt')), 'standalone-or-mana-timing');
  assert.equal(rewardType(engine.card('chain')), 'starter-compatible-combo');
  assert.equal(rewardType(engine.card('shieldStrike')), 'starter-compatible-combo');
  assert.equal(rewardType(engine.card('shatter')), 'additional-setup-or-encounter');
  const basic = engine.createGame(engine.seededRandom(1)).snapshot();
  const attacksOnly = { ...basic, deck: Array(10).fill('basicStrike') };
  assert(rewardScore(engine, 'shieldStrike', basic) > rewardScore(engine, 'shieldStrike', attacksOnly));
  assert(Number.isFinite(rewardScore(engine, 'chain', basic)));
});

test('planning is repeatable, bounded, and never mutates its input or RNG', () => {
  const game = engine.createGame(engine.seededRandom(33)); game.start();
  const before = plain(game.exportSave());
  const a = planTurn(engine, game, options), b = planTurn(engine, game, options);
  assert.deepEqual(a, b); assert(a.length <= options.maxCards);
  assert.deepEqual(plain(game.exportSave()), before);
  const copy = restored(engine, before);
  for (const index of a) assert(copy.play(index));
  checkedRoundTrip(engine, copy);
});

const trial = runTrial(engine, { ...options, seed: 1, origin: 'frost' });
test('full-run metrics count observed turns and actions, not HP deltas or lookahead nodes', () => {
  const { row } = trial;
  assert(['complete', 'defeat'].includes(row.terminal));
  assert.equal(row.totalTurns, row.battles.reduce((n, x) => n + x.turns, 0));
  assert.equal(row.totalCardPlays, row.battles.reduce((n, x) => n + x.cardPlays, 0));
  assert.equal(row.totalComboPlays, row.battles.reduce((n, x) => n + x.comboPlays, 0));
  assert.equal(row.firstRewardAtTurn, row.battles[0].turns);
  assert(row.saveAudit.checks > row.totalBattleActions);
  for (const battle of row.battles) {
    assert(battle.cardPlays <= battle.battleActions);
    assert(battle.battleActions <= battle.cardPlays + battle.turns);
    assert(battle.comboPlays <= battle.cardPlays);
    assert(battle.turnsWithCombo <= battle.turns);
    assert(battle.damageTaken >= 0);
  }
  const again = runTrial(engine, { ...options, seed: 1, origin: 'frost' });
  assert.deepEqual(again, trial);
  const summary = summarize([row]);
  assert.equal(summary.runs, 1);
  assert.equal(summary.battles[0].reached, 1);
  assert.equal(summary.meanTotalTurns, row.totalTurns);
});

test('a bounded unfinished battle is explicitly budget-exhausted, never a defeat or completion', () => {
  const { row } = runTrial(engine, { ...options, seed: 1, origin: 'frost', maxTurns: 1 });
  assert.equal(row.terminal, 'turn-budget-exhausted');
  assert.equal(row.totalTurns, 1);
  assert.equal(row.battles[0].result, 'turn-budget-exhausted');
  assert.equal(row.firstRewardAtTurn, null);
  assert.equal(summarize([row]).budgetOrUnhandled, 1);
});

test('five first-stop branches preserve source save and replay evolution/removal into battle 3', () => {
  assert(trial.campSave);
  const before = plain(trial.campSave);
  const observed = campBranches(engine, trial.campSave, options);
  assert.deepEqual(trial.campSave, before);
  assert.equal(observed.syntheticHp, false);
  assert.deepEqual(observed.branches.map(x => x.choice), ['rest', 'evolve:basicStrike', 'evolve:basicWard', 'remove:basicStrike', 'remove:basicWard']);
  for (const branch of observed.branches) {
    assert.equal(branch.battle, 3);
    assert.equal(branch.deckSize, before.state.deck.length - Number(branch.choice.startsWith('remove:')));
    assert(branch.saveAudit.phases.battle > 0);
    assert.equal(branch.startHp, branch.hpAfterChoice);
    assert(branch.win);
  }
  assert(observed.branches.find(x => x.choice === 'evolve:basicStrike').saveAudit.phases.evolve > 0);
  assert(observed.branches.find(x => x.choice === 'remove:basicStrike').saveAudit.phases.remove > 0);
  const low = campBranches(engine, trial.campSave, options, 20);
  assert.equal(low.syntheticHp, true);
  assert.equal(low.inputHp, 20);
  assert.equal(low.branches[0].hpAfterChoice, 34);
  assert(low.branches.slice(1).every(x => x.hpAfterChoice === 20));
  assert(low.branches[0].endHp > Math.max(...low.branches.slice(1).map(x => x.endHp)));
});

test('a killing turn does not pad click counts with worthless terminal wards', () => {
  const game = engine.createGame(engine.seededRandom(1)); game.start();
  const save = plain(game.exportSave()); save.state.enemyHp = 3;
  const copy = restored(engine, save);
  const plays = planTurn(engine, copy, options);
  assert.equal(plays.length, 1);
  assert.equal(copy.previewCard(plays[0]).base, 'basicStrike');
});

test('the classic-only relic phase round-trips without becoming a growth run', () => {
  const { campSave } = runTrial(engine, { ...options, ruleset: 'classic', seed: 1, origin: 'frost' });
  assert(campSave);
  const game = restored(engine, campSave);
  assert(game.chooseSanctuary('relic'));
  assert.equal(game.snapshot().phase, 'astrolabe');
  const copy = checkedRoundTrip(engine, game);
  assert(copy.chooseRelic('emberCore'));
  assert(copy.nextBattle());
  checkedRoundTrip(engine, copy);
  assert.equal(copy.exportSave().version, 3);
  assert.equal(copy.snapshot().ruleset, undefined);
  const growth = restored(engine, trial.campSave), before = plain(growth.exportSave());
  assert.equal(growth.chooseSanctuary('relic'), false);
  assert.deepEqual(plain(growth.exportSave()), before);
});
