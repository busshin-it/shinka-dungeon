import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {validateSet,promptManifest} from '../tools/astral-card-production.mjs';
import {engine,format,plain,fixture,step,base,restore,win} from './helpers/restitch-fixtures.mjs';
const ids=['frostCrossing','starFrostLetter','stillMirror','afterglowWard','bankedStarBlade'];
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');

test('five no-reuse cards match authored normal/evolved specs, art and visible text',()=>{
 for(const [name,count]of [['mana-frost',2],['mana-mirror',2],['mana-bank',1]]){
  const spec=JSON.parse(read('design/production/'+name+'.json'));
  assert.deepEqual(validateSet(spec,{stage:'release'}),{set:name,stage:'release',cards:count,assets:count,scenarios:count*2});
  assert.deepEqual(promptManifest(spec).jobs,[]);
 }
 for(const id of ids){const c=engine.CARDS[id];for(const key of ['recycleAttack','memoryCap','exhaustBlock','exhaustReflect','draw','energy'])assert(!Object.hasOwn(c,key),id+' does not reuse spent cards');}
 assert.equal(Object.keys(engine.CARDS).length,65);
});

test('all normal/evolved cards have pure previews, atomic failed payments and unchanged v5 shape',()=>{
 const keys=Object.keys(base().state).sort();
 for(const id of ids)for(const suffix of ['', '+']){
  const g=fixture([id+suffix],{energy:0}),save=plain(g.exportSave());
  g.previewCard(0);g.intent();g.futureIntents();assert.deepEqual(plain(g.exportSave()),save);
  assert.equal(g.play(0),false);assert.deepEqual(plain(g.exportSave()),save);
  assert.deepEqual(Object.keys(save.state).sort(),keys);assert.equal(save.version,5);
  const enough=fixture([id+suffix]);step(enough,'play',0);
 }
});

test('Frost Crossing checks payment boundary and keeps its reservation after charge, but cannot reserve at zero',()=>{
 for(const suffix of ['', '+'])for(const energy of [1,2,3,5]){
  const g=fixture(['frostCrossing'+suffix,'charge'],{energy,origin:'mirror',pendingBlock:2});
  assert.equal(g.previewCard(0).actualNextBlock,energy===1?5:0);step(g,'play',0);
  assert.equal(g.snapshot().pendingBlock,energy===1?7:2);assert.equal(g.snapshot().weaken,suffix?3:2);
  step(g,'play',0);assert.equal(g.snapshot().pendingBlock,energy===1?7:2);
 }
});

test('Frost Crossing protects the present and next turn, then the reservation expires',()=>{
 const g=fixture(['frostCrossing'],{energy:1,origin:'mirror'}),hp=g.snapshot().hp;
 step(g,'play',0);assert.equal(g.intent().hpLoss,2);step(g,'endTurn');
 assert.equal(g.snapshot().hp,hp-2);assert.equal(g.snapshot().block,5);assert.equal(g.snapshot().pendingBlock,0);
 assert.equal(g.intent().hpLoss,3);step(g,'endTurn');assert.equal(g.snapshot().hp,hp-5);assert.equal(g.snapshot().block,0);
});

test('ice charm applies once, weakness takes maximum and the new support cards do not count as attacks',()=>{
 for(const id of ['frostCrossing','starFrostLetter'])for(const suffix of ['', '+'])for(const origin of ['frost','storm','mirror']){
  const c=engine.card(id+suffix),g=fixture([id+suffix,id+suffix],{origin,weaken:5});
  assert.equal(g.previewCard(0).actualWeak,c.weaken+(origin==='frost'?1:0));step(g,'play',0);
  assert.equal(g.snapshot().weaken,5);assert.equal(g.snapshot().spellCount,0);assert.equal(g.previewCard(0).actualWeak,c.weaken);
 }
});

test('Star Frost Letter reserves only the next first attack; order consumes it and unused focus expires',()=>{
 for(const suffix of ['', '+']){
  const amount=suffix?6:4,g=fixture(['starFrostLetter'+suffix],{energy:2,origin:'mirror'}, {draw:['bolt','basicStrike',...Array(7).fill('basicWard')]});
  step(g,'play',0);assert.equal(g.snapshot().pendingFocus,amount);step(g,'endTurn');
  assert.equal(g.previewCard(0).actualDamage,14+amount);step(g,'play',1);
  assert.equal(g.snapshot().focus,0);assert.equal(g.previewCard(0).actualDamage,14);
  const unused=fixture(['starFrostLetter'+suffix],{energy:2,origin:'mirror'});step(unused,'play',0);step(unused,'endTurn');step(unused,'endTurn');assert.equal(unused.snapshot().focus,0);
 }
});

test('Still Mirror reflects every hit even fully blocked, does not trigger moon charm, and expires through rest',()=>{
 for(const suffix of ['', '+']){
  const g=fixture(['stillMirror'+suffix],{origin:'mirror',block:30});step(g,'play',0);
  assert.equal(g.snapshot().flags.mirror,undefined);assert.equal(g.snapshot().block,30);
  assert.equal(g.intent().reflected,(suffix?5:4)*2);assert.equal(g.intent().hpLoss,0);step(g,'endTurn');
  assert.equal(g.snapshot().reflect,0);assert.equal(g.snapshot().focus,suffix?5:3);
  const resting=fixture(['stillMirror'+suffix],{origin:'mirror',turn:2},{battle:1});step(resting,'play',0);step(resting,'endTurn');assert.equal(resting.snapshot().reflect,0);
 }
 const kill=fixture(['stillMirror'],{enemyHp:4,origin:'mirror'});step(kill,'play',0);assert.equal(kill.intent().resolvedHits,1);step(kill,'endTurn');assert.equal(kill.snapshot().phase,'victory');assert.equal(kill.snapshot().pendingFocus,0);
});

test('Afterglow Ward uses previous ending mana, never current mana; mirror charm adds once',()=>{
 for(const suffix of ['', '+'])for(const empty of [false,true])for(const energy of [1,3,5]){
  const g=fixture(['afterglowWard'+suffix,'afterglowWard'],{turn:2,prevEndEmpty:empty,energy,origin:'mirror'});
  assert.equal(g.previewCard(0).actualBlock,(suffix?6:3)+(empty?5:0));
  assert.equal(g.previewCard(0).actualReflect,(suffix?2:1)+2);step(g,'play',0);
  assert.equal(g.previewCard(0).actualReflect,1);
 }
});

test('real zero/nonzero turn endings produce different next Afterglow Ward previews',()=>{
 for(const empty of [false,true]){
  const g=fixture(['basicWard'],{energy:empty?1:2,origin:'mirror'},{draw:['afterglowWard',...Array(8).fill('basicWard')]});
  step(g,'play',0);step(g,'endTurn');assert.equal(g.snapshot().prevEndEmpty,empty);
  assert.equal(g.previewCard(0).actualBlock,empty?8:3);
 }
});

test('Banked Star Blade uses pre-payment four-mana threshold, preserves two mana and thunder/forge first-use rules',()=>{
 for(const suffix of ['', '+'])for(const energy of [2,3,4,5])for(const origin of ['frost','storm','mirror']){
  const g=fixture(['bankedStarBlade'+suffix],{energy,origin}),damage=(suffix?11:8)+(energy>=4?8:0)+(origin==='storm'?3:0);
  assert.equal(g.previewCard(0).actualDamage,damage);step(g,'play',0);
  assert.equal(g.snapshot().energy,energy-2);assert.equal(g.snapshot().pendingFocus,suffix?4:2);assert.equal(g.snapshot().spellCount,1);
 }
 const double=fixture(['bankedStarBlade','bankedStarBlade'],{energy:5,origin:'storm'});step(double,'play',0);assert.equal(double.previewCard(0).actualDamage,8);
 const forge=fixture(['bankedStarBlade'],{energy:4,origin:'mirror',route:'forge',forge:true,enemyId:'stone',enemyMaxHp:38,enemyHp:38});assert.equal(forge.previewCard(0).actualDamage,18);
});

test('stacked reservations coexist and combat victory clears all preparation',()=>{
 const g=fixture(['starFrostLetter','stillMirror'],{pendingFocus:2,origin:'mirror'});step(g,'play',0);step(g,'play',0);assert.equal(g.snapshot().pendingFocus,9);step(g,'endTurn');assert.equal(g.snapshot().focus,9);
 const kill=fixture(['starFrostLetter','bankedStarBlade'],{enemyHp:1,energy:4,origin:'mirror'});step(kill,'play',0);step(kill,'play',0);assert.equal(kill.snapshot().phase,'victory');assert.equal(kill.snapshot().pendingFocus,0);
});

test('new cards appear only in current second-and-later rewards; open offers remain fixed',()=>{
 for(const ruleset of ['classic','growth-v1','growth-v2'])for(const battle of [1,2,4,5]){
  const g=restore(base(battle,ruleset));win(g);const source=g.exportSave(),seen=new Set();
  for(let seed=1;seed<=256;seed++){
   const save=plain(source);save.rngState=seed;const x=restore(save);step(x,'openReward');
   for(const id of x.rewardOptions())if(ids.includes(id))seen.add(id);
   const opened=plain(x.exportSave());assert.equal(x.openReward(),false);assert.deepEqual(plain(x.exportSave()),opened);assert.deepEqual(plain(restore(opened).rewardOptions()),plain(x.rewardOptions()));
  }
  assert.deepEqual([...seen].sort(),ruleset==='growth-v2'&&battle>=2?[...ids].sort():[]);
 }
});

test('every new card can be acquired, guaranteed in the opening hand, evolved, removed and restored',()=>{
 for(const id of ids){let g;
  for(let seed=1;seed<=512&&!g;seed++){const x=restore(base(2));win(x);const save=plain(x.exportSave());save.rngState=seed;const t=restore(save);t.openReward();if(t.rewardOptions().includes(id))g=t;}
  assert(g,id);step(g,'chooseReward',id);const removed=restore(g.exportSave());step(removed,'chooseSanctuary','remove');step(removed,'removeCard',id);step(removed,'nextBattle');assert(!removed.snapshot().deck.includes(id));
  step(g,'chooseSanctuary','evolve');step(g,'evolve',id);step(g,'nextBattle');assert(g.snapshot().hand.includes(id+'+'));assert.equal(g.exportSave().version,5);
 }
});

test('independent 4.19 definitions, saved offers, next actions and RNG stay pinned',()=>{
 const baseline=JSON.parse(read('tests/fixtures/astral-v419-mana-synthetic.json'));
 assert.equal(baseline.sourceCommit,'c59fd503af74f9b93c2057900f0cbd910df5431e');
 for(const [id,c]of Object.entries(baseline.cards))assert.deepEqual(plain(engine.CARDS[id]),c,id);
 for(const [id,c]of Object.entries(baseline.upgrades))assert.deepEqual(plain(engine.card(id)),c,id);
 for(const row of baseline.fixtures){const g=restore(row.save);assert.equal(g[row.command[0]](...row.command.slice(1)),row.result);assert.equal(hash(g.exportSave()),row.afterSha256,row.name);}
});

test('seventeen synthetic UI scenes use valid game wrappers and cannot reach real saves or PWA',()=>{
 const scenes=JSON.parse(read('ui-qa/mana-bridges-fixtures.json'));assert.equal(Object.keys(scenes).length,17);
 for(const wrapped of Object.values(scenes)){assert.equal(wrapped.version,1);assert.equal(wrapped.seed,419);assert.equal(wrapped.savedAt,0);assert(JSON.stringify(wrapped).length<100000);restore(wrapped.engine);}
 const html=read('ui-qa/mana-bridges.html');
 for(const text of ['sandbox="allow-scripts"',"Object.defineProperty(window,'localStorage'",'script[src="./pwa.js"]',"link.removeAttribute('href')",'./mana-bridges-fixtures.json'])assert(html.includes(text));
 assert(!html.includes('allow-same-origin'));
});
