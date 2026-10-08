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
const currentPlanning = load('planning-engine.js', 'ShinkaV43');
// Classic runs cover unchanged v3 mechanics; growth tests cover the fresh v4 default.
const planning = {...currentPlanning, createGame: random => currentPlanning.createGame(random,{ruleset:'classic'})};
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
test('24-card legacy and 55-card planning modes stay separate', () => {
  assert.equal(Object.keys(legacy.CARDS).length, 24);
  assert.equal(Object.keys(planning.CARDS).length, 63);
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

function causewayFixture(cards, changes = {}) {
  const save = plain(fixture(cards, {}, 4).exportSave());
  Object.assign(save.state, {route2:'causeway', insight:false, chapter2Encounter:'tideStarSentinel',
    enemyId:'tideStarSentinel', enemyHp:72, enemyMaxHp:72}, changes);
  const game = planning.createGame(); assert.equal(game.restoreSave(save), true); return game;
}
function chapterFixture(hp = 40) {
  const game = fixture(['frostPierce'], {enemyHp:1}, 3);
  game.play(0); game.openReward(); game.chooseReward(null);
  const save = plain(game.exportSave()); save.state.hp = hp;
  const copy = planning.createGame(); assert.equal(copy.restoreSave(save), true); return copy;
}

test('causeway payment is atomic, survives restore, and preserves old chapter choices', () => {
  for (const hp of [0,1,4,5,40,60]) {
    if (hp === 0) continue; // Victory states cannot have zero HP.
    const game = chapterFixture(hp), before = plain(game.exportSave());
    assert.equal(game.chooseChapter('causeway'), hp > 4);
    if (hp <= 4) { assert.deepEqual(plain(game.exportSave()), before); continue; }
    assert.equal(game.snapshot().hp, hp - 4);
    const copy = planning.createGame(); assert.equal(copy.restoreSave(plain(game.exportSave())), true);
    assert.equal(copy.chooseChapter('causeway'), false);
    assert.equal(copy.snapshot().hp, hp - 4);
    assert.equal(copy.nextBattle(), true);
    assert.equal(copy.snapshot().enemyId, 'tideStarSentinel');
    assert.equal(copy.snapshot().energy, 3);
    assert.equal(copy.snapshot().maxEnergy, 5);
    assert.equal(copy.snapshot().hand.length, 5);
    assert.equal(copy.chooseChapter('causeway'), false);
  }
  for (const route of ['library','wind']) {
    const game = chapterFixture(); assert.equal(game.chooseChapter(route), true);
    const before = plain(game.exportSave()), copy = planning.createGame();
    assert.equal(copy.restoreSave(before), true); assert.deepEqual(plain(copy.exportSave()), before);
    copy.nextBattle(); assert.equal(copy.snapshot().energy, 2);
    assert.equal(copy.snapshot().enemyId, route === 'library' ? 'starDial' : 'bellSpirit');
  }
});

test('causeway applies starting mana on battles 4–6 only, without rewriting current mana', () => {
  const game = causewayFixture(['frostPierce'], {energy:1,enemyHp:1});
  const copy = planning.createGame(); copy.restoreSave(plain(game.exportSave()));
  assert.equal(copy.snapshot().energy, 1);
  for (let battle = 4; battle <= 6; battle++) {
    assert.equal(game.snapshot().battle, battle);
    if (battle > 4) assert.equal(game.snapshot().energy, 3);
    const save = plain(game.exportSave());
    Object.assign(save.state, {enemyHp:1,energy:5});
    save.state.hand = ['frostPierce']; save.state.draw = Array(9).fill('guard');
    save.state.discard = []; save.state.exhaust = []; save.state.deck = [...save.state.hand,...save.state.draw];
    assert.equal(game.restoreSave(save), true); game.play(0); game.openReward();
    if (battle === 6) { assert.equal(game.snapshot().phase, 'complete'); break; }
    game.chooseReward(null);
    if (battle === 4) game.chooseSanctuary('rest'); else game.chooseCamp('rest');
    game.nextBattle();
  }
});

test('Tide Star Sentinel checks final mana, weakness, block and reflection on all phases', () => {
  for (const turn of [1,2,3]) for (const energy of [0,1,2,3,5]) {
    const game = causewayFixture(['guard'], {turn,energy,weaken:3,block:2,reflect:4});
    const intent = game.intent(), expected = turn === 1 ? 0 : Math.max(0,(turn === 2 ? (energy >= 2 ? 6 : 14) : (energy === 0 ? 8 : 16)) - 3 - 2);
    assert.equal(intent.hpLoss, expected);
    assert.equal(game.snapshot().interrupted, false);
    const before = game.snapshot(); game.endTurn(); const after = game.snapshot();
    assert.equal(before.hp - after.hp, expected);
    assert.equal(before.enemyHp - after.enemyHp, turn === 1 ? 0 : 4);
    assert.equal(after.weaken, turn === 1 ? 3 : 0);
    assert.equal(after.energy, Math.min(5,energy+1));
  }
  const game = causewayFixture(['guard','charge','chantWard'], {turn:2,energy:2});
  assert.equal(game.intent().damage,6); game.play(0); assert.equal(game.intent().damage,14);
  game.play(0); assert.equal(game.intent().damage,6);
  assert.equal(game.snapshot().interrupted,false); assert.equal(game.previewCard(0).actualDraw,0);
  assert.equal(game.previewCard(0).actualBlock,4);
  assert.match(game.intent().detail,/魔力2以上で14→6/);
  assert.match(game.futureIntents()[0].detail,/魔力0で16→8/);
  assert.match(planning.enemyPattern('tideStarSentinel'),/魔力2以上で14→6/);
});

test('mana cards use payment-time thresholds, fixed effects, max weakness and unchanged frost relic', () => {
  for (const upgraded of [false,true]) for (const energy of [0,1,2,3,5]) {
    const ward = 'starFerryWard' + (upgraded?'+':''), arrow = 'ebbArrow' + (upgraded?'+':'');
    for (const id of [ward,arrow]) {
      const game = causewayFixture([id,'charge'], {energy,turn:3}), before = plain(game.exportSave());
      const preview = game.previewCard(0);
      assert.equal(preview.actualBlock, id === ward ? (upgraded?7:4)+(energy>=3?6:0) : 0);
      assert.equal(preview.actualWeak, id === arrow && energy===1 ? (upgraded?4:3) : 0);
      assert.equal(preview.actualDamage,id === arrow ? (upgraded?8:5) : 0);
      assert.equal(game.play(0),energy>=1);
      if (!energy) { assert.deepEqual(plain(game.exportSave()),before); continue; }
      const effect = game.snapshot(); game.play(0);
      assert.equal(game.snapshot().block,effect.block); assert.equal(game.snapshot().weaken,effect.weaken);
      assert.equal(game.snapshot().flags.frost,undefined);
    }
  }
  const game = causewayFixture(['ebbArrow','frostPierce'],{energy:3,weaken:4});
  game.play(0); assert.equal(game.snapshot().weaken,4); assert.equal(game.previewCard(0).actualDamage,17);
  const endEmpty = causewayFixture(['ebbArrow','charge'],{energy:1,turn:3});
  endEmpty.play(0); assert.equal(endEmpty.intent().damage,5);
  endEmpty.play(0); assert.equal(endEmpty.intent().damage,13); // Weakness remains; mana condition changes.
});

test('new cards unlock after battle two, do not alter opening decks or existing offers', () => {
  const seen = new Set();
  for (const origin of Object.values(planning.ORIGINS)) {
    assert.equal(origin.deck.some(id=>['starFerryWard','ebbArrow'].includes(id)),false);
  }
  for (const battle of [1,2]) for (let seed=1;seed<=128;seed++) {
    const game=fixture(['frostPierce'],{enemyHp:1},battle),save=plain(game.exportSave());save.rngState=seed;
    game.restoreSave(save);game.play(0);game.openReward();
    for(const id of game.rewardOptions())if(['starFerryWard','ebbArrow'].includes(id)){
      assert.equal(battle,2);seen.add(id);
    }
    const before=plain(game.exportSave()),copy=planning.createGame();assert.equal(copy.restoreSave(before),true);
    assert.deepEqual(plain(copy.exportSave()),before);
    assert.equal(copy.openReward(),false);assert.deepEqual(plain(copy.rewardOptions()),before.state.rewardOffers);
  }
  assert.deepEqual([...seen].sort(),['ebbArrow','starFerryWard']);
});

test('version-2 migrations preserve chosen old encounters and in-battle energy', () => {
  const context = {};
  vm.runInNewContext(read('v4-1/planning-v1-engine.js'),context);
  vm.runInNewContext(read('v4-1/planning-v2-engine.js'),context);
  vm.runInNewContext(read('v4-1/planning-engine.js'),context);
  for (const route of ['library','wind']) {
    let oldSave;
    for (let seed=1;seed<=80 && !oldSave;seed++) {
      const game=context.ShinkaPlanningV2.createGame(context.ShinkaPlanningV2.seededRandom(seed));game.selectOrigin('storm');
      for(let i=0;i<500;i++){
        const s=game.snapshot();
        if(s.battle===4&&s.phase==='battle'){oldSave=plain(game.exportSave());break;}
        const command=s.phase==='chapter'?['chooseChapter',route]:action(game);if(!command)break;run(game,command);
      }
    }
    assert.ok(oldSave);oldSave.state.energy=1;
    const restored=context.ShinkaV43.createGame();assert.equal(restored.restoreSave(oldSave),true);
    assert.equal(restored.snapshot().energy,1);
    assert.equal(restored.snapshot().enemyId,route==='library'?'archive':'wind');
    assert.deepEqual(plain(restored.snapshot().chapter2Options),{library:'archive',wind:'wind'});
    assert.equal(restored.chooseChapter('causeway'),false);
    const save=plain(restored.exportSave()),copy=context.ShinkaV43.createGame();
    assert.equal(copy.restoreSave(save),true);assert.deepEqual(plain(copy.exportSave()),save);
  }
});

test('causeway roundtrips every reachable phase and rejects inconsistent encounter saves', () => {
  for (let seed=1;seed<=12;seed++) {
    const game=planning.createGame(planning.seededRandom(seed));game.selectOrigin(['frost','storm','mirror'][seed%3]);
    for(let i=0;i<500;i++){
      const save=plain(game.exportSave()),copy=planning.createGame();
      assert.equal(copy.restoreSave(save),true);assert.deepEqual(plain(copy.exportSave()),save);
      const s=game.snapshot(),command=s.phase==='chapter'?['chooseChapter',s.hp>4?'causeway':'wind']:s.phase==='reward'?['chooseReward',game.rewardOptions().find(id=>['starFerryWard','ebbArrow'].includes(id))||null]:action(game);
      if(!command)break;assert.equal(run(game,command),run(copy,command));assert.deepEqual(plain(copy.exportSave()),plain(game.exportSave()));
    }
  }
  const game=causewayFixture(['guard']),before=plain(game.exportSave());
  for(const change of [{chapter2Encounter:'bowWatcher'},{interrupted:true},{insight:true},{route2:'library'}]){
    const bad=plain(before);Object.assign(bad.state,change);assert.equal(game.restoreSave(bad),false);assert.deepEqual(plain(game.exportSave()),before);
  }
});
