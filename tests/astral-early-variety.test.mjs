import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadGame,validateSet,promptManifest} from '../tools/astral-card-production.mjs';
const {engine:E}=loadGame(),plain=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function restore(save){const g=E.createGame();assert(g.restoreSave(plain(save)));assert.deepEqual(plain(g.exportSave()),plain(save));return g;}
function step(g,key,...args){const copy=restore(g.exportSave());assert(g[key](...args));assert(copy[key](...args));assert.deepEqual(plain(copy.exportSave()),plain(g.exportSave()));restore(g.exportSave());}
function fresh(seed=1){const g=E.createGame(E.seededRandom(seed),{ruleset:E.VARIETY_RULESET});g.selectOrigin('storm');g.start();return g;}
function win(g){const save=plain(g.exportSave()),s=save.state;Object.assign(s,{enemyHp:1,energy:5,block:0,reflect:0,focus:0});s.hand=[...s.deck];s.draw=[];s.discard=[];s.exhaust=[];assert(g.restoreSave(save));step(g,'play',s.hand.findIndex(id=>E.card(id).isAttack));assert.equal(g.snapshot().phase,'victory');}
function fixture(hand,changes={}){const g=fresh(),save=plain(g.exportSave()),s=save.state;Object.assign(s,{origin:'storm',enemyHp:15,energy:5,hand:[...hand],draw:Array(10-hand.length).fill('basicWard'),discard:[],exhaust:[],block:0,focus:0,weaken:0,reflect:0,flags:{},...changes});s.deck=[...s.hand,...s.draw,...s.discard,...s.exhaust];return restore(save);}

test('four cards use existing effects and individually mapped reused art, with eight production scenarios',()=>{
 const spec=JSON.parse(read('design/production/early-variety.json'));
 assert.deepEqual(validateSet(spec,{stage:'release'}),{set:'early-variety',stage:'release',cards:4,assets:5,scenarios:8});assert.deepEqual(promptManifest(spec).jobs,[]);
 assert.equal(Object.keys(E.CARDS).length,65);assert(spec.assets.every(a=>a.status==='reuse'));
 for(const c of spec.cards){assert(c.design.related_cards.length>=2);assert(c.design.related_cards.every(id=>E.card(id)));}
});

test('base and evolved cards preserve preview, payment atomicity, existing state keys and roundtrip',()=>{
 const keys=Object.keys(fresh().snapshot()).sort();
 for(const id of E.VARIETY_REWARD_ONLY)for(const suffix of ['','+']){
  const g=fixture([id+suffix]),before=plain(g.exportSave());g.previewCard(0);g.intent();assert.deepEqual(plain(g.exportSave()),before);step(g,'play',0);assert.equal(g.exportSave().version,7);assert.deepEqual(Object.keys(g.snapshot()).sort(),keys);
  const poor=fixture([id+suffix],{energy:0}),save=plain(poor.exportSave());assert.equal(poor.play(0),false);assert.deepEqual(plain(poor.exportSave()),save);
 }
});

test('Prism Strike trades first-play damage for attack sequencing and weakness without frost passive',()=>{
 for(const suffix of ['','+']){const id='prismStrike'+suffix,c=E.card(id),g=fixture(['basicStrike',id]);assert.equal(g.previewCard(1).actualDamage,c.damage);step(g,'play',0);assert.equal(g.previewCard(0).actualDamage,c.damage+5);step(g,'play',0);assert.equal(g.snapshot().weaken,c.weaken);
 const frost=fixture([id,'frostPierce'],{origin:'frost',weaken:2});assert.equal(frost.previewCard(0).actualWeak,c.weaken);step(frost,'play',0);assert.equal(frost.snapshot().weaken,2); // weakness replaces with max, never sums
 const thaw=fixture([id,'rimeThaw']);step(thaw,'play',0);assert.equal(thaw.previewCard(0).actualWeakBlockBonus,c.weaken*2);step(thaw,'play',0);assert.equal(thaw.snapshot().weaken,0);
 }
});

test('Banked Screen checks post-payment 2/3 boundary, Charge order and Mirror Lance consumption',()=>{
 for(const suffix of ['','+'])for(const energy of [2,3]){const id='bankedScreen'+suffix,c=E.card(id),g=fixture([id,'mirrorLance'],{energy});assert.equal(g.previewCard(0).bankBlockCondition,energy===3);step(g,'play',0);assert.equal(g.snapshot().block,c.block+(energy===3?3:0));assert.equal(g.previewCard(0).actualReflectDamage,c.reflect*2);step(g,'play',0);assert.equal(g.snapshot().reflect,0);}
 const g=fixture(['charge','bankedScreen'],{energy:2});step(g,'play',0);assert(g.previewCard(0).bankBlockCondition);
 const order=fixture(['basicWard','bankedScreen'],{energy:3});step(order,'play',0);assert.equal(order.previewCard(0).bankBlockCondition,false);
});

test('Star Breath draws now, reserves first attack next turn, exhausts and does not defend now',()=>{
 for(const suffix of ['','+']){const id='starBreath'+suffix,c=E.card(id),g=fixture([id,'basicStrike']);step(g,'play',0);assert.equal(g.snapshot().hand.length,1+c.draw);assert(g.snapshot().exhaust.includes(id));assert.equal(g.snapshot().block,0);assert.equal(g.previewCard(0).actualDamage,3);assert.equal(g.snapshot().pendingFocus,c.nextFocus);step(g,'endTurn');assert.equal(g.snapshot().focus,c.nextFocus);assert.equal(g.snapshot().pendingFocus,0);step(g,'endTurn');assert.equal(g.snapshot().focus,0);}
});

test('Shield Relay spends all current block, caps future block, and is risky before an attack',()=>{
 for(const suffix of ['','+'])for(const block of [0,3,12]){const id='shieldRelay'+suffix,c=E.card(id),g=fixture([id],{block});assert.equal(g.previewCard(0).actualTransferredBlock,Math.min(block,c.transferBlockCap));step(g,'play',0);assert.equal(g.snapshot().block,0);assert.equal(g.snapshot().pendingBlock,Math.min(block,c.transferBlockCap));assert.equal(g.intent().hpLoss,4);step(g,'endTurn');assert.equal(g.snapshot().block,Math.min(block,c.transferBlockCap));}
 const g=fixture(['basicWard','shieldRelay']);step(g,'play',0);assert.equal(g.previewCard(0).actualTransferredBlock,3);
 const safe=fixture(['guard','shieldRelay'],{turn:2});step(safe,'play',0);assert.equal(safe.intent().type,'recover');step(safe,'play',0);assert.equal(safe.intent().hpLoss,0);step(safe,'endTurn');assert.equal(safe.snapshot().block,6);
});

test('early pools broaden to 31/47 cards, stay disjoint, and retain three offers with take/skip',()=>{
 assert.deepEqual(plain(E.VARIETY_REWARD_POOLS.map(x=>x.flat().length)),[31,47]);
 for(const pools of E.VARIETY_REWARD_POOLS){const all=pools.flat();assert.equal(new Set(all).size,all.length);assert(all.every(id=>E.CARDS[id]&&!E.CARDS[id].starterOnly&&!E.CARDS[id].recycleAttack));}
 const g=fresh();assert.deepEqual(plain(g.snapshot().deck),plain(E.BASIC_STARTER));win(g);step(g,'openReward');const saved=plain(g.exportSave());assert.equal(g.rewardOptions().length,3);g.rewardOptions().forEach((id,i)=>assert(E.VARIETY_REWARD_POOLS[0][i].includes(id)));
 const skipped=restore(saved);step(skipped,'chooseReward',null);assert.equal(skipped.snapshot().deck.length,10);
 for(const id of g.rewardOptions()){const branch=restore(saved);step(branch,'chooseReward',id);step(branch,'chooseRoute','moon');step(branch,'nextBattle');assert(branch.snapshot().hand.includes(id));}
});

test('each new card can be taken at first reward, used in battle2, evolved and opened in battle3',()=>{
 const found=new Set();for(let seed=1;seed<=128&&found.size<4;seed++){const g=fresh(seed);win(g);g.openReward();for(const id of g.rewardOptions().filter(id=>E.VARIETY_REWARD_ONLY.includes(id)&&!found.has(id))){const b=restore(g.exportSave());step(b,'chooseReward',id);step(b,'chooseRoute','moon');step(b,'nextBattle');const save=plain(b.exportSave());save.state.energy=5;assert(b.restoreSave(save));step(b,'play',b.snapshot().hand.indexOf(id));win(b);step(b,'openReward');assert.equal(b.rewardOptions().length,3);b.rewardOptions().forEach((x,i)=>assert(E.VARIETY_REWARD_POOLS[1][i].includes(x)));step(b,'chooseReward',null);step(b,'chooseSanctuary','evolve');step(b,'evolve',id);step(b,'nextBattle');assert(b.snapshot().hand.includes(id+'+'));found.add(id);}}
 assert.equal(found.size,4);
});

test('saved v6 rewards and next RNG remain byte exact; mismatched v7 is rejected atomically',()=>{
 const baseline=JSON.parse(read('tests/fixtures/astral-variety-v6-main.json'));for(const row of baseline.rows){const g=restore(row.reward);assert.equal(g.exportSave().version,6);step(g,'chooseReward',g.rewardOptions()[0]);step(g,'chooseRoute','moon');step(g,'nextBattle');assert.equal(hash(g.exportSave()),row.secondHash);}
 const g=fresh();win(g);g.openReward();const valid=plain(g.exportSave());for(const change of [s=>s.version=6,s=>s.state.ruleset=E.EARLY_CHOICE_RULESET,s=>s.state.rewardOffers.push('focus')]){const bad=plain(valid);change(bad);assert.equal(g.restoreSave(bad),false);assert.deepEqual(plain(g.exportSave()),valid);}
});
