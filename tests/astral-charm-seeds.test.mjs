import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadEngine,restored,fight} from '../tools/astral-growth-balance.mjs';
import {OPTIONS} from '../tools/astral-early-choice-check.mjs';
const E=loadEngine(),plain=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'),read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ids=[...Object.keys(E.ORIGINS),...Object.keys(E.TRIAL_ORIGINS)];
function roundtrip(g){const copy=restored(E,g.exportSave());assert.deepEqual(plain(copy.exportSave()),plain(g.exportSave()));return copy;}
function step(g,method,...args){const copy=roundtrip(g);assert(g[method](...args));assert(copy[method](...args));assert.deepEqual(plain(copy.exportSave()),plain(g.exportSave()));roundtrip(g);}
function base(){const g=E.createGame(E.seededRandom(7),{ruleset:E.EARLY_CHOICE_RULESET});g.start();return g;}
function fixture(origin,hand,changes={}){const save=plain(base().exportSave()),s=save.state;Object.assign(s,{origin,enemyHp:15,energy:5,flags:{},hand:[...hand],draw:Array(10-hand.length).fill('basicWard'),discard:[],exhaust:[],...changes});s.deck=[...s.hand,...s.draw,...s.discard,...s.exhaust];return restored(E,save);}

test('new intro offers three unique candidates from six without changing combat RNG or initial deck',()=>{
 const seen=new Set();for(const seed of [1,2,3,7,10,21]){const old=E.createGame(E.seededRandom(seed),{ruleset:E.EARLY_CHOICE_RULESET}),g=E.createGame(E.seededRandom(seed),{ruleset:E.EARLY_CHOICE_RULESET,charmTrial:true}),save=plain(g.exportSave()),offers=plain(g.originOptions());assert.equal(save.version,6);assert.deepEqual(Object.keys(save.state).sort(),Object.keys(old.snapshot()).sort());assert.equal(save.rngState,old.exportSave().rngState);assert.equal(offers.length,3);assert.equal(new Set(offers).size,3);assert(offers.every(id=>ids.includes(id)));assert.deepEqual(plain(g.snapshot().deck),plain(E.BASIC_STARTER));assert.deepEqual(plain(roundtrip(g).originOptions()),offers);seen.add(offers.join('|'));for(const id of offers){step(g,'selectOrigin',id);assert.equal(g.snapshot().origin,id);}const excluded=ids.find(id=>!offers.includes(id)),before=plain(g.exportSave());assert.equal(g.selectOrigin(excluded),false);assert.deepEqual(plain(g.exportSave()),before);step(g,'start');assert(!Object.hasOwn(g.snapshot().flags,'charmTrial'));assert.equal(g.selectOrigin(offers[0]),false);}
 assert(seen.size>1);assert.throws(()=>E.createGame(Math.random,{ruleset:E.EARLY_CHOICE_RULESET,charmTrial:true}));assert.throws(()=>E.createGame(E.seededRandom(1),{charmTrial:true}));
});

test('adjacent play numbers offer every charm and candidate lookup spends no combat RNG',()=>{
 const seen=new Set();
 for(let seed=1;seed<=32;seed++){
  const g=E.createGame(E.seededRandom(seed),{ruleset:E.EARLY_CHOICE_RULESET,charmTrial:true}),before=plain(g.exportSave());
  for(const id of g.originOptions())seen.add(id);
  assert.deepEqual(plain(g.originOptions()),plain(roundtrip(g).originOptions()));
  assert.deepEqual(plain(g.exportSave()),before);
 }
 assert.deepEqual([...seen].sort(),ids.sort());
});

test('Cadence boosts exactly the second hand attack; guards and reflect do not count',()=>{
 for(const suffix of ['','+']){const g=fixture('cadence',['basicStrike'+suffix,'basicWard','chain'+suffix,'basicStrike']);const save=plain(g.exportSave());g.previewCard(0);g.intent();assert.deepEqual(plain(g.exportSave()),save);step(g,'play',0);step(g,'play',0);assert.equal(g.previewCard(0).actualDamage,E.card('chain'+suffix).damage+5+3);step(g,'play',0);assert.equal(g.previewCard(0).actualDamage,3);assert.equal(g.snapshot().stats.relics,1);}
 const reflect=fixture('cadence',['mirrorNote','basicStrike'],{reflect:4});step(reflect,'play',0);assert.equal(reflect.previewCard(0).actualDamage,6); // reflection doesn't increment hand count
 const next=fixture('cadence',['basicStrike','basicStrike']);step(next,'play',0);step(next,'endTurn');assert.equal(next.snapshot().spellCount,0);assert.equal(next.snapshot().stats.relics,0);
});

test('Cadence and Riposte bonuses use the common preview/play/interrupt calculation',()=>{
 const save=plain(base().exportSave()),s=save.state; // reach a real chapter-1 route before the synthetic threshold scenario
 const start=restored(E,save);assert(fight(E,start,OPTIONS).win);start.openReward();start.chooseReward(null);start.chooseRoute('forge');start.nextBattle();
 const battle=plain(start.exportSave());Object.assign(battle.state,{origin:'cadence',energy:5,forge:true,flags:{forge:true},hand:['basicStrike','basicStrike'],draw:Array(8).fill('basicWard'),discard:[],exhaust:[],deck:['basicStrike','basicStrike',...Array(8).fill('basicWard')]});const g=restored(E,battle);step(g,'play',0);assert.equal(g.previewCard(0).actualDamage,6);step(g,'play',0);assert(g.intent().broken);const expected=g.intent().hpLoss,hp=g.snapshot().hp;step(g,'endTurn');assert.equal(hp-g.snapshot().hp,expected);
});

test('Riposte joins defense to immediate attack, stacks with Focus and triggers once',()=>{
 for(const hand of [['basicWard','basicStrike'],['guard','shieldStrike'],['stillness','bolt']]){const g=fixture('riposte',hand),c=E.card(hand[0]);assert.equal(g.previewCard(0).focus,(c.focus||0)+2);step(g,'play',0);assert.equal(g.snapshot().focus,(c.focus||0)+2);assert.equal(g.previewCard(0).actualDamage,E.card(hand[1]).damage+(c.focus||0)+2+(hand[1]==='shieldStrike'?Math.min(12,c.block):0));step(g,'play',0);assert.equal(g.snapshot().focus,0);assert.equal(g.snapshot().stats.relics,1);}
 const twice=fixture('riposte',['basicWard','basicWard','basicStrike']);step(twice,'play',0);assert.equal(twice.previewCard(0).originFocusBonus,undefined);step(twice,'play',0);assert.equal(twice.snapshot().focus,2);
 const held=fixture('riposte',['starWait']);step(held,'play',0);assert.equal(held.snapshot().focus,2);step(held,'endTurn');assert.equal(held.snapshot().focus,8);assert.equal(held.snapshot().flags.riposte,undefined);
 const reflection=fixture('riposte',['reflectShield','basicStrike']);step(reflection,'play',0);assert.equal(reflection.previewCard(0).actualDamage,5);
});

test('Riposte checks actual block, not nominal metadata, and makes no passive on a zero-block card',()=>{
 const g=fixture('riposte',['starRelay','echo','mirrorLance']);assert.equal(g.previewCard(0).originFocusBonus,undefined);step(g,'play',0);step(g,'play',0);assert.equal(g.snapshot().focus,0);assert.equal(g.snapshot().stats.relics,0);
 for(const id of ['basicWard','basicWard+','rimeThaw','rimeThaw+']){const g=fixture('riposte',[id],{weaken:2});step(g,'play',0);assert.equal(g.snapshot().focus,2);assert(g.snapshot().flags.riposte);}
});

test('Reservoir has end-energy boundary 1/2/5, additive next block, and no current-turn protection',()=>{
 for(const energy of [0,1,2,5]){const g=fixture('reservoir',['basicWard'],{energy,pendingBlock:5});assert.equal(g.intent().hpLoss,4);const hp=g.snapshot().hp;step(g,'endTurn');assert.equal(hp-g.snapshot().hp,4);assert.equal(g.snapshot().block,5+(energy>=2?2:0));assert.equal(g.snapshot().stats.relics,energy>=2?1:0);assert.equal(g.snapshot().pendingBlock,0);}
 const g=fixture('reservoir',['charge','basicWard'],{energy:2});step(g,'play',0);step(g,'play',0);assert.equal(g.snapshot().energy,2);step(g,'endTurn');assert.equal(g.snapshot().block,2); // mana generation can keep the boundary
 const gone=fixture('reservoir',['basicWard'],{energy:2});step(gone,'play',0);step(gone,'endTurn');assert.equal(gone.snapshot().block,0);
 const relay=fixture('reservoir',['starRelay'],{block:5,energy:2});step(relay,'play',0);step(relay,'endTurn');assert.equal(relay.snapshot().block,7);
});

test('insufficient mana is atomic for each prototype and clears no once-per-turn flag',()=>{
 for(const origin of Object.keys(E.TRIAL_ORIGINS)){const g=fixture(origin,['basicWard','bolt'],{energy:0}),save=plain(g.exportSave());assert.equal(g.play(0),false);assert.equal(g.play(1),false);assert.deepEqual(plain(g.exportSave()),save);}
});

test('reserved buffs clear on victory/defeat and new battle; a spent riposte flag survives restore',()=>{
 const spent=fixture('riposte',['basicWard','basicStrike']);step(spent,'play',0);assert(roundtrip(spent).snapshot().flags.riposte);
 for(const origin of Object.keys(E.TRIAL_ORIGINS)){const g=fixture(origin,['bolt'],{enemyHp:1,pendingBlock:7,pendingFocus:4});step(g,'play',0);assert.equal(g.snapshot().pendingBlock,0);assert.equal(g.snapshot().pendingFocus,0);step(g,'openReward');const offers=plain(g.rewardOptions());roundtrip(g);assert.deepEqual(plain(g.rewardOptions()),offers);step(g,'chooseReward',null);step(g,'chooseRoute','moon');step(g,'nextBattle');assert.equal(g.snapshot().block,0);assert.equal(g.snapshot().focus,0);assert.deepEqual(plain(g.snapshot().flags),{});
 const dead=fixture(origin,['basicWard'],{hp:1,pendingBlock:7,pendingFocus:4});step(dead,'endTurn');assert.equal(dead.snapshot().phase,'defeat');assert.equal(dead.snapshot().pendingBlock,0);}
});

test('no prototype dominates all same-state attacks/defense sequences',()=>{
 // One guard + attack favors Riposte; two attacks favor Cadence; holding favors Reservoir's future defense.
 const damage=origin=>{const g=fixture(origin,['basicWard','basicStrike'],{energy:2});g.play(0);return g.previewCard(0).actualDamage;};assert(damage('riposte')>damage('cadence'));assert(damage('riposte')>damage('reservoir'));
 const second=origin=>{const g=fixture(origin,['basicStrike','basicStrike'],{energy:2});g.play(0);return g.previewCard(0).actualDamage;};assert(second('cadence')>second('riposte'));
 const future=origin=>{const g=fixture(origin,['basicWard'],{energy:2});g.endTurn();return g.snapshot().block;};assert(future('reservoir')>future('riposte'));
});

test('main definitions and 24 old traces/reward RNG remain byte exact',()=>{
 const b=JSON.parse(read('tests/fixtures/astral-charms-main.json'));for(const [k,v]of Object.entries(b.definitions))assert.equal(hash(E[k]),v,k);
 for(const row of b.rows){const g=E.createGame(E.seededRandom(row.seed),{ruleset:row.ruleset});g.selectOrigin(row.origin);const trace=[hash(g.exportSave())];g.start();trace.push(hash(g.exportSave()));assert(fight(E,g,OPTIONS).win);trace.push(hash(g.exportSave()));g.openReward();trace.push(hash(g.exportSave()));step(g,'chooseReward',g.rewardOptions()[0]);step(g,'chooseRoute','moon');step(g,'nextBattle');trace.push(hash(g.exportSave()));assert.deepEqual(trace,row.trace);}
});

test('legacy intro options stay fixed after restoring into a new trial instance; corrupt flags reject atomically',()=>{
 const old=E.createGame(E.seededRandom(7),{ruleset:E.EARLY_CHOICE_RULESET}),g=E.createGame(E.seededRandom(7),{ruleset:E.EARLY_CHOICE_RULESET,charmTrial:true});assert(g.restoreSave(old.exportSave()));assert.deepEqual(plain(g.originOptions()),Object.keys(E.ORIGINS));assert.deepEqual(plain(g.exportSave()),plain(old.exportSave()));
 const live=E.createGame(E.seededRandom(7),{ruleset:E.EARLY_CHOICE_RULESET,charmTrial:true}),valid=plain(live.exportSave());for(const change of [s=>s.state.origin=ids.find(id=>!live.originOptions().includes(id)),s=>s.state.flags.charmTrial=false,s=>s.state.flags.riposte=true,s=>s.state.ruleset='growth-v2']){const bad=plain(valid);change(bad);assert.equal(live.restoreSave(bad),false);assert.deepEqual(plain(live.exportSave()),valid);}
 const battle=plain(fixture('riposte',['basicWard']).exportSave());battle.state.origin='frost';battle.state.flags.riposte=true;assert.equal(live.restoreSave(battle),false);
 const wrong=plain(fixture('cadence',['basicWard']).exportSave());wrong.version=5;wrong.state.ruleset='growth-v2';assert.equal(live.restoreSave(wrong),false);
});

test('each prototype completes real first reward → battle2 use → evolution → battle3 save flow',()=>{
 for(const origin of Object.keys(E.TRIAL_ORIGINS)){
  let g;for(let seed=1;seed<=32;seed++){const candidate=E.createGame(E.seededRandom(seed),{ruleset:E.EARLY_CHOICE_RULESET,charmTrial:true});if(candidate.originOptions().includes(origin)){g=candidate;break;}}
  assert(g);step(g,'selectOrigin',origin);step(g,'start');assert(fight(E,g,OPTIONS).win);step(g,'openReward');const id=g.rewardOptions()[0];step(g,'chooseReward',id);step(g,'chooseRoute','moon');step(g,'nextBattle');assert(g.snapshot().hand.includes(id));assert(fight(E,g,OPTIONS).win);step(g,'openReward');step(g,'chooseReward',null);step(g,'chooseSanctuary','evolve');step(g,'evolve',id);step(g,'nextBattle');assert(g.snapshot().hand.includes(id+'+'));assert(fight(E,g,OPTIONS).win);roundtrip(g);
 }
});
