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
const NEW = ['starlitPin', 'shutterWard', 'orbitEcho', 'tuningNote'];
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


const baseline = JSON.parse(read('tests/fixtures/astral-v412-baseline.json'));
test('star dial adds four cards and one enemy; all 42 old definitions, 11 enemies and starters remain exact',()=>{
 assert.equal(Object.keys(engine.CARDS).length, 62); assert.equal(Object.keys(engine.ENEMIES).length,12);
 for(const [id,value]of Object.entries(baseline.cards))assert.deepEqual(plain(engine.CARDS[id]),value,id);
 for(const [id,value]of Object.entries(baseline.enemies))assert.deepEqual(plain(engine.ENEMIES[id]),value,id);
 assert.deepEqual(plain(engine.ORIGINS),baseline.origins); assert.equal(engine.RUN_LENGTH,6);
 for(const origin of Object.keys(engine.ORIGINS)){const g=engine.createGame(engine.seededRandom(4));g.selectOrigin(origin);g.start();assert.deepEqual(plain(g.snapshot().deck),baseline.origins[origin].deck);assert.deepEqual(plain(g.snapshot().hand),baseline.origins[origin].deck.slice(0,5));}
 const spec=JSON.parse(read('design/production/star-dial.json'));assert.deepEqual(plain(engine.ENEMIES.starDial),spec.encounter.definition);
});
test('new encounter/card states use the same exact save keys and preserve next action, RNG and zones',()=>{
 for(const id of ALL){const g=fixture([id],{energy:engine.card(id).cost},{battle:4});assert.deepEqual(Object.keys(g.snapshot()).sort(),Object.keys(baseline.saves.battle.state).sort());const before=plain(g.exportSave());g.previewCard(0);g.intent();g.futureIntents();assert.deepEqual(plain(g.exportSave()),before);step(g,'play',0);if(engine.card(id).cost){const poor=fixture([id],{energy:0},{battle:4}),saved=plain(poor.exportSave());assert.equal(poor.play(0),false);assert.deepEqual(plain(poor.exportSave()),saved);}}
});
test('all fixed v4.12 saves restore losslessly, keeping old options, routes, enemy, history and open offers',()=>{
 for(const [label,saved]of Object.entries(baseline.saves)){const g=restore(saved);assert.deepEqual(plain(g.exportSave()),saved,label);if(saved.state.phase==='reward'){assert.equal(g.openReward(),false);assert.deepEqual(plain(g.rewardOptions()),saved.state.rewardOffers);}if(saved.state.phase==='battle')step(g,'endTurn');}
 const old=restore(baseline.saves.chapter);step(old,'chooseChapter','library');step(old,'nextBattle');assert.equal(old.snapshot().enemyId,'bowWatcher');
 const current=fixture(['guard'],{}, {battle:4});assert.equal(current.snapshot().enemyId,'starDial');assert.equal(current.snapshot().hand.length,1);assert.equal(current.snapshot().insight,true);
});
test('v1/v2 before-route migrations retain their historical encounter choices',()=>{
 for(const E of [context.ShinkaPlanningV1,context.ShinkaPlanningV2].filter(Boolean)){const g=E.createGame(E.seededRandom(91)),copy=engine.createGame();assert.equal(copy.restoreSave(plain(g.exportSave())),true);assert.deepEqual(plain(copy.snapshot().chapter2Options),{library:'bowWatcher',wind:'bellSpirit'});}
});
test('route-pair and encounter validation rejects unsupported combinations atomically',()=>{
 const g=fixture(['guard'],{}, {battle:4}),before=plain(g.exportSave());
 for(const change of [{chapter2Options:{library:'starDial',wind:'wind'}},{chapter2Options:{library:'bowWatcher',wind:'bellSpirit'}},{chapter2Encounter:'bowWatcher'},{enemyId:'bowWatcher',enemyMaxHp:76,enemyHp:76}]){const bad=plain(before);Object.assign(bad.state,change);assert.equal(g.restoreSave(bad),false);assert.deepEqual(plain(g.exportSave()),before);}
 for(const pair of [{library:'starDial',wind:'bellSpirit'},{library:'bowWatcher',wind:'bellSpirit'}]){const old=plain(baseline.saves.intro);old.state.chapter2Options=pair;roundtrip(restore(old));}
});
test('count chant reduces every hit at 0/1/2/3/4 attacks; partial progress is not an interruption',()=>{
 for(const count of [0,1,2,3,4]){const g=fixture(Array(count).fill('spark'),{turn:2,energy:2},{battle:4});for(let i=0;i<count;i++)step(g,'play',0);const a=g.intent();assert.equal(a.breakKind,'count');assert.equal(a.progress,Math.min(3,count));assert.equal(a.perHit,4-Math.min(3,count));assert.equal(a.damage,(4-Math.min(3,count))*3);assert.equal(a.broken,count>=3);assert.equal(g.snapshot().stats.interrupts,count>=3?1:0);assert.match(a.detail,/各打撃/);const hp=g.snapshot().hp;step(g,'endTurn');assert.equal(g.snapshot().hp,hp-a.hpLoss);assert.equal(g.snapshot().spellCount,0);assert.equal(g.snapshot().interrupted,false);}
});
test('weakness, guard and reflect match intent for each hit; zero damage alone does not break chant',()=>{
 for(const count of [0,1,2,3])for(const weaken of [0,1,4])for(const block of [0,2,20]){const g=fixture(['guard'],{turn:2,spellCount:count,turnDamage:count*2,interrupted:count>=3,weaken,block,reflect:2},{battle:4});const before=g.snapshot(),a=g.intent();assert.equal(a.hpLoss,Math.max(0,Math.max(0,4-Math.min(3,count)-weaken)*3-block));assert.equal(a.broken,count>=3);assert.equal(a.reflected,6);step(g,'endTurn');assert.equal(g.snapshot().hp,before.hp-a.hpLoss);assert.equal(g.snapshot().enemyHp,before.enemyHp-a.reflected);assert.equal(g.snapshot().weaken,0);assert.equal(g.snapshot().reflect,0);}
 const g=fixture(['chantWard'],{turn:2,weaken:9},{battle:4});assert.equal(g.intent().damage,0);assert.equal(g.previewCard(0).breakCondition,false);assert.equal(g.previewCard(0).actualDraw,0);
});
test('reflection can end three hits early; simultaneous lethal remains defeat',()=>{
 const g=fixture(['guard'],{turn:2,enemyHp:5,reflect:3,block:0},{battle:4});const a=g.intent();assert.equal(a.resolvedHits,2);assert.equal(a.hpLoss,8);assert.equal(a.reflected,5);step(g,'endTurn');assert.equal(g.snapshot().phase,'victory');assert.equal(g.snapshot().stats.reflected,5);
 const both=fixture(['guard'],{turn:2,enemyHp:2,reflect:2,hp:4},{battle:4});step(both,'endTurn');assert.equal(both.snapshot().phase,'defeat');assert.equal(both.snapshot().wins,3);
});
test('single chant threshold 11/12/13 and cumulative small attacks do not substitute for one hit',()=>{
 for(const damage of [11,12,13]){const g=fixture(['spark'],{turn:3,focus:damage-2},{battle:4});step(g,'play',0);assert.equal(g.intent().breakKind,'single');assert.equal(g.intent().perHit,damage>=12?8:18);assert.equal(g.snapshot().interrupted,damage>=12);const a=g.intent(),hp=g.snapshot().hp;step(g,'endTurn');assert.equal(g.snapshot().hp,hp-a.hpLoss);}
 const g=fixture(['ice','ice','ice'],{turn:3,origin:'mirror',energy:3},{battle:4});for(let i=0;i<3;i++)step(g,'play',0);assert.equal(g.snapshot().turnDamage,18);assert.equal(g.snapshot().interrupted,false);assert.equal(g.intent().perHit,16);
});
test('chant threshold switch is fresh each turn and Chant Ward requires the completed count break',()=>{
 const g=fixture(['spark','spark','spark','chantWard'],{turn:2,energy:1},{battle:4,draw:['orbitEcho','spark','guard','guard','guard','guard']});step(g,'play',0);step(g,'play',0);assert.equal(g.previewCard(1).actualDraw,0);step(g,'play',0);assert.equal(g.previewCard(0).actualDraw,1);step(g,'play',0);assert.equal(g.snapshot().block,10);step(g,'endTurn');assert.equal(g.intent().breakKind,'single');assert.equal(g.intent().progress,0);assert.equal(g.snapshot().interrupted,false);
});
test('star dial forecasts include the complete reduced three-hit result and never mutate state',()=>{
 const g=fixture(['guard'],{}, {battle:4}),save=plain(g.exportSave()),future=plain(g.futureIntents());assert.equal(g.intent().type,'recover');assert.equal(future[0].breakKind,'count');assert.equal(future[1].breakKind,'single');assert.match(future[0].detail,/4×3〔攻撃札3枚で1×3〕/);assert.match(future[1].detail,/一撃12で8/);assert.match(engine.enemyPattern('starDial'),/1×3/);assert.deepEqual(plain(g.exportSave()),save);
 const source=read('v4-1/planning-game.js'),ctx={};vm.runInNewContext(source.match(/  const futurePower = [^\n]+/)[0]+';globalThis.display=futurePower;',ctx);assert.equal(ctx.display(future[0]),'4×3〔攻撃札3枚で1×3〕');assert.match(source,/baseReduced=`.*a.hits>1/);
});
test('Starlit Pin consumes focus, exhausts, triggers only eligible frost bonus, and weakens by maximum',()=>{
 for(const upgraded of [false,true])for(const origin of ['frost','storm','mirror'])for(const oldWeak of [0,4]){const id='starlitPin'+(upgraded?'+':''),g=fixture([id,'ashWard'],{turn:2,origin,energy:1,focus:4,weaken:oldWeak},{battle:4});assert.equal(g.previewCard(0).actualDamage,(upgraded?2:1)+4);const weak=(upgraded?2:1)+(origin==='frost'?1:0);step(g,'play',0);assert.equal(g.snapshot().focus,0);assert.equal(g.snapshot().weaken,Math.max(oldWeak,weak));assert.deepEqual(plain(g.snapshot().exhaust),[id]);assert.equal(g.previewCard(0).exhaustCondition,true);step(g,'play',0);assert.equal(g.snapshot().block,8);}
 const g=fixture(['starlitPin','starlitPin+'],{energy:0});step(g,'play',0);assert.equal(g.previewCard(0).actualWeak,2);step(g,'play',0);assert.equal(g.snapshot().spellCount,2);assert.equal(g.snapshot().stats.relics,1);
});
test('Pin used during rest preserves weakness for the next attack but has no carryover attack count',()=>{
 const g=fixture(['starlitPin'],{energy:0},{battle:4});step(g,'play',0);step(g,'endTurn');assert.equal(g.snapshot().weaken,2);assert.equal(g.snapshot().spellCount,0);assert.equal(g.intent().damage,6);step(g,'endTurn');assert.equal(g.snapshot().weaken,0);
});
test('Shutter Ward fixes reservation at payment time, stacks, applies next turn then expires',()=>{
 for(const upgraded of [false,true])for(const energy of [1,2,3]){const id='shutterWard'+(upgraded?'+':''),g=fixture([id,'charge'],{turn:1,energy,pendingBlock:4},{battle:4});step(g,'play',0);assert.equal(g.snapshot().block,upgraded?6:3);assert.equal(g.snapshot().pendingBlock,4+(energy===1?6:0));step(g,'play',0);assert.equal(g.snapshot().pendingBlock,4+(energy===1?6:0));step(g,'endTurn');assert.equal(g.snapshot().block,4+(energy===1?6:0));assert.equal(g.snapshot().pendingBlock,0);step(g,'endTurn');assert.equal(g.snapshot().block,0);}
 const g=fixture(['shutterWard','charge','shutterWard'],{energy:1},{battle:4});step(g,'play',0);step(g,'play',0);step(g,'play',0);assert.equal(g.snapshot().pendingBlock,12);
});
test('Shutter Ward can enable depletion combos without reserving when played too early',()=>{
 const g=fixture(['shutterWard','spark','shutterWard'],{energy:2},{battle:4});step(g,'play',0);assert.equal(g.snapshot().pendingBlock,0);assert.equal(g.previewCard(0).actualDamage,2);step(g,'play',1);assert.equal(g.snapshot().pendingBlock,6);assert.equal(g.previewCard(0).actualDamage,6);step(g,'play',0);
});
test('Orbit Echo memory clamps and rounds at 0/1/15/16/17; cost-two and forge bonuses stay normal',()=>{
 for(const id of ['orbitEcho','orbitEcho+'])for(const memory of [0,1,15,16,17,100])for(const origin of ['frost','storm']){const g=fixture([id],{turn:3,prevLastAttack:memory,origin,focus:2},{battle:4,route:'forge'});const expected=(id.endsWith('+')?12:9)+Math.min(8,Math.floor(memory/2))+2+2+(origin==='storm'?3:0);assert.equal(g.previewCard(0).actualDamage,expected);assert.equal(g.previewCard(0).actualMemory,Math.min(8,Math.floor(memory/2)));step(g,'play',0);assert.equal(g.snapshot().turnLastAttack,expected);assert.equal(g.snapshot().focus,0);assert.equal(g.snapshot().flags.forge,true);}
});
test('last small hand attack replaces Echo memory, while reflection never replaces it',()=>{
 for(const pinLast of [false,true]){const hand=pinLast?['bolt','starlitPin']:['starlitPin','bolt'];const g=fixture(hand,{turn:2,origin:'mirror',energy:2,reflect:3},{battle:4,draw:['orbitEcho','guard','guard','guard','guard','guard','guard','guard']});step(g,'play',0);step(g,'play',0);step(g,'endTurn');assert.equal(g.snapshot().prevLastAttack,pinLast?1:14);assert.equal(g.snapshot().stats.reflected,9);assert.equal(g.previewCard(0).actualMemory,pinLast?0:7);}
});
test('Tuning Note draws now, adds only pending focus, upgrades both effects and exhausts',()=>{
 for(const id of ['tuningNote','tuningNote+']){const up=id.endsWith('+'),g=fixture([id],{turn:1,energy:1,focus:3,pendingFocus:4},{battle:4,draw:['spark','bolt','guard','guard','guard','guard','guard','guard','guard']});step(g,'play',0);assert.equal(g.snapshot().focus,3);assert.equal(g.snapshot().pendingFocus,4+(up?8:6));assert.deepEqual(plain(g.snapshot().hand),up?['spark','bolt']:['spark']);assert.deepEqual(plain(g.snapshot().exhaust),[id]);step(g,'endTurn');assert.equal(g.snapshot().focus,4+(up?8:6));assert.equal(g.snapshot().pendingFocus,0);step(g,'endTurn');assert.equal(g.snapshot().focus,0);}
});
test('both reservations clear on combat end and empty draw still permits Tuning Note',()=>{
 const g=fixture(['tuningNote','shutterWard','spark'],{energy:2,enemyHp:1},{battle:4,draw:[]});step(g,'play',0);assert.equal(g.snapshot().hand.length,2);step(g,'play',0);assert.equal(g.snapshot().pendingFocus,6);assert.equal(g.snapshot().pendingBlock,6);step(g,'play',0);assert.equal(g.snapshot().phase,'victory');assert.equal(g.snapshot().pendingFocus,0);assert.equal(g.snapshot().pendingBlock,0);
});
test('all four unlock only after battle 2 in general slots with unique and persistent offers',()=>{
 const supports=['light','stillness','renew','meditate','focus'];
 for(const origin of ['frost','storm','mirror'])for(const battle of [1,2]){const seen=new Set();for(let seed=1;seed<=256;seed++){const g=fixture(['spark'],{origin,enemyHp:1},{battle}),save=plain(g.exportSave());save.rngState=seed;assert(g.restoreSave(save));g.play(0);g.openReward();const offers=plain(g.rewardOptions());assert.equal(new Set(offers).size,4);assert(supports.includes(offers[1]));for(const id of offers.filter(id=>NEW.includes(id))){assert(battle===2);assert(offers.indexOf(id)>=2);seen.add(id);}const saved=plain(g.exportSave()),copy=restore(saved);assert.equal(copy.openReward(),false);assert.deepEqual(plain(copy.exportSave()),saved);}assert.deepEqual(sorted(seen),sorted(battle===1?[]:NEW));}
});
test('all new cards survive reward, forced next opening, upgrade, removal and complete six-fight route',()=>{
 for(const id of NEW){let game;for(let seed=1;seed<=1000;seed++){const g=fixture(['spark'],{enemyHp:1},{battle:2}),save=plain(g.exportSave());save.rngState=seed;g.restoreSave(save);g.play(0);g.openReward();if(g.rewardOptions().includes(id)){game=g;break;}}assert(game);step(game,'chooseReward',id);const basic=restore(game.exportSave());step(basic,'chooseSanctuary','rest');step(basic,'nextBattle');assert(basic.snapshot().hand.includes(id));step(game,'chooseSanctuary','evolve');step(game,'evolve',id);step(game,'nextBattle');assert(game.snapshot().hand.includes(id+'+'));makeWin(game);step(game,'openReward');step(game,'chooseReward',null);step(game,'chooseChapter','library');step(game,'nextBattle');assert.equal(game.snapshot().enemyId,'starDial');makeWin(game);step(game,'openReward');step(game,'chooseReward',null);step(game,'chooseSanctuary','remove');step(game,'removeCard',id+'+');step(game,'nextBattle');assert(!zones(game.snapshot()).includes(id+'+'));makeWin(game);step(game,'openReward');step(game,'chooseReward',null);step(game,'chooseCamp','rest');step(game,'nextBattle');makeWin(game);step(game,'openReward');assert.equal(game.snapshot().phase,'complete');assert.equal(game.snapshot().wins,6);assert.equal(game.snapshot().history[3].enemy,'星儀の調律者');}
});
test('nine user-owned UI scenarios restore, retain safe isolated harness, and current entry labels are 55',()=>{
 const data=JSON.parse(read('ui-qa/star-dial-fixtures.json'));assert.equal(Object.keys(data).length,9);
 for(const value of Object.values(data))roundtrip(restore(value.engine));
 const html=read('ui-qa/star-dial.html');assert(html.includes('sandbox="allow-scripts"'));assert(!html.includes('allow-same-origin'));assert(html.includes("Object.defineProperty(window,'localStorage'"));assert(html.includes("script[src=\"./pwa.js\"]"));assert(html.includes("link.removeAttribute('href')"));
 for(const file of ['planning.html','planning-game.js','game.js','index.html']){assert(read('v4-1/'+file).includes('62枚'));assert(!read('v4-1/'+file).includes('42枚'));}
 const ui=read('v4-1/planning.html');for(const id of NEW)assert(ui.includes(`data-card-art="${id}"`));assert(ui.includes('保存中の冒険は以前の相手を維持'));
});
