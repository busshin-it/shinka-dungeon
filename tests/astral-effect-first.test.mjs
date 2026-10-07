import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadGame,validateSet,promptManifest} from '../tools/astral-card-production.mjs';

const {engine,format}=loadGame();
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const NEW=['frostRecall','bankedEcho','ashStudy','mirrorRelay'];
const ALL=NEW.flatMap(x=>[x,x+'+']);
const zones=s=>[...s.hand,...s.draw,...s.discard,...s.exhaust];
const sorted=a=>[...a].sort();
function restore(save){const g=engine.createGame();assert.equal(g.restoreSave(plain(save)),true);assert.deepEqual(plain(g.exportSave()),plain(save));return g;}
function step(g,method,...args){const copy=restore(g.exportSave());assert.equal(g[method](...args),true,method);assert.equal(copy[method](...args),true);assert.deepEqual(plain(g.exportSave()),plain(copy.exportSave()));restore(g.exportSave());if(['battle','victory','defeat'].includes(g.snapshot().phase))assert.deepEqual(sorted(zones(g.snapshot())),sorted(g.snapshot().deck));}
const bases=new Map();
function win(g){const save=plain(g.exportSave()),s=save.state;Object.assign(s,{hp:s.maxHp,enemyHp:1,energy:5,block:0,focus:0,reflect:0,weaken:0,pendingBlock:0,pendingFocus:0,turnLastAttack:0,prevLastAttack:0,prevEndEmpty:false,usedExhaustThisTurn:false,turnDamage:0,spellCount:0,interrupted:false,flags:{}});s.draw=[...s.deck];s.hand=s.draw.splice(s.draw.findIndex(x=>engine.card(x).isAttack),1);s.discard=[];s.exhaust=[];assert(g.restoreSave(save));step(g,'play',0);}
function base(battle=2,ruleset='growth-v1'){
 const key=battle+'/'+ruleset;if(bases.has(key))return plain(bases.get(key));
 const g=engine.createGame(engine.seededRandom(918),{ruleset});g.start();
 for(let b=1;b<battle;b++){win(g);g.openReward();g.chooseReward(null);if(b===1)g.chooseRoute('moon');else if(b===3)g.chooseChapter('library');else if(b===5)g.chooseCamp('rest');else g.chooseSanctuary('rest');g.nextBattle();}
 const save=plain(g.exportSave());bases.set(key,save);return plain(save);
}
function fixture(hand,changes={},options={}){
 const save=base(options.battle||2,options.ruleset||'growth-v1'),s=save.state;
 Object.assign(s,{origin:'frost',turn:1,hp:s.maxHp,enemyHp:s.enemyMaxHp,energy:5,block:0,focus:0,reflect:0,weaken:0,pendingBlock:0,pendingFocus:0,turnLastAttack:0,prevLastAttack:0,prevEndEmpty:false,usedExhaustThisTurn:false,turnDamage:0,spellCount:0,interrupted:false,flags:{}},changes);
 s.hand=[...hand];s.discard=[...(options.discard||[])];s.exhaust=[...(options.exhaust||[])];s.draw=options.draw?[...options.draw]:Array(10-hand.length-s.discard.length-s.exhaust.length).fill('basicWard');
 while(zones(s).length<10)s.exhaust.push('meditate');s.deck=zones(s);assert.equal(s.deck.length,10);return restore(save);
}

test('effect-first batch reuses all art and existing effect vocabulary, with 12 production cases',()=>{
 const spec=JSON.parse(read('design/production/effect-first.json'));
 assert.deepEqual(validateSet(spec,{stage:'release'}),{set:'effect-first',stage:'release',cards:4,assets:5,scenarios:12});
 assert.deepEqual(promptManifest(spec).jobs,[]);
 assert(spec.assets.every(x=>x.status==='reuse'));
 assert.deepEqual(spec.cards.map(x=>x.id),NEW);
 for(const c of spec.cards){assert(c.design.strong_when.length);assert(c.design.weak_when.length);assert(c.design.related_cards.every(x=>engine.card(x)));}
 const aliases=JSON.parse(read('design/production/reusable-art.json')).effect_first_aliases;
 const html=read('v4-1/planning.html');for(const [id,original]of Object.entries(aliases)){const paths=[id,original].map(key=>html.match(new RegExp(`data-card-art="${key}" src="([^"]+)"`))[1]);assert.equal(paths[0],paths[1]);}
});

test('all eight variants preserve preview/RNG, zones, save schema, and atomic failed payments',()=>{
 const keys=Object.keys(base().state).sort();
 for(const id of ALL){const g=fixture([id]);const before=plain(g.exportSave());g.previewCard(0);g.intent();g.futureIntents();assert.deepEqual(plain(g.exportSave()),before);assert.deepEqual(Object.keys(before.state).sort(),keys);step(g,'play',0);assert.equal(g.exportSave().version,4);
  const poor=fixture([id],{energy:0}),saved=plain(poor.exportSave());if(engine.card(id).cost){assert.equal(poor.play(0),false);assert.deepEqual(plain(poor.exportSave()),saved);}else step(poor,'play',0);
 }
});

test('Frost Recall targets the newest discard attack, keeps upgrades/duplicates, and draws only later',()=>{
 for(const id of ['frostRecall','frostRecall+'])for(const discard of [[],['guard'],['ice','bolt+','guard'],['ice','ice+','ice']]){
  const g=fixture([id,'dark'],{energy:2},{discard});const target=[...discard].reverse().find(x=>engine.card(x).isAttack)||null;const p=g.previewCard(0),rng=g.exportSave().rngState;assert.equal(p.recycleTargetId,target);step(g,'play',0);assert.equal(g.exportSave().rngState,rng);assert.deepEqual(plain(g.snapshot().hand),['dark']);if(target){assert.equal(g.snapshot().draw[0],target);step(g,'play',0);assert.equal(g.snapshot().hand[0],target);}
 }
 const empty=fixture(['frostRecall'],{}, {discard:[],draw:[]});step(empty,'play',0);assert.equal(empty.snapshot().draw.length,0);
});

test('Frost Recall combines with frost charm once and changes actual multi-hit intent without consuming weakness',()=>{
 const g=fixture(['frostRecall','frostRecall+','frostPierce'],{energy:5});step(g,'play',0);assert.equal(g.snapshot().weaken,3);assert.equal(g.intent().perHit,0);assert.equal(g.previewCard(0).actualWeak,3);step(g,'play',0);assert.equal(g.snapshot().weaken,3);assert.equal(g.previewCard(0).weakThresholdCondition,true);step(g,'play',0);assert.equal(g.snapshot().weaken,3);
});

test('Banked Echo uses pre-payment 3/4/5 thresholds, stacks next-focus, then expires correctly',()=>{
 for(const id of ['bankedEcho','bankedEcho+'])for(const energy of [3,4,5]){
  const g=fixture([id],{energy,pendingFocus:2,focus:1,turn:2}),c=engine.card(id);assert.equal(g.previewCard(0).actualDamage,c.damage+1+(energy>=4?6:0));step(g,'play',0);assert.equal(g.snapshot().energy,energy-1);assert.equal(g.snapshot().focus,0);assert.equal(g.snapshot().pendingFocus,2+c.nextFocus);step(g,'endTurn');assert.equal(g.snapshot().focus,2+c.nextFocus);assert.equal(g.snapshot().pendingFocus,0);step(g,'endTurn');assert.equal(g.snapshot().focus,0);
 }
 const g=fixture(['charge','bankedEcho'],{energy:3});step(g,'play',0);assert.equal(g.previewCard(0).actualDamage,10);
 const ordered=fixture(['bankedEcho','bankedEcho'],{energy:4});step(ordered,'play',0);assert.equal(ordered.previewCard(0).actualDamage,4);step(ordered,'play',0);assert.equal(ordered.snapshot().pendingFocus,6);
});

test('Banked Echo participates in total/single/count interruption and death clears reserved focus',()=>{
 const g=fixture(['bankedEcho','basicStrike'],{turn:3,energy:4,focus:2},{battle:4});assert.equal(g.previewCard(0).actualDamage,12);step(g,'play',0);assert.equal(g.snapshot().interrupted,true);assert.equal(g.intent().damage,8);
 const total=fixture(['bankedEcho'],{turn:2,energy:4},{battle:3});step(total,'play',0);assert.equal(total.snapshot().interrupted,true);
 const count=fixture(['basicStrike','basicStrike','bankedEcho'],{turn:2,energy:4},{battle:4});step(count,'play',0);step(count,'play',0);step(count,'play',0);assert.equal(count.snapshot().spellCount,3);assert.equal(count.snapshot().interrupted,true);
 const lethal=fixture(['bankedEcho'],{energy:4,enemyHp:1});step(lethal,'play',0);assert.equal(lethal.snapshot().pendingFocus,0);assert.equal(lethal.snapshot().turnLastAttack,0);
});

test('Ash Study cannot trigger itself; preceding exhausts, repeated copies, and turn reset are ordered',()=>{
 for(const id of ['ashStudy','ashStudy+']){
  const first=fixture([id,'ashStudy'],{energy:0});step(first,'play',0);assert.equal(first.snapshot().block,0);assert.equal(first.snapshot().reflect,0);assert.equal(first.previewCard(0).actualBlock,4);step(first,'play',0);assert.equal(first.snapshot().block,4);assert.equal(first.snapshot().reflect,2);
  const after=fixture(['charge',id,'mirrorLance'],{energy:0});step(after,'play',0);step(after,'play',0);assert.equal(after.snapshot().block,4);assert.equal(after.previewCard(0).actualReflectDamage,4);step(after,'play',0);assert.equal(after.snapshot().reflect,0);assert.equal(after.snapshot().block,4);
 }
 const next=fixture(['ashStudy'],{usedExhaustThisTurn:true});step(next,'endTurn');assert.equal(next.snapshot().usedExhaustThisTurn,false);
 const mirrored=fixture(['charge','ashStudy'],{origin:'mirror'});step(mirrored,'play',0);assert.equal(mirrored.previewCard(0).actualReflect,2,'conditional block alone does not grant mirror charm');step(mirrored,'play',0);assert.equal(mirrored.snapshot().flags.mirror,undefined);
});

test('Ash Study handles empty draw, reshuffle, upgraded draw and never re-draws its own exhaust',()=>{
 for(const id of ['ashStudy','ashStudy+'])for(const discard of [[],['ice'],['ice','bolt+']]){
  const g=fixture([id],{usedExhaustThisTurn:true},{draw:[],discard});step(g,'play',0);assert.equal(g.snapshot().hand.length,Math.min(engine.card(id).draw,discard.length));assert(!g.snapshot().hand.includes(id));assert(g.snapshot().exhaust.includes(id));
 }
});

test('Mirror Relay consumes all block at cap boundaries, stacks reservations/reflect, and expires',()=>{
 for(const id of ['mirrorRelay','mirrorRelay+'])for(const block of [0,1,5,6,7,9,10,11,20]){
  const g=fixture([id],{energy:0,block,reflect:1,pendingBlock:2,origin:'mirror'}),c=engine.card(id);assert.equal(g.previewCard(0).actualNextBlock,Math.min(c.transferBlockCap,block));step(g,'play',0);assert.equal(g.snapshot().block,0);assert.equal(g.snapshot().pendingBlock,2+Math.min(c.transferBlockCap,block));assert.equal(g.snapshot().reflect,1+c.reflect);assert.equal(g.snapshot().flags.mirror,undefined);step(g,'endTurn');assert.equal(g.snapshot().block,2+Math.min(c.transferBlockCap,block));assert.equal(g.snapshot().reflect,0);assert.equal(g.snapshot().pendingBlock,0);step(g,'endTurn');assert.equal(g.snapshot().block,0);
 }
});

test('Mirror Relay does not prevent current HP loss, supports Ash Study, and clears on defeat/victory',()=>{
 const g=fixture(['mirrorRelay','ashStudy'],{block:7});step(g,'play',0);assert.equal(g.intent().damage,6);assert.equal(g.intent().reflected,4);step(g,'play',0);assert.equal(g.snapshot().block,4);assert.equal(g.snapshot().reflect,4);assert.equal(g.intent().hpLoss,2);step(g,'endTurn');assert.equal(g.snapshot().block,6);
 const death=fixture(['mirrorRelay'],{hp:1,block:9});step(death,'play',0);step(death,'endTurn');assert.equal(death.snapshot().phase,'defeat');assert.equal(death.snapshot().pendingBlock,0);
 const kill=fixture(['mirrorRelay'],{enemyHp:2,block:9});step(kill,'play',0);step(kill,'endTurn');assert.equal(kill.snapshot().phase,'victory');assert.equal(kill.snapshot().pendingBlock,0);
});

test('new cards enter only growth rewards after battle 2, and open rewards never reroll',()=>{
 for(const ruleset of ['classic','growth-v1'])for(const battle of [1,2,4]){
  const seen=new Set();const g=restore(base(battle,ruleset));win(g);const saved=plain(g.exportSave());
  for(let seed=1;seed<=256;seed++){const s=plain(saved);s.rngState=seed;const x=restore(s);step(x,'openReward');const offers=plain(x.rewardOptions());assert.equal(offers.length,4);assert.equal(new Set(offers).size,4);offers.filter(id=>NEW.includes(id)).forEach(id=>seen.add(id));const open=plain(x.exportSave());assert.equal(x.openReward(),false);assert.deepEqual(plain(x.exportSave()),open);}
  assert.deepEqual(sorted(seen),sorted(ruleset==='growth-v1'&&battle>=2?NEW:[]));
 }
});

test('every new ID supports reward, guaranteed opening, upgrade, removal, and v4 save/next-action replay',()=>{
 for(const id of NEW){let offered;
  for(let seed=1;seed<=512&&!offered;seed++){const g=restore(base(2));win(g);const s=plain(g.exportSave());s.rngState=seed;const x=restore(s);x.openReward();if(x.rewardOptions().includes(id))offered=x;}
  assert(offered,id+' offered');step(offered,'chooseReward',id);const unupgraded=restore(offered.exportSave());step(unupgraded,'chooseSanctuary','rest');step(unupgraded,'nextBattle');assert(unupgraded.snapshot().hand.includes(id));
  step(offered,'chooseSanctuary','evolve');step(offered,'evolve',id);step(offered,'nextBattle');assert(offered.snapshot().hand.includes(id+'+'));
  win(offered);step(offered,'openReward');step(offered,'chooseReward',null);step(offered,'chooseChapter','library');step(offered,'nextBattle');win(offered);step(offered,'openReward');step(offered,'chooseReward',null);step(offered,'chooseSanctuary','remove');step(offered,'removeCard',id+'+');step(offered,'nextBattle');assert(!zones(offered.snapshot()).includes(id+'+'));
 }
});

const baseline=JSON.parse(read('tests/fixtures/astral-v414-baseline.json'));
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('all 48 v4.14 cards/origins/enemies stay exact; 13 pinned saves preserve next action and RNG',()=>{
 for(const [id,value]of Object.entries(baseline.cards))assert.deepEqual(plain(engine.CARDS[id]),value,id);
 assert.equal(Object.keys(baseline.cards).length,48);assert.deepEqual(plain(engine.ORIGINS),baseline.origins);assert.deepEqual(plain(engine.ENEMIES),baseline.enemies);
 for(const {name,save,command,afterSha256}of baseline.fixtures){const g=restore(save);step(g,command[0],...command.slice(1));assert.equal(sha(plain(g.exportSave())),afterSha256,name+' exact v4.14 next action');}
});
test('all classic future rewards and growth first rewards retain v4.14 offers and RNG in 1152 checks',()=>{
 const traces=[];
 for(const ruleset of ['classic','growth-v1'])for(const origin of ['frost','storm','mirror'])for(let seed=1;seed<=64;seed++){
  const g=engine.createGame(engine.seededRandom(seed),{ruleset});g.selectOrigin(origin);g.start();
  for(let battle=1;battle<=5;battle++){
   const save=plain(g.exportSave()),s=save.state;Object.assign(s,{enemyHp:1,energy:5,focus:0});s.draw=[...s.deck];s.hand=s.draw.splice(s.draw.findIndex(id=>engine.card(id).isAttack),1);s.discard=[];s.exhaust=[];assert(g.restoreSave(save));g.play(0);g.openReward();
   if(ruleset==='classic'||battle===1)traces.push([ruleset,origin,seed,battle,plain(g.rewardOptions()),g.exportSave().rngState]);
   if(ruleset==='growth-v1')break;
   g.chooseReward(null);if(battle===1)g.chooseRoute('moon');else if(battle===3)g.chooseChapter('library');else if(battle===5)g.chooseCamp('rest');else g.chooseSanctuary('rest');g.nextBattle();
  }
 }
 assert.equal(traces.length,baseline.rewardTraceCount);assert.equal(traces.length,1152);assert.equal(sha(traces),baseline.rewardTraceSha256);
});

test('six optional user-owned UI scenes restore and keep isolated in-memory storage',()=>{
 const scenes=JSON.parse(read('ui-qa/effect-first-fixtures.json'));assert.equal(Object.keys(scenes).length,6);
 for(const [key,wrapped]of Object.entries(scenes)){const g=restore(wrapped.engine);if(key==='reward')assert.deepEqual(plain(g.rewardOptions()),NEW);if(key.startsWith('battle'))assert.equal(g.snapshot().hand.filter(x=>NEW.includes(engine.card(x).base)).length,4);}
 const html=read('ui-qa/effect-first.html');assert(html.includes('sandbox="allow-scripts"'));assert(!html.includes('allow-same-origin'));assert(html.includes("Object.defineProperty(window,'localStorage'"));assert(html.includes('script[src="./pwa.js"]'));assert(html.includes("link.removeAttribute('href')"));
});
