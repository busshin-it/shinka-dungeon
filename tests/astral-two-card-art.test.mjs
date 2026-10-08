import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {engine,format,fixture,plain,restore,step,base,win} from './helpers/restitch-fixtures.mjs';
import {validateSet} from '../tools/astral-card-production.mjs';
const ids=['iceLanternWard','mirrorEmberSeed'];

test('two dedicated images and six normal/upgrade production scenes validate',()=>{
 const spec=JSON.parse(fs.readFileSync(new URL('../design/production/two-card-art.json',import.meta.url)));
 assert.equal(validateSet(spec,{stage:'release'}).scenarios,6);
 assert(spec.assets.every(a=>a.status==='final'&&a.provenance.kind==='project-generated'));
 assert.notEqual(spec.assets[0].sha256,spec.assets[1].sha256);
 const jobs=JSON.parse(fs.readFileSync(new URL('../design/production/two-card-art-jobs-20261008.json',import.meta.url))).jobs;
 assert.equal(jobs.length,2);assert.equal(new Set(jobs.map(j=>j.asset_id)).size,2);
 for(const j of jobs){assert.equal(j.type,'card');assert.equal(j.attempts,1);assert.equal(j.aspect_ratio,'2:3');}
});

test('lantern reads post-payment bank boundary; weakness and origin are independent of banking',()=>{
 for(const suffix of ['', '+'])for(const origin of ['frost','storm','mirror'])for(const energy of [0,1,2,3,4,5]){
  const g=fixture(['iceLanternWard'+suffix],{origin,energy,block:1,weaken:0}),before=plain(g.exportSave()),p=g.previewCard(0);
  const block=(suffix?6:3)+(energy>=3?5:0),weak=(suffix?2:1)+(origin==='frost'?1:0);
  assert.equal(p.actualBlock,block);assert.equal(p.actualWeak,weak);assert.equal(p.bankBlockCondition,energy>=3);
  assert(format(p).summary.includes('防御'+block));assert.deepEqual(plain(g.exportSave()),before);
  if(!energy){assert.equal(g.play(0),false);assert.deepEqual(plain(g.exportSave()),before);continue;}
  step(g,'play',0);assert.equal(g.snapshot().block,1+block);assert.equal(g.snapshot().weaken,weak);
  assert.equal(g.snapshot().reflect,origin==='mirror'?2:0);assert.equal(g.snapshot().energy,energy-1);
 }
});

test('mirror seed caps conversion, consumes all reflection, and reserves only future focus',()=>{
 for(const suffix of ['', '+'])for(const reflect of [0,1,6,9])for(const energy of [0,1,3]){
  const g=fixture(['mirrorEmberSeed'+suffix,'basicStrike'],{origin:'frost',energy,reflect,focus:2,pendingFocus:3,block:4}),before=plain(g.exportSave()),p=g.previewCard(0);
  const damage=(suffix?5:2)+Math.min(6,reflect)+2,next=suffix?6:4;
  assert.equal(p.actualDamage,damage);assert.equal(p.actualConsumedReflect,reflect);assert.equal(p.actualNextFocus,next);
  assert.deepEqual(plain(g.exportSave()),before);
  if(!energy){assert.equal(g.play(0),false);assert.deepEqual(plain(g.exportSave()),before);continue;}
  step(g,'play',0);const s=g.snapshot();assert.equal(s.reflect,0);assert.equal(s.block,4);assert.equal(s.focus,0);assert.equal(s.pendingFocus,3+next);
  assert.equal(s.enemyHp,before.state.enemyHp-damage);assert.equal(s.spellCount,1);assert.equal(s.stats.reflected,0);
 }
});

test('lantern feeds frost omen and thaw while using attacks first can lose the bank bonus',()=>{
 const g=fixture(['iceLanternWard+','frostOmen','rimeThaw'],{origin:'frost',energy:4});
 step(g,'play',0);assert.equal(g.snapshot().weaken,3);assert.equal(g.previewCard(0).actualDamage,8);
 step(g,'play',0);step(g,'play',0);assert.equal(g.snapshot().block,23);assert.equal(g.snapshot().weaken,0);assert.equal(g.snapshot().pendingFocus,3);
 const first=fixture(['iceLanternWard','basicStrike'],{energy:3});step(first,'play',0);assert.equal(first.snapshot().block,8);
 const late=fixture(['iceLanternWard','basicStrike'],{energy:3});step(late,'play',1);assert.equal(late.previewCard(0).actualBlock,3);
});

test('still mirror feeds seed; both reservations stack and only next turns first attack gets them',()=>{
 const g=fixture(['stillMirror','mirrorEmberSeed'],{origin:'frost',energy:3},{draw:['bolt','basicStrike',...Array(6).fill('basicWard')]});
 step(g,'play',0);assert.equal(g.previewCard(0).actualDamage,6);step(g,'play',0);
 assert.equal(g.snapshot().pendingFocus,7);assert.equal(g.snapshot().reflect,0);
 step(g,'endTurn');const index=g.snapshot().hand.indexOf('bolt');assert(index>=0);assert.equal(g.previewCard(index).actualDamage,21);
 step(g,'play',index);assert.equal(g.snapshot().focus,0);
 const unused=fixture(['mirrorEmberSeed'],{energy:1},{draw:Array(9).fill('basicWard')});step(unused,'play',0);step(unused,'endTurn');assert.equal(unused.snapshot().focus,4);step(unused,'endTurn');assert.equal(unused.snapshot().focus,0);
});

test('same-state alternatives give both new cards a reason to be skipped',()=>{
 const small=fixture(['iceLanternWard','frostWard'],{origin:'storm',energy:2});assert.equal(small.previewCard(0).actualBlock,3);assert.equal(small.previewCard(1).actualBlock,5);assert.equal(small.previewCard(0).actualWeak,1);assert.equal(small.previewCard(1).actualWeak,2);
 const rich=fixture(['iceLanternWard','frostWard'],{origin:'storm',energy:3,turn:2});
 const a=restore(rich.exportSave()),b=restore(rich.exportSave());step(a,'play',0);step(b,'play',1);assert(a.intent().hpLoss<b.intent().hpLoss);
 const triple=fixture(['mirrorEmberSeed','mirrorLance'],{origin:'frost',energy:2,reflect:3,block:15},{battle:6});
 const held=restore(triple.exportSave()),used=restore(triple.exportSave());assert.equal(held.intent().reflected,9);step(used,'play',0);assert.equal(used.intent().reflected,0);assert.equal(used.snapshot().pendingFocus,4);
 assert.equal(triple.previewCard(0).actualDamage,5);assert.equal(triple.previewCard(1).actualDamage,10);
 // Lethal now wastes the reservation: basic attack preserves the seed's mana.
 const lethal=fixture(['mirrorEmberSeed','basicStrike'],{enemyHp:3,energy:2});step(lethal,'play',1);assert.equal(lethal.snapshot().phase,'victory');assert.equal(lethal.snapshot().energy,1);
});

test('new rewards follow acquisition, actual next battle use, later evolution, and upgraded use',()=>{
 for(const id of ids){let g;
  for(let seed=1;seed<=256&&!g;seed++){const c=restore(base(2));win(c);const save=plain(c.exportSave());save.rngState=seed;c.restoreSave(save);step(c,'openReward');if(c.rewardOptions().includes(id))g=c;}
  assert(g,id);step(g,'chooseReward',id);step(g,'chooseSanctuary','rest');step(g,'nextBattle');
  let index=g.snapshot().hand.indexOf(id);assert(index>=0);step(g,'play',index);win(g);step(g,'openReward');step(g,'chooseReward',null);step(g,'chooseChapter','library');step(g,'nextBattle');
  win(g);step(g,'openReward');step(g,'chooseReward',null);step(g,'chooseSanctuary','evolve');step(g,'evolve',id);step(g,'nextBattle');
  index=g.snapshot().hand.indexOf(id+'+');assert(index>=0);step(g,'play',index);assert.equal(g.exportSave().version,5);
 }
});

test('main 4.21 definitions are unchanged and old open rewards/legacy RNG still roundtrip',()=>{
 const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/astral-v421-two-card-baseline.json',import.meta.url))),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 assert.equal(hash(plain(Object.fromEntries(Object.entries(engine.CARDS).filter(([id])=>!ids.includes(id))))),baseline.cardsSha256);
 for(const row of baseline.rows){const g=restore(row.save);assert(!g.rewardOptions().some(id=>ids.includes(id)));step(g,'chooseReward',null);assert.equal(hash(g.exportSave()),row.afterSkipSha256);}
});
