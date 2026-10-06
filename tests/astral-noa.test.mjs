import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Independent, synthetic boundary states only. No user save data is read or changed.
// All fixtures go through the public version-3 restore validator, unmodified.
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = {};
for (const file of ['planning-v1-engine.js','planning-v2-engine.js','planning-engine.js'])
  vm.runInNewContext(read('v4-1/' + file), context);
const engine = context.ShinkaV43;
const plain = value => JSON.parse(JSON.stringify(value));
const NEW = ['starRelay', 'quietComet', 'mirrorLance', 'starBookmark'];
const ALL = NEW.flatMap(id => [id, id + '+']);
const baseCache = new Map();
const sorted = values => [...values].sort();
const zones = state => [...state.hand, ...state.draw, ...state.discard, ...state.exhaust];

function restore(save) {
  const game = engine.createGame();
  assert.equal(game.restoreSave(plain(save)), true, 'synthetic save must pass the real validator');
  assert.deepEqual(plain(game.exportSave()), plain(save), 'restoring must be lossless');
  return game;
}
function roundtrip(game) {
  const save = plain(game.exportSave());
  assert.equal(save.version, 3);
  assert.equal(save.format, 'astral-planning');
  if (['battle','victory','defeat','complete'].includes(save.state.phase))
    assert.deepEqual(sorted(zones(save.state)), sorted(save.state.deck));
  return restore(save);
}
function step(game, method, ...args) {
  const copy = roundtrip(game);
  assert.equal(game[method](...args), true, method + ' succeeds');
  assert.equal(copy[method](...args), true, method + ' succeeds after restore');
  assert.deepEqual(plain(game.exportSave()), plain(copy.exportSave()), method + ' must remain deterministic');
  roundtrip(game);
  return game.snapshot();
}
function makeWin(game) {
  const save = plain(game.exportSave()), s = save.state;
  Object.assign(s, { hp:s.maxHp, enemyHp:1, energy:5, block:0, focus:0, reflect:0, weaken:0,
    pendingBlock:0, pendingFocus:0, turnDamage:0, spellCount:0, turnLastAttack:0,
    prevLastAttack:0, prevEndEmpty:false, usedExhaustThisTurn:false, interrupted:false, flags:{} });
  const i = s.deck.indexOf('spark');
  assert.notEqual(i, -1, 'progression fixture retains its winning attack');
  s.hand = ['spark']; s.draw = [...s.deck]; s.draw.splice(i, 1); s.discard = []; s.exhaust = [];
  assert.equal(game.restoreSave(save), true);
  assert.equal(game.play(0), true);
  assert.equal(game.snapshot().phase, 'victory');
}
function battleBase(battle, route = 'moon', route2 = 'library') {
  const key = `${battle}/${route}/${route2}`;
  if (baseCache.has(key)) return plain(baseCache.get(key));
  const game = engine.createGame(engine.seededRandom(4917));
  game.start();
  // Reach each phase with real public transitions. Only combat resources/zones are synthetic.
  for (let b = 1; b < battle; b++) {
    makeWin(game); game.openReward(); game.chooseReward(null);
    if (b === 1) game.chooseRoute(route);
    else if (b === 3) game.chooseChapter(route2);
    else if (b === 5) game.chooseCamp('rest');
    else game.chooseSanctuary('rest');
    assert.equal(game.nextBattle(), true);
  }
  const save = plain(game.exportSave());
  baseCache.set(key, save);
  return plain(save);
}
function fixture(hand, changes = {}, options = {}) {
  const { battle = 1, route = 'moon', route2 = 'library', discard = [], exhaust = [] } = options;
  const save = battleBase(battle, route, route2), s = save.state;
  Object.assign(s, { origin:'frost', turn:1, hp:s.maxHp, enemyHp:s.enemyMaxHp, energy:5,
    block:0, focus:0, reflect:0, weaken:0, pendingBlock:0, pendingFocus:0,
    prevEndEmpty:false, prevLastAttack:0, turnLastAttack:0, usedExhaustThisTurn:false,
    turnDamage:0, spellCount:0, interrupted:false, flags:{} }, changes);
  s.hand = [...hand]; s.discard = [...discard]; s.exhaust = [...exhaust];
  if (Object.hasOwn(options, 'draw')) {
    s.draw = [...options.draw];
    // Padding in the exhaust zone preserves explicitly empty draw/discard piles.
    // Meditate is a real exhaust card; this does not change validation rules.
    while (zones(s).length < 10) s.exhaust.push('meditate');
  } else s.draw = Array(10 - s.hand.length - s.discard.length - s.exhaust.length).fill('guard');
  s.deck = zones(s);
  assert.equal(s.deck.length, 10);
  return restore(save);
}
function rng(game) { return game.exportSave().rngState; }

// Definition, compatibility, and atomicity contracts.
test('Noa adds exactly four base IDs with the specified upgrades and no starter changes', () => {
  assert.equal(Object.keys(engine.CARDS).length, 38);
  const expected = {
    starRelay:{ cost:0, transferBlockCap:10 }, quietComet:{ cost:2, damage:10, recoverBonus:10 },
    mirrorLance:{ cost:1, damage:4, reflectDamageMultiplier:2, reflectDamageCap:10, consumeReflect:true },
    starBookmark:{ cost:0, block:2, recycleAttack:true, exhaust:true }
  };
  for (const id of NEW) {
    for (const [key, value] of Object.entries(expected[id])) assert.equal(engine.card(id)[key], value, `${id}.${key}`);
    assert.equal(engine.card(id).id, id); assert.equal(engine.card(id + '+').id, id + '+');
    assert.equal(engine.card(id + '+').base, id);
    assert.equal(engine.card(id).upgraded, false); assert.equal(engine.card(id + '+').upgraded, true);
    assert.equal(engine.card(id).draw || 0, 0); assert.equal(engine.card(id).energy || 0, 0);
  }
  assert.equal(engine.card('starRelay+').transferBlockCap, 14);
  assert.equal(engine.card('quietComet+').damage, 13);
  assert.equal(engine.card('mirrorLance+').damage, 7);
  assert.equal(engine.card('starBookmark+').block, 5);
  const starters = {
    frost:['ice','guard','focus','spark','shatter','fadingStar','starWait','charge','meditate','frostWard'],
    storm:['ice','guard','focus','spark','bolt','fadingStar','starWait','charge','meditate','chain'],
    mirror:['ice','guard','focus','spark','mirror','fadingStar','starWait','charge','meditate','shieldStrike']
  };
  for (const [origin, deck] of Object.entries(starters)) {
    assert.deepEqual(plain(engine.ORIGINS[origin].deck), deck);
    const game = engine.createGame(engine.seededRandom(17)); game.selectOrigin(origin); game.start();
    assert.deepEqual(plain(game.snapshot().deck), deck);
    assert.deepEqual(plain(game.snapshot().hand), deck.slice(0, 5));
  }
});

test('all new previews are pure and preserve state/RNG, including live condition/target values', () => {
  for (const id of ALL) {
    const game = fixture([id], {turn:2, energy:2, block:15, reflect:20, focus:4, origin:'mirror'},
      {discard:['ice','bolt+','guard']});
    const before = plain(game.exportSave());
    const first = plain(game.previewCard(0));
    assert.deepEqual(plain(game.previewCard(0)), first);
    assert.deepEqual(plain(game.exportSave()), before);
    assert.equal(first.actualDraw, 0); assert.equal(first.actualEnergy, 0);
    assert.deepEqual(plain(roundtrip(game).previewCard(0)), first);
  }
});

test('unaffordable Comet/Lance payments are completely atomic; zero-cost cards work at zero mana', () => {
  for (const id of ['quietComet','quietComet+','mirrorLance','mirrorLance+']) {
    for (let energy = 0; energy < engine.card(id).cost; energy++) {
      const game = fixture([id], {energy, block:15, reflect:20, focus:7, pendingBlock:5});
      const before = plain(game.exportSave());
      assert.equal(game.play(0), false);
      assert.deepEqual(plain(game.exportSave()), before);
      assert.equal(roundtrip(game).play(0), false);
    }
  }
  for (const id of ['starRelay','starRelay+','starBookmark','starBookmark+']) {
    const game = fixture([id], {energy:0, block:3}, {discard:['bolt']});
    const before = rng(game); step(game, 'play', 0);
    assert.equal(game.snapshot().energy, 0); assert.equal(rng(game), before);
  }
});

test('all new cards reject invalid indices and non-battle play without mutation', () => {
  for (const id of ALL) {
    const game = fixture([id, 'spark'], {enemyHp:1}), before = plain(game.exportSave());
    for (const bad of [-1, 2, 0.5, '0', null, NaN]) {
      assert.equal(game.play(bad), false); assert.deepEqual(plain(game.exportSave()), before);
    }
    step(game, 'play', 1);
    const after = plain(game.exportSave());
    assert.equal(game.play(0), false); assert.deepEqual(plain(game.exportSave()), after);
  }
});

// Current-block consumption and delayed-block scheduling.
test('Relay cap boundaries consume all block, stack with reservations, and never trigger the mirror charm', () => {
  for (const id of ['starRelay','starRelay+']) for (const block of [0,1,9,10,11,13,14,15,100]) {
    const game = fixture([id], {block, pendingBlock:5, origin:'mirror', reflect:3});
    const before = game.snapshot(), beforeRng = rng(game), cap = id.endsWith('+') ? 14 : 10, moved = Math.min(cap, block);
    const preview = game.previewCard(0);
    assert.equal(preview.actualBlock, 0); assert.equal(preview.actualReflect, 0);
    assert.equal(preview.actualConsumedBlock, block); assert.equal(preview.actualTransferredBlock, moved);
    assert.equal(preview.actualNextBlock, moved);
    const after = step(game, 'play', 0);
    assert.equal(after.block, 0); assert.equal(after.pendingBlock, 5 + moved);
    assert.equal(after.reflect, 3); assert.equal(after.flags.mirror, undefined);
    assert.equal(after.stats.relics, before.stats.relics);
    assert.equal(after.focus, before.focus); assert.equal(after.energy, before.energy);
    assert.equal(after.spellCount, 0); assert.equal(after.stats.played.starRelay, 1);
    assert.equal(rng(game), beforeRng);
  }
});

test('Relay repeated use cannot duplicate a reservation and coexists with Fading Star', () => {
  const game = fixture(['fadingStar','starRelay','starRelay+'], {energy:1, block:14});
  const initialRng = rng(game);
  assert.equal(game.previewCard(0).actualNextBlock, 5);
  step(game, 'play', 0); assert.equal(game.snapshot().pendingBlock, 5);
  step(game, 'play', 0); assert.equal(game.snapshot().pendingBlock, 15);
  assert.equal(game.previewCard(0).actualTransferredBlock, 0);
  assert.equal(game.previewCard(0).actualConsumedBlock, 0);
  step(game, 'play', 0); assert.equal(game.snapshot().pendingBlock, 15);
  assert.equal(game.snapshot().block, 0); assert.equal(rng(game), initialRng);
});

test('Relay leaves the current attack unblocked, grants next-turn block once, then expires', () => {
  const game = fixture(['starRelay'], {block:10, pendingBlock:5, energy:1});
  step(game, 'play', 0);
  assert.equal(game.intent().hpLoss, 6);
  const hp = game.snapshot().hp;
  step(game, 'endTurn');
  assert.equal(game.snapshot().hp, hp - 6);
  assert.equal(game.snapshot().block, 15); assert.equal(game.snapshot().pendingBlock, 0);
  assert.equal(game.snapshot().turn, 2);
  step(game, 'endTurn'); // Skeleton rests, so expiry cannot be mistaken for consumed block.
  assert.equal(game.snapshot().block, 0); assert.equal(game.snapshot().pendingBlock, 0);
  assert.equal(game.snapshot().turn, 3);
});

test('new card effects and pending resources reset on victory and defeat without invalid saves', () => {
  for (const id of ALL) {
    const game = fixture([id, 'spark'], {enemyHp:1, block:15, reflect:20, pendingBlock:5, pendingFocus:8});
    step(game, 'play', 0);
    if (game.snapshot().phase === 'battle') step(game, 'play', 0);
    const s = game.snapshot(); assert.equal(s.phase, 'victory'); assert.equal(s.enemyHp, 0);
    for (const key of ['pendingBlock','pendingFocus','turnLastAttack','prevLastAttack','turnDamage','spellCount']) assert.equal(s[key], 0, key);
    assert.equal(s.usedExhaustThisTurn, false); assert.equal(s.interrupted, false);
    const dead = plain(game.exportSave()), bad = plain(dead); bad.state.phase = 'battle';
    assert.equal(game.restoreSave(bad), false); assert.deepEqual(plain(game.exportSave()), dead);
  }
  const doomed = fixture(['starRelay'], {hp:1, block:15, pendingBlock:5, pendingFocus:8});
  step(doomed, 'play', 0); step(doomed, 'endTurn');
  assert.equal(doomed.snapshot().phase, 'defeat');
  assert.equal(doomed.snapshot().pendingBlock, 0); assert.equal(doomed.snapshot().pendingFocus, 0);
});

// Conditions are read from the raw move, not the damage prediction.
test('Comet recognizes recover moves with heal 0, 4, and 6, including undamaged enemies', () => {
  for (const id of ['quietComet','quietComet+']) {
    for (const [battle,turn,heal] of [[1,2,0],[5,3,4],[6,3,6]]) for (const injured of [false,true]) {
      const game = fixture([id], {turn}, {battle});
      if (injured) { const save = plain(game.exportSave()); save.state.enemyHp -= 9; assert.equal(game.restoreSave(save), true); }
      const before = game.snapshot(), damage = id.endsWith('+') ? 23 : 20;
      assert.equal(game.intent().type, 'recover'); assert.equal(game.intent().heal, injured ? heal : 0);
      assert.equal(game.previewCard(0).recoverCondition, true); assert.equal(game.previewCard(0).actualDamage, damage);
      step(game, 'play', 0);
      assert.equal(game.snapshot().enemyHp, before.enemyHp - damage);
      assert.equal(game.snapshot().turnDamage, damage); assert.equal(game.snapshot().spellCount, 1);
      assert.equal(game.snapshot().energy, before.energy - 2);
    }
  }
});

test('Comet never treats zero-damage attacks, blocked hits, or interrupted casts as recover', () => {
  for (const id of ['quietComet','quietComet+']) {
    for (const [battle,turn,hits] of [[1,1,1],[2,1,2],[5,1,3],[3,2,1]]) {
      for (const protection of [{},{block:100},{weaken:100},{block:100,weaken:100}]) {
        const extra = battle === 3 ? {interrupted:true,turnDamage:12,spellCount:1} : {};
        const game = fixture([id], {turn,...extra,...protection}, {battle});
        const intent = game.intent(), damage = id.endsWith('+') ? 13 : 10;
        assert.equal(intent.type, 'attack'); assert.equal(intent.hits, hits);
        if (protection.block || protection.weaken) assert.equal(intent.hpLoss, 0);
        if (protection.weaken) assert.equal(intent.perHit, 0);
        assert.equal(game.previewCard(0).recoverCondition, false);
        assert.equal(game.previewCard(0).actualDamage, damage);
        const before = game.snapshot(); step(game, 'play', 0);
        assert.equal(game.snapshot().enemyHp, before.enemyHp - damage);
      }
    }
  }
});

test('Comet stacks focus, storm charm, and forge once without changing its recover bonus', () => {
  for (const id of ['quietComet','quietComet+']) {
    const game = fixture([id,id], {origin:'storm',turn:3,focus:4}, {battle:3,route:'forge'});
    const base = id.endsWith('+') ? 13 : 10;
    assert.equal(game.previewCard(0).actualDamage, base + 10 + 4 + 3 + 2);
    const relics = game.snapshot().stats.relics;
    step(game, 'play', 0);
    assert.equal(game.snapshot().focus, 0);
    assert.equal(game.snapshot().flags.storm, true); assert.equal(game.snapshot().flags.forge, true);
    assert.equal(game.snapshot().stats.relics, relics + 1);
    assert.equal(game.previewCard(0).actualDamage, base + 10);
    step(game, 'play', 0); assert.equal(game.snapshot().stats.relics, relics + 1);
  }
});

test('attacking a recover turn does not pre-break the next turn or carry damage/count progress', () => {
  const game = fixture(['quietComet'], {turn:1}, {battle:4,draw:['quietComet','guard','guard','guard','guard','guard','guard','guard','guard']});
  step(game, 'play', 0);
  assert.equal(game.snapshot().turnDamage, 20); assert.equal(game.snapshot().spellCount, 1);
  step(game, 'endTurn');
  assert.equal(game.snapshot().turn, 2); assert.equal(game.snapshot().turnDamage, 0);
  assert.equal(game.snapshot().spellCount, 0); assert.equal(game.snapshot().interrupted, false);
  assert.equal(game.intent().breakKind, 'single'); assert.equal(game.intent().progress, 0);
  assert.equal(game.previewCard(0).recoverCondition, false); assert.equal(game.previewCard(0).actualDamage, 10);
  step(game, 'play', 0); assert.equal(game.snapshot().interrupted, false);
});

// Reflection conversion uses the ordinary hand-attack path.
test('Lance reflection thresholds cap added damage but consume all reflection and preserve block', () => {
  for (const id of ['mirrorLance','mirrorLance+']) for (const reflect of [0,1,4,5,6,20]) {
    const game = fixture([id], {reflect,block:13});
    const before = game.snapshot(), bonus = Math.min(10, 2 * reflect), damage = (id.endsWith('+') ? 7 : 4) + bonus;
    const preview = game.previewCard(0);
    assert.equal(preview.actualReflectDamage, bonus); assert.equal(preview.actualConsumedReflect, reflect);
    assert.equal(preview.actualDamage, damage); assert.equal(preview.actualReflect, 0);
    const oldRng = rng(game); step(game, 'play', 0);
    const after = game.snapshot(); assert.equal(after.reflect, 0); assert.equal(after.block, 13);
    assert.equal(after.enemyHp, before.enemyHp - damage);
    assert.equal(after.stats.dealt, before.stats.dealt + damage);
    assert.equal(after.stats.reflected, before.stats.reflected);
    assert.equal(after.turnDamage, damage); assert.equal(after.turnLastAttack, damage); assert.equal(after.spellCount, 1);
    assert.equal(rng(game), oldRng);
    step(game, 'endTurn');
    assert.equal(game.snapshot().stats.reflected, before.stats.reflected);
    assert.equal(game.snapshot().enemyHp, before.enemyHp - damage);
  }
});

test('reflection gained after Lance is fresh and resolves only on subsequent enemy hits', () => {
  const game = fixture(['mirrorLance','mirror'], {reflect:5}, {battle:2});
  const before = game.snapshot(); step(game, 'play', 0); step(game, 'play', 0);
  assert.equal(game.snapshot().reflect, 3); assert.equal(game.snapshot().block, 5);
  assert.equal(game.snapshot().stats.reflected, before.stats.reflected);
  step(game, 'endTurn');
  assert.equal(game.snapshot().stats.reflected, before.stats.reflected + 6);
  assert.equal(game.snapshot().enemyHp, before.enemyHp - 14 - 6);
});

test('playing mirror before versus after Lance deliberately trades immediate and multi-hit damage', () => {
  const first = fixture(['mirrorLance','mirror'], {reflect:4}, {battle:2});
  const last = fixture(['mirror','mirrorLance'], {reflect:4}, {battle:2});
  for (const game of [first,last]) { step(game, 'play', 0); step(game, 'play', 0); assert.equal(game.snapshot().block, 5); }
  assert.equal(first.snapshot().reflect, 3); assert.equal(last.snapshot().reflect, 0);
  assert.equal(first.snapshot().turnDamage, 12); assert.equal(last.snapshot().turnDamage, 14);
  step(first, 'endTurn'); step(last, 'endTurn');
  assert.equal(first.snapshot().enemyHp, 58 - 18); assert.equal(last.snapshot().enemyHp, 58 - 14);
});

test('Lance focus/forge damage counts for single, total, and count interruption without reflection statistics', () => {
  const single = fixture(['mirrorLance'], {turn:2,reflect:3,focus:2}, {battle:4});
  assert.equal(single.previewCard(0).actualDamage, 12); step(single, 'play', 0);
  assert.equal(single.snapshot().interrupted, true); assert.equal(single.snapshot().focus, 0);
  const total = fixture(['mirrorLance'], {turn:2,reflect:3}, {battle:3,route:'forge'});
  assert.equal(total.previewCard(0).actualDamage, 12); step(total, 'play', 0);
  assert.equal(total.snapshot().interrupted, true); assert.equal(total.snapshot().flags.forge, true);
  const count = fixture(['mirrorLance'], {turn:1,reflect:0,turnDamage:3,spellCount:2}, {battle:4,route2:'wind'});
  assert.equal(count.intent().breakKind, 'count'); step(count, 'play', 0);
  assert.equal(count.snapshot().spellCount, 3); assert.equal(count.snapshot().interrupted, true);
  for (const game of [single,total,count]) {
    assert.equal(game.snapshot().stats.reflected, 0);
    assert.equal(game.snapshot().stats.interrupts, 1);
  }
});

test('lethal Comet/Lance damage is HP-capped in statistics and consumes resources before finish', () => {
  for (const id of ['quietComet','quietComet+','mirrorLance','mirrorLance+']) {
    const game = fixture([id], {enemyHp:1,turn:2,focus:4,reflect:20,pendingBlock:8});
    const before = game.snapshot(); step(game, 'play', 0); const after = game.snapshot();
    assert.equal(after.phase, 'victory'); assert.equal(after.enemyHp, 0);
    assert.equal(after.stats.dealt, before.stats.dealt + 1);
    assert.equal(after.stats.reflected, before.stats.reflected); assert.equal(after.focus, 0);
    if (id.startsWith('mirrorLance')) assert.equal(after.reflect, 0);
    assert.equal(after.pendingBlock, 0);
  }
});

// Physical card movement, exhaust, draw order, and multiset/RNG conservation.
test('Bookmark moves exactly the newest discard attack, preserving upgrades, duplicates, and all zones', () => {
  const cases = [
    {discard:[],exhaust:[],target:null},
    {discard:['guard','focus','starRelay'],exhaust:[],target:null},
    {discard:['bolt','guard','ice','focus'],exhaust:[],target:'ice'},
    {discard:['bolt','guard','bolt','focus'],exhaust:[],target:'bolt'},
    {discard:['ice','bolt+','guard'],exhaust:[],target:'bolt+'},
    {discard:['guard'],exhaust:['drain'],target:null},
    {discard:['bolt','guard'],exhaust:['drain+'],target:'bolt'},
    {discard:['quietComet+','guard','mirrorLance+','focus'],exhaust:[],target:'mirrorLance+'}
  ];
  for (const id of ['starBookmark','starBookmark+']) for (const entry of cases) {
    for (const draw of [[],['ice'],['ice','guard']]) {
      const game = fixture([id,'focus'], {energy:0,block:3,focus:4}, {...entry,draw});
      const before = game.snapshot(), beforeRng = rng(game), preview = game.previewCard(0);
      assert.equal(preview.recycleTargetId, entry.target);
      assert.equal(preview.recycleTargetName, entry.target ? engine.card(entry.target).name : '');
      assert.equal(preview.actualDraw, 0); assert.equal(preview.actualEnergy, 0);
      const expectedDiscard = [...before.discard];
      if (entry.target) expectedDiscard.splice(expectedDiscard.lastIndexOf(entry.target), 1);
      step(game, 'play', 0); const after = game.snapshot();
      assert.deepEqual(plain(after.hand), ['focus']);
      assert.deepEqual(plain(after.draw), entry.target ? [entry.target,...draw] : draw);
      assert.deepEqual(plain(after.discard), expectedDiscard);
      assert.deepEqual(plain(after.exhaust), [...before.exhaust,id]);
      assert.deepEqual(plain(after.deck), plain(before.deck));
      assert.deepEqual(sorted(zones(after)), sorted(before.deck));
      assert.equal(after.energy, 0); assert.equal(after.focus, 4); assert.equal(rng(game), beforeRng);
      assert.equal(after.block, 3 + (id.endsWith('+') ? 5 : 2));
      assert.equal(after.usedExhaustThisTurn, true); assert.equal(after.stats.played.starBookmark, 1);
      assert.equal(after.spellCount, 0);
    }
  }
});

test('Bookmark itself never shuffles, draws, or spends RNG even with an empty draw pile', () => {
  const game = fixture(['starBookmark'], {energy:0}, {discard:['ice','bolt','guard'],draw:[]});
  const beforeRng = rng(game); step(game, 'play', 0);
  assert.deepEqual(plain(game.snapshot().draw), ['bolt']);
  assert.deepEqual(plain(game.snapshot().discard), ['ice','guard']);
  assert.deepEqual(plain(game.snapshot().hand), []); assert.equal(rng(game), beforeRng);
});

test('existing immediate draws can retrieve the bookmarked attack, with no extra bookmark draw', () => {
  for (const drawCard of ['meditate','dark']) {
    const game = fixture(['starBookmark',drawCard], {}, {discard:['bolt+'],draw:['ice','guard','guard','guard','guard','guard','guard']});
    const initialRng = rng(game); step(game, 'play', 0);
    assert.deepEqual(plain(game.snapshot().hand), [drawCard]);
    assert.equal(game.snapshot().draw[0], 'bolt+');
    step(game, 'play', 0);
    assert.deepEqual(plain(game.snapshot().hand), drawCard === 'meditate' ? ['bolt+','ice'] : ['bolt+']);
    assert.equal(rng(game), initialRng);
  }
});

test('ordinary next-turn draw puts the bookmarked attack first and preserves save continuation', () => {
  const game = fixture(['starBookmark'], {}, {discard:['ice','bolt+','guard']});
  step(game, 'play', 0); assert.equal(game.snapshot().hand.length, 0);
  const after = step(game, 'endTurn');
  assert.equal(after.hand[0], 'bolt+'); assert.equal(after.hand.length, 5);
  assert.equal(after.exhaust.filter(id => id === 'starBookmark').length, 1);
  assert.equal(after.usedExhaustThisTurn, false);
});

test('Bookmark can select an unplayed attack discarded at turn end rather than last played attack', () => {
  const game = fixture(['quietComet','bolt','guard'], {energy:0},
    {draw:['starBookmark','focus','focus','focus','focus','guard','guard']});
  step(game, 'endTurn');
  assert.deepEqual(plain(game.snapshot().discard), ['quietComet','bolt','guard']);
  assert.equal(game.snapshot().hand[0], 'starBookmark');
  assert.equal(game.snapshot().stats.played.bolt, undefined);
  assert.equal(game.previewCard(0).recycleTargetId, 'bolt');
  step(game, 'play', 0); assert.equal(game.snapshot().draw[0], 'bolt');
  assert.deepEqual(plain(game.snapshot().discard), ['quietComet','guard']);
});

test('two Bookmarks move distinct cards, exhaust once each, and trigger mirror charm only once', () => {
  const game = fixture(['starBookmark','starBookmark+'], {origin:'mirror'}, {discard:['bolt','ice']});
  const before = game.snapshot();
  assert.equal(game.previewCard(0).actualReflect, 2); step(game, 'play', 0);
  assert.equal(game.previewCard(0).recycleTargetId, 'bolt'); assert.equal(game.previewCard(0).actualReflect, 0);
  step(game, 'play', 0);
  const after = game.snapshot();
  assert.deepEqual(plain(after.draw.slice(0,2)), ['bolt','ice']); assert.deepEqual(plain(after.discard), []);
  assert.deepEqual(plain(after.exhaust), ['starBookmark','starBookmark+']);
  assert.equal(after.block, 7); assert.equal(after.reflect, 2);
  assert.equal(after.stats.relics, before.stats.relics + 1); assert.equal(after.stats.played.starBookmark, 2);
});

test('Bookmark enables Ash Ward exhaust condition even when no attack is recycled', () => {
  const game = fixture(['starBookmark','ashWard'], {origin:'mirror'}, {discard:[]});
  assert.equal(game.previewCard(0).recycleTargetId, null);
  step(game, 'play', 0); const preview = game.previewCard(0);
  assert.equal(preview.exhaustCondition, true); assert.equal(preview.actualBlock, 8); assert.equal(preview.actualReflect, 2);
  step(game, 'play', 0); assert.equal(game.snapshot().block, 10); assert.equal(game.snapshot().reflect, 4);
});

// Offer generation, acquisition, upgrade/removal, and backward compatibility.
test('Noa eligibility is after battle 1/2 in general slots only; four offers remain distinct and fixed', () => {
  const originPool = {
    frost:['iceSpear','frostWard','shatter','winter','frostNova','frostPierce'],
    storm:['spark','charge','thunderCrash','surge','chain'],
    mirror:['reflectShield','shieldStrike','drain','echo','mirror']
  };
  const supports = ['light','stillness','renew','meditate','focus'];
  for (const origin of ['frost','storm','mirror']) for (const battle of [1,2]) {
    const seen = new Set();
    for (let seed = 1; seed <= 256; seed++) {
      const game = fixture(['spark'], {origin,enemyHp:1}, {battle});
      const save = plain(game.exportSave()); save.rngState = seed; assert.equal(game.restoreSave(save), true);
      game.play(0); game.openReward(); const offers = plain(game.rewardOptions());
      assert.equal(offers.length, 4); assert.equal(new Set(offers).size, 4);
      assert.ok(originPool[origin].includes(offers[0])); assert.ok(supports.includes(offers[1]));
      for (const id of offers.filter(id => NEW.includes(id))) {
        assert.ok(offers.indexOf(id) >= 2); if (battle === 1) assert.ok(['quietComet','starBookmark'].includes(id));
        seen.add(id);
      }
      const before = plain(game.exportSave()), copy = restore(before);
      assert.equal(copy.openReward(), false); assert.deepEqual(plain(copy.exportSave()), before);
    }
    assert.deepEqual(sorted(seen), sorted(battle === 1 ? ['quietComet','starBookmark'] : NEW), `${origin} battle ${battle}`);
  }
});

function offered(id) {
  for (let seed = 1; seed <= 1000; seed++) {
    const game = fixture(['spark'], {enemyHp:1}, {battle:2}), save = plain(game.exportSave());
    save.rngState = seed; assert.equal(game.restoreSave(save), true); game.play(0); game.openReward();
    if (game.rewardOptions().includes(id)) return game;
  }
  throw Error('No deterministic offer found for ' + id);
}
test('every new ID survives reward, upgraded opening, removal, and save/next-action transitions', () => {
  for (const id of NEW) {
    const game = offered(id);
    step(game, 'chooseReward', id); assert.equal(game.snapshot().deck.at(-1), id);
    const unupgraded = restore(game.exportSave());
    step(unupgraded, 'chooseSanctuary', 'rest'); step(unupgraded, 'nextBattle');
    assert.ok(unupgraded.snapshot().hand.includes(id), 'reward is guaranteed in the next opening');
    step(game, 'chooseSanctuary', 'evolve'); assert.ok(game.upgradeOptions().includes(id));
    step(game, 'evolve', id); assert.ok(game.snapshot().deck.includes(id + '+'));
    assert.equal(game.snapshot().pendingUpgrade, id + '+');
    step(game, 'nextBattle'); assert.ok(game.snapshot().hand.includes(id + '+'));
    assert.equal(game.snapshot().pendingUpgrade, null);
    makeWin(game); step(game, 'openReward'); step(game, 'chooseReward', null); step(game, 'chooseChapter', 'library');
    step(game, 'nextBattle'); makeWin(game); step(game, 'openReward'); step(game, 'chooseReward', null);
    step(game, 'chooseSanctuary', 'remove'); assert.ok(game.removeOptions().includes(id + '+'));
    step(game, 'removeCard', id + '+'); assert.equal(game.snapshot().deck.includes(id + '+'), false);
    assert.equal(game.snapshot().removed.at(-1), id + '+'); step(game, 'nextBattle');
    assert.equal(zones(game.snapshot()).includes(id + '+'), false);
  }
});

test('existing v3 saves round-trip byte-equivalent and new effects add no state schema fields', () => {
  const fixtures = JSON.parse(read('tests/fixtures/astral-v48-synthetic.json')).fixtures;
  for (const {save} of fixtures) assert.equal(JSON.stringify(restore(save).exportSave()), JSON.stringify(save));
  const schema = Object.keys(battleBase(1).state).sort();
  const game = fixture(ALL, {block:15,reflect:20,turn:2,energy:5});
  assert.deepEqual(Object.keys(game.snapshot()).sort(), schema);
  for (let i = 0; i < 4 && game.snapshot().phase === 'battle'; i++) {
    if (game.previewCard(0).cost > game.snapshot().energy) break;
    step(game, 'play', 0); assert.deepEqual(Object.keys(game.snapshot()).sort(), schema);
  }
});

test('new IDs do not weaken save validation for invalid resources, unknown IDs, zone loss or duplication', () => {
  const game = fixture(['starRelay','quietComet','mirrorLance','starBookmark'], {pendingBlock:10,reflect:5});
  const before = plain(game.exportSave());
  const corruptions = [
    s => { s.hand.push('starRelay'); }, s => { s.draw.pop(); },
    s => { s.hand[0] = 'starRelay++'; }, s => { s.reflect = -1; },
    s => { s.pendingBlock = 100001; }, s => { s.energy = -1; },
    s => { s.stats.played.unknownCard = 1; }
  ];
  for (const corrupt of corruptions) {
    const bad = plain(before); corrupt(bad.state);
    assert.equal(game.restoreSave(bad), false); assert.deepEqual(plain(game.exportSave()), before);
  }
});


test('version-1 and version-2 saves migrate unchanged in their original fields and accept new cards afterward', () => {
  for (const oldEngine of [context.ShinkaPlanningV1,context.ShinkaPlanningV2]) {
    for (const origin of ['frost','storm','mirror']) {
      const old = oldEngine.createGame(oldEngine.seededRandom(832)); old.selectOrigin(origin); old.start();
      old.play(2); // Use the starting Focus so preservation covers a played-card statistic and discard.
      const oldSave = plain(old.exportSave()), game = engine.createGame();
      assert.equal(game.restoreSave(oldSave), true);
      const migrated = plain(game.exportSave());
      assert.equal(migrated.version, 3); assert.equal(migrated.rngState, oldSave.rngState);
      for (const [key,value] of Object.entries(oldSave.state)) assert.deepEqual(migrated.state[key], value, key);
      roundtrip(game);
      // A later acquired new card uses the same existing v3 fields after migration.
      const s = migrated.state;
      s.hand = ['starRelay','quietComet','mirrorLance','starBookmark'];
      s.draw = Array(6).fill('guard'); s.discard = []; s.exhaust = []; s.deck = zones(s);
      s.block = 10; s.reflect = 5; s.energy = 5;
      assert.equal(game.restoreSave(migrated), true);
      step(game, 'play', 0); step(game, 'play', 0); step(game, 'play', 0); step(game, 'play', 0);
      assert.equal(game.snapshot().pendingBlock, 10); assert.equal(game.snapshot().reflect, origin === 'mirror' ? 2 : 0);
      assert.equal(game.snapshot().draw[0], 'mirrorLance');
      step(game, 'endTurn');
      assert.equal(game.snapshot().hand[0], 'mirrorLance');
    }
  }
});
