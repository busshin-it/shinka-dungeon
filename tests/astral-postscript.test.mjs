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
// Historical card/route regressions deliberately use the preserved v3 rules.
const engine = {...context.ShinkaV43, createGame: random => context.ShinkaV43.createGame(random,{ruleset:'classic'})};
const plain = value => JSON.parse(JSON.stringify(value));
const NEW = ['marginLight', 'quietScript', 'mirrorNote', 'returnPage'];
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


const baseline=JSON.parse(read('tests/fixtures/astral-v411-baseline.json'));
test('postscript adds only four supported definitions; existing 38 definitions and starters stay byte-equivalent',()=>{
 assert.equal(Object.keys(engine.CARDS).length,60);
 assert.equal(Object.keys(baseline.cards).length,38);
 for(const [id,c]of Object.entries(baseline.cards))assert.deepEqual(plain(engine.CARDS[id]),c,id);
 assert.deepEqual(plain(engine.ORIGINS),baseline.origins);
 const expected={marginLight:{cost:0,nextFocus:4,exhaust:true},quietScript:{cost:1,damage:4,recoverBonus:4,nextFocus:3},mirrorNote:{cost:1,damage:4,reflect:3},returnPage:{cost:1,block:4,recycleAttack:true}};
 for(const id of NEW){for(const [k,v]of Object.entries(expected[id]))assert.equal(engine.card(id)[k],v,id+'.'+k);assert.equal(engine.card(id).art,id);assert.equal(engine.card(id).draw||0,0);assert.equal(engine.card(id).energy||0,0);}
 for(const [id,expected]of Object.entries({marginLight:{nextFocus:6},quietScript:{damage:7,nextFocus:5,recoverBonus:4},mirrorNote:{damage:7,reflect:4},returnPage:{block:7}}))for(const[k,v]of Object.entries(expected))assert.equal(engine.card(id+'+')[k],v);
 assert.equal(engine.card('returnPage').exhaust,undefined);
});
test('all variants: pure previews, payment atomicity, exact save/next-action roundtrip, 0-cost at 0 energy',()=>{
 for(const id of ALL){
  const game=fixture([id],{energy:engine.card(id).cost});const before=plain(game.exportSave());const first=plain(game.previewCard(0));assert.deepEqual(plain(game.previewCard(0)),first);assert.deepEqual(plain(game.exportSave()),before);step(game,'play',0);
  if(engine.card(id).cost){const poor=fixture([id],{energy:0}),before=plain(poor.exportSave());assert.equal(poor.play(0),false);assert.deepEqual(plain(poor.exportSave()),before);}
 }
});
test('Light reservations stack without changing current focus and exhaust once per physical card',()=>{
 const game=fixture(['marginLight','marginLight+','ashWard'],{energy:1,focus:2,pendingFocus:3});step(game,'play',0);step(game,'play',0);
 const s=game.snapshot();assert.equal(s.focus,2);assert.equal(s.pendingFocus,13);assert.equal(s.energy,1);assert.deepEqual(plain(s.exhaust),['marginLight','marginLight+']);assert.equal(game.previewCard(0).exhaustCondition,true);step(game,'play',0);assert.equal(game.snapshot().block,8);
});
test('Quiet Script recover bonus uses raw action and both versions reserve independently of current focus/forge',()=>{
 for(const upgraded of [false,true])for(const turn of [1,3])for(const origin of ['frost','storm','mirror']){
  const id='quietScript'+(upgraded?'+':''),g=fixture([id],{turn,origin,focus:2,energy:1,pendingFocus:4,weaken:30},{battle:2,route:'forge'});const p=g.previewCard(0);const damage=(upgraded?7:4)+(turn===3?4:0)+2+2;
  assert.equal(p.actualDamage,damage);assert.equal(p.recoverCondition,turn===3);step(g,'play',0);assert.equal(g.snapshot().enemyHp,62-damage);assert.equal(g.snapshot().focus,0);assert.equal(g.snapshot().pendingFocus,4+(upgraded?5:3));assert.equal(g.snapshot().flags.storm,undefined);
 }
});
test('reservations apply next turn, affect only first attack, expire if unused, and clear at combat end',()=>{
 const g=fixture(['quietScript','marginLight'],{turn:2,energy:1},{draw:['spark','spark','guard','guard','guard','guard','guard','guard']});step(g,'play',0);step(g,'play',0);assert.equal(g.snapshot().pendingFocus,7);step(g,'endTurn');assert.equal(g.snapshot().focus,7);assert.equal(g.snapshot().pendingFocus,0);
 assert.equal(g.previewCard(0).actualDamage,9);step(g,'play',0);assert.equal(g.previewCard(0).actualDamage,2);step(g,'play',0);
 const unused=fixture(['marginLight'],{energy:0});step(unused,'play',0);step(unused,'endTurn');assert.equal(unused.snapshot().focus,4);step(unused,'endTurn');assert.equal(unused.snapshot().focus,0);
 for(const id of ['quietScript','quietScript+']){const win=fixture([id],{enemyHp:1,pendingFocus:4});step(win,'play',0);assert.equal(win.snapshot().phase,'victory');assert.equal(win.snapshot().pendingFocus,0);}
});
test('Mirror Note adds reflect, never consumes guard, and its guard family does not fire mirror charm',()=>{
 for(const id of ['mirrorNote','mirrorNote+']){const g=fixture([id],{origin:'mirror',block:5,reflect:2,focus:3,energy:1});const p=g.previewCard(0);assert.equal(p.actualReflect,id.endsWith('+')?4:3);step(g,'play',0);const s=g.snapshot();assert.equal(s.block,5);assert.equal(s.reflect,id.endsWith('+')?6:5);assert.equal(s.flags.mirror,undefined);assert.equal(s.spellCount,1);assert.equal(s.focus,0);}
});
test('Mirror Note counterattacks every hit and its reflection expires at turn end',()=>{
 const g=fixture(['mirrorNote'],{origin:'mirror',block:0},{battle:2});step(g,'play',0);const p=g.intent();assert.equal(p.hits,2);assert.equal(p.reflected,6);assert.equal(g.snapshot().enemyHp,54);step(g,'endTurn');const s=g.snapshot();assert.equal(s.enemyHp,48);assert.equal(s.reflect,0);assert.equal(s.stats.reflected,6);
});
test('Note/Lance order spends only reflection already created and hand attack still counts for interruption',()=>{
 const before=fixture(['mirrorNote','mirrorLance'],{energy:2});step(before,'play',0);assert.equal(before.previewCard(0).actualDamage,10);step(before,'play',0);assert.equal(before.snapshot().reflect,0);assert.equal(before.snapshot().spellCount,2);
 const after=fixture(['mirrorLance','mirrorNote'],{energy:2});step(after,'play',0);step(after,'play',0);assert.equal(after.snapshot().reflect,3);
 const breakGame=fixture(['mirrorNote'],{focus:6},{battle:2,route:'forge'});assert.equal(breakGame.previewCard(0).actualDamage,12);step(breakGame,'play',0);assert.equal(breakGame.snapshot().interrupted,true);
});
test('Return Page preserves exact upgraded/duplicate IDs, does not draw or consume RNG, and remains in discard',()=>{
 const g=fixture(['returnPage','returnPage+'],{energy:2},{discard:['bolt','bolt+','bolt+','guard']});const firstRng=rng(g),deck=sorted(g.snapshot().deck);step(g,'play',0);assert.equal(rng(g),firstRng);assert.deepEqual(plain(g.snapshot().hand),['returnPage+']);assert.equal(g.snapshot().draw[0],'bolt+');assert.equal(g.snapshot().discard.at(-1),'returnPage');step(g,'play',0);assert.equal(rng(g),firstRng);assert.deepEqual(plain(g.snapshot().draw.slice(0,2)),['bolt+','bolt+']);assert.deepEqual(plain(g.snapshot().discard),['bolt','guard','returnPage','returnPage+']);assert.equal(g.snapshot().energy,0);assert.equal(g.snapshot().block,11);assert.deepEqual(plain(g.snapshot().exhaust),[]);assert.deepEqual(sorted(zones(g.snapshot())),deck);
});
test('Return Page empty/support-only piles work, exhausted attacks stay excluded, and later draw takes the returned attack',()=>{
 for(const discard of [[],['guard','focus']]){const g=fixture(['returnPage'],{}, {discard,exhaust:['drain']});assert.equal(g.previewCard(0).recycleTargetId,null);step(g,'play',0);assert.equal(g.snapshot().block,4);assert.deepEqual(plain(g.snapshot().exhaust),['drain']);}
 const g=fixture(['returnPage','meditate'],{energy:1},{draw:[],discard:['bolt+','guard'],exhaust:['drain']});step(g,'play',0);assert.equal(g.snapshot().draw[0],'bolt+');step(g,'play',0);assert.equal(g.snapshot().hand[0],'bolt+');assert.equal(g.snapshot().exhaust.includes('returnPage'),false);assert.equal(g.snapshot().energy,0);
});
test('Return Page cannot create the exhaust condition; mirror bonus fires only once on its real block',()=>{
 const g=fixture(['returnPage','returnPage+','ashWard'],{origin:'mirror',energy:3});assert.equal(g.previewCard(0).actualReflect,2);step(g,'play',0);assert.equal(g.previewCard(0).actualReflect,0);step(g,'play',0);assert.equal(g.previewCard(0).exhaustCondition,false);assert.equal(g.snapshot().usedExhaustThisTurn,false);assert.equal(g.snapshot().reflect,2);
});
test('v4.11 saves restore losslessly, with fixed open offers and unchanged state keys',()=>{
 for(const saved of Object.values(baseline.saves)){const g=restore(saved);assert.deepEqual(plain(g.exportSave()),saved);if(saved.state.phase==='reward'){assert.equal(g.openReward(),false);assert.deepEqual(plain(g.rewardOptions()),saved.state.rewardOffers);}}
 const g=fixture(ALL);assert.deepEqual(Object.keys(g.snapshot()).sort(),Object.keys(baseline.saves.battle.state).sort());step(g,'play',0);assert.deepEqual(Object.keys(g.snapshot()).sort(),Object.keys(baseline.saves.battle.state).sort());
});
test('all first-battle offers and RNG remain identical to fixed v4.11 baseline for 192 seed/origin pairs',()=>{
 for(const expected of baseline.firstBattleRewards){const g=engine.createGame(engine.seededRandom(expected.seed));g.selectOrigin(expected.origin);g.start();const save=plain(g.exportSave()),s=save.state;s.enemyHp=1;s.energy=5;s.hand=['spark'];s.draw=Array(9).fill('guard');s.discard=[];s.exhaust=[];s.deck=[...s.hand,...s.draw];save.rngState=expected.seed;assert.equal(g.restoreSave(save),true);g.play(0);g.openReward();assert.deepEqual(plain(g.rewardOptions()),expected.offers);assert.equal(rng(g),expected.rngState);}
});

test('Postscript eligibility is after battle 2 in general slots only; four offers remain distinct and fixed', () => {
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
        assert.ok(offers.indexOf(id) >= 2); assert.ok(battle >= 2);
        seen.add(id);
      }
      const before = plain(game.exportSave()), copy = restore(before);
      assert.equal(copy.openReward(), false); assert.deepEqual(plain(copy.exportSave()), before);
    }
    assert.deepEqual(sorted(seen), sorted(battle === 1 ? [] : NEW), `${origin} battle ${battle}`);
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


test('synthetic UI fixtures restore through real validator and preserve isolated QA harness',()=>{
 const data=JSON.parse(read('ui-qa/postscript-fixtures.json'));
 for(const [key,value]of Object.entries(data)){const g=restore(value.engine);if(key==='reward')assert.deepEqual(plain(g.rewardOptions()),NEW);if(key.startsWith('battle'))assert.equal(g.snapshot().hand.filter(id=>NEW.includes(engine.card(id).base)).length,4);}
 const html=read('ui-qa/postscript.html');assert(html.includes('sandbox="allow-scripts"'));assert(!html.includes('allow-same-origin'));assert(html.includes("Object.defineProperty(window,'localStorage'"));assert(html.includes("script[src=\"./pwa.js\"]"));assert(html.includes("link.removeAttribute('href')"));
 for(const file of ['v4-1/planning.html','v4-1/planning-game.js','v4-1/game.js','v4-1/index.html']){assert(read(file).includes('60枚'));assert(!read(file).includes('38枚'));}
 const ui=read('v4-1/planning.html');for(const id of NEW)assert(ui.includes('data-card-art="'+id+'"'));
 assert(read('v4-1/planning.css').includes('.planning-mode .card-art[src$="mirror-lance.webp"]{object-position:right top}'));
});
