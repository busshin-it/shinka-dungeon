import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {engine,fixture,plain,step,base,restore,win,advance} from './helpers/restitch-fixtures.mjs';
import {validateSet,loadGame} from '../tools/astral-card-production.mjs';
const {format}=loadGame();
test('Rime Thaw normal and evolved specification validates and rejects incomplete conversion definitions',()=>{
 const spec=JSON.parse(fs.readFileSync(new URL('../design/production/rime-thaw.json',import.meta.url)));assert.equal(validateSet(spec,{stage:'release'}).scenarios,6);
 for(const mutate of [s=>delete s.cards[0].base.weakBlockMultiplier,s=>delete s.cards[0].base.weakBlockCap,s=>s.cards[0].base.consumeWeak=false,s=>s.cards[0].base.damage=1,s=>s.cards[0].base.weaken=1]){const copy=plain(spec);mutate(copy);assert.throws(()=>validateSet(copy,{stage:'release'}),/weakness-to-block/);}
});
test('conversion reads existing weakness, caps bonus but consumes all, and failed payments remain atomic',()=>{
 for(const suffix of ['', '+'])for(const origin of ['frost','storm','mirror'])for(const weak of [0,1,2,3,4,5])for(const energy of [0,1,2]){
  const g=fixture(['rimeThaw'+suffix],{origin,weaken:weak,energy,block:2,focus:4,pendingBlock:3,pendingFocus:2}),before=plain(g.exportSave()),p=g.previewCard(0);
  const amount=(suffix?9:6)+Math.min(6,weak*2);assert.equal(p.actualBlock,amount);assert.equal(p.actualWeakBlockBonus,Math.min(6,weak*2));assert.equal(p.actualConsumedWeak,weak);assert.equal(p.isAttack,false);assert.equal(p.actualWeak,0);assert.deepEqual(plain(g.exportSave()),before);
  const text=format(p);assert(text.summary.includes('防御'+amount));assert(text.rules.includes('弱体'+weak+'をすべて消費'));assert(text.rules.includes('弱体なしで受ける'));
  if(!energy){assert.equal(g.play(0),false);assert.deepEqual(plain(g.exportSave()),before);continue;}
  step(g,'play',0);const s=g.snapshot();assert.equal(s.block,amount+2);assert.equal(s.weaken,0);assert.equal(s.energy,energy-1);assert.equal(s.spellCount,0);assert.equal(s.focus,4);assert.equal(s.pendingBlock,3);assert.equal(s.pendingFocus,2);assert.equal(s.enemyHp,before.state.enemyHp);assert(!s.flags.frost);assert(!s.flags.storm);assert.equal(s.reflect,origin==='mirror'?2:0);
  assert.deepEqual(Object.keys(s).sort(),Object.keys(before.state).sort());
 }
});
test('consume weakness before Omen loses its threshold bonus; Omen before conversion preserves both effects',()=>{
 for(const suffix of ['', '+'])for(const order of [false,true]){
  const g=fixture(['rimeThaw'+suffix,'frostOmen'],{origin:'mirror',weaken:3,energy:2});if(order){assert.equal(g.previewCard(1).actualDamage,8);step(g,'play',1);assert.equal(g.snapshot().weaken,3);step(g,'play',0);}else{step(g,'play',0);assert.equal(g.previewCard(0).actualDamage,3);step(g,'play',0);}
  assert.equal(g.snapshot().weaken,0);assert.equal(g.snapshot().block,suffix?15:12);assert.equal(g.snapshot().spellCount,1);assert.equal(g.snapshot().pendingFocus,3);
 }
});
test('new weakness can be reapplied after conversion and consecutive copies cannot reuse consumed weakness',()=>{
 const g=fixture(['rimeThaw','rimeThaw','ice'],{origin:'frost',weaken:3,energy:3});step(g,'play',0);assert.equal(g.previewCard(0).actualBlock,6);step(g,'play',0);assert.equal(g.snapshot().block,18);step(g,'play',0);assert.equal(g.snapshot().weaken,3);assert.equal(g.snapshot().flags.frost,true);
});
test('conversion helps a single hit but retaining weakness helps three hits; preview and resolution agree',()=>{
 for(const [battle,turn,better]of [[2,2,true],[6,1,false]]){
  const initial=fixture(['rimeThaw'],{origin:'frost',turn,weaken:5,energy:1},{battle});const kept=restore(initial.exportSave()),changed=restore(initial.exportSave());step(changed,'play',0);const a=kept.intent().hpLoss,b=changed.intent().hpLoss;assert(better?b<a:b>a);
  for(const g of [kept,changed]){const hp=g.snapshot().hp,predicted=g.intent().hpLoss;step(g,'endTurn');assert.equal(hp-g.snapshot().hp,predicted);}
 }
});
test('Moon charm activates only once and conversion does not consume accumulated reflection or pending effects',()=>{
 const g=fixture(['rimeThaw','guard'],{origin:'mirror',reflect:5,weaken:2,energy:2});step(g,'play',0);assert.equal(g.snapshot().reflect,7);assert.equal(g.previewCard(0).actualReflect,0);step(g,'play',0);assert.equal(g.snapshot().reflect,7);
});
test('4.20 old cards and old-rule offers/RNG remain identical, current first/open offers are protected',()=>{
 const baseline=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/astral-v420-rime-synthetic.json',import.meta.url))),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');assert.equal(baseline.sourceCommit,'9b7e0f49fc650935b23bca7dd1c0a9fef7214a93');
 for(const [id,c]of Object.entries(baseline.cards))assert.deepEqual(plain(engine.CARDS[id]),c);
 for(const [id,c]of Object.entries(baseline.upgrades))assert.deepEqual(plain(engine.card(id+'+')),c);
 const seen=new Set();for(const row of baseline.rows){
  const saved=plain(baseline.bases[row.ruleset+':'+row.battle]);saved.rngState=row.seed;const b=restore(saved);assert(b.openReward());const opened=plain(b.exportSave());
  if(row.ruleset!=='growth-v2'||row.battle===1){assert.equal(hash(opened),row.openedSha256);assert(!b.rewardOptions().includes('rimeThaw'));}else for(const id of b.rewardOptions())seen.add(id);
  // Reconstruct the independently recorded old open offer, including its old RNG.
  opened.state.rewardOffers=row.offers;opened.rngState=row.openRng;assert.equal(hash(opened),row.openedSha256);const oldOpen=restore(opened);assert.equal(hash(oldOpen.exportSave()),row.openedSha256);assert(oldOpen.chooseReward(null));assert.equal(hash(oldOpen.exportSave()),row.skippedSha256);
 }
 assert(seen.has('rimeThaw'));
});
test('new card can be acquired, evolved, used, removed, and restored with version 5',()=>{
 let g;for(let seed=1;seed<=512&&!g;seed++){const x=restore(base(2));win(x);const s=plain(x.exportSave());s.rngState=seed;x.restoreSave(s);x.openReward();if(x.rewardOptions().includes('rimeThaw'))g=x;}assert(g);step(g,'chooseReward','rimeThaw');const remove=restore(g.exportSave());step(remove,'chooseSanctuary','remove');step(remove,'removeCard','rimeThaw');step(remove,'nextBattle');assert(!remove.snapshot().deck.includes('rimeThaw'));
 step(g,'chooseSanctuary','evolve');step(g,'evolve','rimeThaw');step(g,'nextBattle');const index=g.snapshot().hand.indexOf('rimeThaw+');assert(index>=0);step(g,'play',index);assert.equal(g.exportSave().version,5);
});
test('ten isolated UI fixtures restore, including multi-hit, cap, upgrade, order and insufficient mana',()=>{
 const scenes=JSON.parse(fs.readFileSync(new URL('../ui-qa/rime-thaw-fixtures.json',import.meta.url)));assert.equal(Object.keys(scenes).length,10);for(const wrapped of Object.values(scenes)){assert.equal(wrapped.version,1);assert.equal(wrapped.seed,419);restore(wrapped.engine);}
 const html=fs.readFileSync(new URL('../ui-qa/rime-thaw.html',import.meta.url),'utf8');assert(html.includes('sandbox="allow-scripts"'));assert(!html.includes('allow-same-origin'));assert(html.includes("Object.defineProperty(window,'localStorage'"));assert(html.includes('rime-thaw-fixtures.json'));
});
