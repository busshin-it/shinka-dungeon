import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function load(file, name) {
  const context = {};
  vm.runInNewContext(read('v4-1/' + file), context);
  return context[name];
}
const planning = load('planning-engine.js', 'ShinkaV43');
const legacy = load('engine.js', 'ShinkaV4');
const plain = value => JSON.parse(JSON.stringify(value));

// A deterministic, deliberately simple policy; this is a correctness smoke test,
// not an evaluation of difficulty or fun.
function action(game) {
  const state = game.snapshot();
  if (state.phase === 'battle') {
    const choices = state.hand.map((_, i) => ({i, card: game.previewCard(i)}))
      .filter(x => x.card.cost <= state.energy)
      .sort((a, b) => score(b.card) - score(a.card));
    return choices.length ? ['play', choices[0].i] : ['endTurn'];
  }
  return {intro:['start'], victory:['openReward'], reward:['chooseReward', null],
    route:['chooseRoute', 'moon'], ready:['nextBattle'], sanctuary:['chooseSanctuary', 'rest'],
    chapter:['chooseChapter', 'library'], camp:['chooseCamp', 'rest']}[state.phase];
}
const score = c => c.actualDamage + c.actualBlock * .6 + (c.actualDraw || 0) * 3;
function run(game, command) { return game[command[0]](...command.slice(1)); }

function reach(battle) {
  for (let seed = 1; seed <= 80; seed++) {
    const game = planning.createGame(planning.seededRandom(seed));
    game.selectOrigin('storm');
    for (let i = 0; i < 500; i++) {
      if (game.snapshot().phase === 'battle' && game.snapshot().battle === battle) return game.exportSave();
      const command = action(game);
      if (!command) break;
      run(game, command);
    }
  }
  throw Error('Synthetic policy did not reach battle ' + battle);
}
const bases = new Map();
function fixture(cards, changes = {}, battle = 1) {
  if (!bases.has(battle)) bases.set(battle, plain(reach(battle)));
  const save = plain(bases.get(battle)), state = save.state;
  Object.assign(state, {origin:'frost', turn:battle === 3 ? 2 : 1, energy:5, hp:state.maxHp,
    block:0, focus:0, reflect:0, weaken:0, turnDamage:0, spellCount:0, interrupted:false,
    flags:{forge:true}, enemyHp:state.enemyMaxHp}, changes);
  state.hand = [...cards];
  state.draw = Array(state.deck.length - cards.length).fill('guard');
  state.discard = []; state.exhaust = []; state.deck = [...state.hand, ...state.draw];
  const game = planning.createGame();
  assert.equal(game.restoreSave(save), true);
  return game;
}

// Both card pools and independent save formats are deliberate product contracts.
test('24-card legacy and 32-card planning modes stay separate', () => {
  assert.equal(Object.keys(legacy.CARDS).length, 24);
  assert.equal(Object.keys(planning.CARDS).length, 32);
  assert.equal(legacy.card('frostPierce'), null);
  for (const [engine, format, version] of [[legacy,'astral-corridor',1],[planning,'astral-planning',3]]) {
    const game = engine.createGame(engine.seededRandom(5)); game.start();
    assert.equal(game.exportSave().format, format);
    assert.equal(game.exportSave().version, version);
  }
});

test('synthetic v4.8 saves restore exactly, including existing rewards and RNG', () => {
  const data = JSON.parse(read('tests/fixtures/astral-v48-synthetic.json'));
  assert.equal(data.fixtures.length, 4);
  for (const {save} of data.fixtures) {
    const game = planning.createGame();
    assert.equal(game.restoreSave(save), true);
    assert.deepEqual(plain(game.exportSave()), save);
    if (save.state.phase === 'reward') {
      assert.equal(game.openReward(), false);
      assert.deepEqual(plain(game.exportSave()), save);
    }
  }
});

test('save/restore preserves deterministic next actions in both engines', () => {
  for (const engine of [legacy, planning]) for (let seed = 1; seed <= 12; seed++) {
    const game = engine.createGame(engine.seededRandom(seed));
    game.selectOrigin(['frost','storm','mirror'][seed % 3]);
    for (let i = 0; i < 400; i++) {
      const copy = engine.createGame();
      assert.equal(copy.restoreSave(plain(game.exportSave())), true);
      assert.deepEqual(plain(copy.exportSave()), plain(game.exportSave()));
      const command = action(game); if (!command) break;
      assert.equal(run(game, command), run(copy, command));
      assert.deepEqual(plain(copy.exportSave()), plain(game.exportSave()));
    }
  }
});

test('Frost Pierce threshold, upgrade, preserved weakness and failed payment', () => {
  for (const id of ['frostPierce','frostPierce+']) for (const weaken of [0,2,3,4]) {
    const game = fixture([id], {weaken});
    const expected = (id.endsWith('+') ? 13 : 10) + (weaken >= 3 ? 7 : 0);
    assert.equal(game.previewCard(0).actualDamage, expected);
    const hp = game.snapshot().enemyHp;
    assert.equal(game.play(0), true);
    assert.equal(game.snapshot().enemyHp, hp - expected);
    assert.equal(game.snapshot().weaken, weaken);
  }
  for (const id of ['frostPierce','chantWard']) {
    const game = fixture([id], {energy:0}), before = plain(game.exportSave());
    assert.equal(game.play(0), false); assert.deepEqual(plain(game.exportSave()), before);
  }
});

test('Chant Ward checks interruption before use, draws once, and supports upgrades', () => {
  for (const id of ['chantWard','chantWard+']) {
    const early = fixture([id,'iceSpear'], {}, 3);
    assert.equal(early.previewCard(0).actualDraw, 0);
    assert.equal(early.play(0), true); assert.equal(early.play(0), true);
    assert.equal(early.snapshot().interrupted, true);
    assert.equal(early.snapshot().block, id.endsWith('+') ? 7 : 4);
    const late = fixture(['iceSpear',id], {}, 3);
    late.play(0); assert.equal(late.snapshot().interrupted, true);
    assert.equal(late.previewCard(0).actualDraw, 1);
    assert.equal(late.previewCard(0).actualBlock, id.endsWith('+') ? 13 : 10);
    const handCount = late.snapshot().hand.length;
    late.play(0);
    assert.equal(late.snapshot().hand.length, handCount);
    assert.equal(late.snapshot().block, id.endsWith('+') ? 13 : 10);
  }
});

test('new reward eligibility and existing-offer stability', () => {
  let sawFrost = false, sawWard = false;
  for (const battle of [1,2]) for (let seed = 1; seed <= 128; seed++) {
    const game = fixture(['frostPierce'], {weaken:3,enemyHp:1}, battle);
    const save = plain(game.exportSave()); save.rngState = seed;
    assert.equal(game.restoreSave(save), true); game.play(0); game.openReward();
    const offers = plain(game.rewardOptions());
    assert.equal(offers.length, 4); assert.equal(new Set(offers).size, 4);
    if (battle === 1) assert.equal(offers.includes('chantWard'), false);
    sawFrost ||= offers.includes('frostPierce'); sawWard ||= offers.includes('chantWard');
    const copy = planning.createGame(); assert.equal(copy.restoreSave(plain(game.exportSave())), true);
    assert.deepEqual(plain(copy.rewardOptions()), offers);
  }
  assert.equal(sawFrost, true); assert.equal(sawWard, true);
});
