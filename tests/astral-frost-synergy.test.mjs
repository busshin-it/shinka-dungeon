import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadGame,validateSet,promptManifest} from '../tools/astral-card-production.mjs';

const {engine,format}=loadGame();
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const NEW=['rimeMirror','frostOmen'];
const ALL=NEW.flatMap(x=>[x,x+'+']);
const zones=s=>[...s.hand,...s.draw,...s.discard,...s.exhaust];
const sorted=a=>[...a].sort();
function restore(save){const g=engine.createGame();assert.equal(g.restoreSave(plain(save)),true);assert.deepEqual(plain(g.exportSave()),plain(save));return g;}
function step(g,method,...args){const copy=restore(g.exportSave());assert.equal(g[method](...args),true,method);assert.equal(copy[method](...args),true);assert.deepEqual(plain(g.exportSave()),plain(copy.exportSave()));restore(g.exportSave());if(['battle','victory','defeat'].includes(g.snapshot().phase))assert.deepEqual(sorted(zones(g.snapshot())),sorted(g.snapshot().deck));}
const bases=new Map();
function win(g){const save=plain(g.exportSave()),s=save.state;Object.assign(s,{hp:s.maxHp,enemyHp:1,energy:5,block:0,focus:0,reflect:0,weaken:0,pendingBlock:0,pendingFocus:0,turnLastAttack:0,prevLastAttack:0,prevEndEmpty:false,usedExhaustThisTurn:false,turnDamage:0,spellCount:0,interrupted:false,flags:{}});s.draw=[...s.deck];s.hand=s.draw.splice(s.draw.findIndex(x=>engine.card(x).isAttack),1);s.discard=[];s.exhaust=[];assert(g.restoreSave(save));step(g,'play',0);}
function base(battle=2,ruleset='growth-v2'){
 const key=battle+'/'+ruleset;if(bases.has(key))return plain(bases.get(key));
 const g=engine.createGame(engine.seededRandom(918),{ruleset});
 // Pin the previous saved encounter for historical three-hit/card regressions.
 const pinned=plain(g.exportSave());pinned.state.chapter2Options.library='starDial';assert(g.restoreSave(pinned));g.start();
 for(let b=1;b<battle;b++){win(g);g.openReward();g.chooseReward(null);if(b===1)g.chooseRoute('moon');else if(b===3)g.chooseChapter('library');else if(b===5)g.chooseCamp('rest');else g.chooseSanctuary('rest');g.nextBattle();}
 const save=plain(g.exportSave());bases.set(key,save);return plain(save);
}
function fixture(hand,changes={},options={}){
 const save=base(options.battle||2,options.ruleset||'growth-v2'),s=save.state;
 Object.assign(s,{origin:'frost',turn:1,hp:s.maxHp,enemyHp:s.enemyMaxHp,energy:5,block:0,focus:0,reflect:0,weaken:0,pendingBlock:0,pendingFocus:0,turnLastAttack:0,prevLastAttack:0,prevEndEmpty:false,usedExhaustThisTurn:false,turnDamage:0,spellCount:0,interrupted:false,flags:{}},changes);
 s.hand=[...hand];s.discard=[...(options.discard||[])];s.exhaust=[...(options.exhaust||[])];s.draw=options.draw?[...options.draw]:Array(10-hand.length-s.discard.length-s.exhaust.length).fill('basicWard');
 while(zones(s).length<10)s.exhaust.push('meditate');s.deck=zones(s);assert.equal(s.deck.length,10);return restore(save);
}

const spec=JSON.parse(read('design/production/frost-synergy.json'));
const baseline=JSON.parse(read('tests/fixtures/astral-v416-frost-synthetic.json'));
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

test('two-card pilot exactly matches proposal, reuses reviewed art, and keeps strict scope validation',()=>{
 assert.deepEqual(validateSet(spec,{stage:'release'}),{set:'frost-synergy',stage:'release',cards:2,assets:2,scenarios:5});assert.deepEqual(promptManifest(spec).jobs,[]);
 assert.deepEqual(spec.cards.map(c=>c.id),NEW);assert(spec.assets.every(a=>a.status==='reuse'&&a.provenance.kind==='existing-project'));
 assert(read('v4-1/planning.html').includes('図鑑61'));
 const aliases=JSON.parse(read('design/production/reusable-art.json')).frost_synergy_aliases,html=read('v4-1/planning.html');
 for(const [id,original]of Object.entries(aliases)){const paths=[id,original].map(k=>html.match(new RegExp(`data-card-art="${k}" src="([^"]+)"`))[1]);assert.equal(paths[0],paths[1]);}
 for(const change of [s=>delete s.scope,s=>s.scope='anything',s=>s.cards.pop(),s=>s.assets.pop(),s=>{s.assets[0].kind='npc';s.assets[0].alt={mode:'text',text:'NPC'};}]){const bad=plain(spec);change(bad);assert.throws(()=>validateSet(bad,{stage:'draft'}));}
 const mirror=engine.card('rimeMirror+'),omen=engine.card('frostOmen+');assert.equal(mirror.weaken,3);assert.equal(mirror.reflect,3);assert.equal(omen.damage,6);assert.equal(omen.thresholdBonus,5);assert.equal(omen.nextFocus,5);
});
test('all 52 old base/upgraded definitions and 22 pinned v5 phase/next-action saves stay exact',()=>{
 assert.equal(baseline.sourceCommit,'f65d4dc545e590f9c28029b3bb3cd84cd6a2f27a');assert.equal(baseline.synthetic,true);assert.equal(Object.keys(engine.CARDS).length,61);
 for(const [id,c]of Object.entries(baseline.definitions.cards))assert.deepEqual(plain(engine.CARDS[id]),c,id);
 for(const [id,c]of Object.entries(baseline.definitions.upgrades))assert.deepEqual(plain(engine.card(id)),c,id);
 for(const {name,save,command,afterSha256}of baseline.fixtures){const g=restore(save);step(g,command[0],...command.slice(1));assert.equal(sha(g.exportSave()),afterSha256,name);}
});
test('2112 classic/growth-v1 future rewards and growth-v2 first rewards retain exact old RNG',()=>{
 const rows=[];
 for(const ruleset of ['classic','growth-v1','growth-v2'])for(const origin of ['frost','storm','mirror'])for(let seed=1;seed<=64;seed++){
  const g=engine.createGame(engine.seededRandom(seed),{ruleset});g.selectOrigin(origin);g.start();
  for(let battle=1;battle<=5;battle++){win(g);g.openReward();if(ruleset!=='growth-v2'||battle===1)rows.push([ruleset,origin,seed,battle,plain(g.rewardOptions()),g.exportSave().rngState]);g.chooseReward(null);if(battle===1)g.chooseRoute('moon');else if(battle===3)g.chooseChapter('library');else if(battle===5)g.chooseCamp('rest');else g.chooseSanctuary('rest');g.nextBattle();}
 }
 assert.equal(rows.length,baseline.rewardRows);assert.equal(sha(rows),baseline.rewardSha256);
});
test('all four variants have pure preview, atomic insufficient payment, unchanged schema and v5 replay',()=>{
 const keys=Object.keys(base().state).sort();
 for(const id of ALL){const g=fixture([id]);const before=plain(g.exportSave());g.previewCard(0);g.intent();g.futureIntents();assert.deepEqual(plain(g.exportSave()),before);assert.deepEqual(Object.keys(before.state).sort(),keys);step(g,'play',0);assert.equal(g.exportSave().version,5);
  const poor=fixture([id],{energy:0}),save=plain(poor.exportSave());assert.equal(poor.play(0),false);assert.deepEqual(plain(poor.exportSave()),save);
 }
});
test('Rime Mirror weakness max, reflection addition, frost once and mirror non-trigger cover both variants',()=>{
 for(const id of ['rimeMirror','rimeMirror+'])for(const origin of ['frost','storm','mirror'])for(const weaken of [0,1,2,3,4,5]){
  const c=engine.card(id),g=fixture([id,id,'frostOmen'],{origin,weaken,reflect:1,focus:2});const weak=c.weaken+(origin==='frost'?1:0);assert.equal(g.previewCard(0).actualWeak,weak);step(g,'play',0);assert.equal(g.snapshot().weaken,Math.max(weaken,weak));assert.equal(g.snapshot().reflect,1+c.reflect);assert.equal(g.snapshot().block,0);assert.equal(g.snapshot().focus,2);assert.equal(g.snapshot().spellCount,0);assert.equal(g.snapshot().flags.mirror,undefined);assert.equal(g.snapshot().flags.storm,undefined);assert.equal(g.previewCard(0).actualWeak,c.weaken);step(g,'play',0);assert.equal(g.snapshot().reflect,1+2*c.reflect);
 }
});
test('Rime Mirror resolves 1/2/3 hits, zero-damage reflection and early lethal without phantom hits',()=>{
 for(const id of ['rimeMirror','rimeMirror+'])for(const [battle,turn,hits]of [[1,1,1],[2,1,2],[4,2,3]]){
  const g=fixture([id],{origin:'storm',turn,block:30},{battle});step(g,'play',0);const before=g.snapshot(),intent=g.intent();assert.equal(intent.hits,hits);assert.equal(intent.hpLoss,0);assert.equal(intent.reflected,hits*engine.card(id).reflect);step(g,'endTurn');assert.equal(g.snapshot().hp,before.hp);assert.equal(g.snapshot().enemyHp,before.enemyHp-intent.reflected);assert.equal(g.snapshot().reflect,0);assert.equal(g.snapshot().weaken,0);
 }
 const lethal=fixture(['rimeMirror'],{enemyHp:2,hp:20},{battle:4});const save=plain(lethal.exportSave());save.state.turn=2;assert(lethal.restoreSave(save));step(lethal,'play',0);assert.equal(lethal.intent().resolvedHits,1);const hp=lethal.snapshot().hp,loss=lethal.intent().hpLoss;step(lethal,'endTurn');assert.equal(lethal.snapshot().phase,'victory');assert.equal(lethal.snapshot().hp,hp-loss);assert.equal(lethal.snapshot().stats.reflected,2);
});
test('Rime Mirror carries weakness through rest while reflection expires; frost bonus resets next turn',()=>{
 const g=fixture(['rimeMirror'],{turn:2},{battle:1});step(g,'play',0);assert.equal(g.intent().type,'recover');step(g,'endTurn');assert.equal(g.snapshot().weaken,3);assert.equal(g.snapshot().reflect,0);assert.equal(g.snapshot().flags.frost,undefined);step(g,'endTurn');assert.equal(g.snapshot().weaken,0);
});
test('Rime Mirror combos preserve or consume the intended resource in either order',()=>{
 const a=fixture(['rimeMirror','frostPierce'],{energy:3});step(a,'play',0);assert.equal(a.previewCard(0).actualDamage,17);step(a,'play',0);assert.equal(a.snapshot().weaken,3);assert.equal(a.snapshot().reflect,2);assert.equal(a.snapshot().energy,0);
 const b=fixture(['frostPierce','rimeMirror'],{energy:3});assert.equal(b.previewCard(0).actualDamage,10);step(b,'play',0);step(b,'play',0);assert.equal(b.snapshot().weaken,3);
 for(const id of ['rimeMirror','rimeMirror+']){const g=fixture([id,'mirrorLance'],{origin:'mirror',energy:2});step(g,'play',0);assert.equal(g.previewCard(0).actualDamage,4+engine.card(id).reflect*2);step(g,'play',0);assert.equal(g.snapshot().reflect,0);assert.equal(g.snapshot().weaken,engine.card(id).weaken);assert.equal(g.snapshot().flags.mirror,undefined);}
});
test('Frost Omen checks weakness 0/1/2/3/4 before play, does not consume it or trigger frost charm',()=>{
 for(const id of ['frostOmen','frostOmen+'])for(const weaken of [0,1,2,3,4]){
  const g=fixture([id,'rimeMirror'],{weaken,focus:2}),c=engine.card(id),damage=c.damage+2+(weaken>=3?5:0);assert.equal(g.previewCard(0).actualDamage,damage);assert.equal(g.previewCard(0).weakThresholdCondition,weaken>=3);step(g,'play',0);assert.equal(g.snapshot().weaken,weaken);assert.equal(g.snapshot().focus,0);assert.equal(g.snapshot().spellCount,1);assert.equal(g.snapshot().pendingFocus,c.nextFocus);assert.equal(g.snapshot().flags.frost,undefined);assert.equal(g.previewCard(0).actualWeak,3);
 }
});
test('Frost Omen order with Frost Nova and Shatter produces the proposal totals without consuming early',()=>{
 for(const [hand,weaken,total]of [[['frostNova','frostOmen'],0,12],[['frostOmen','frostNova'],0,7],[['frostOmen','shatter'],3,21],[['shatter','frostOmen'],3,16]]){const g=fixture(hand,{origin:'mirror',weaken,energy:2});const hp=g.snapshot().enemyHp;step(g,'play',0);step(g,'play',0);assert.equal(hp-g.snapshot().enemyHp,total);assert.equal(g.snapshot().pendingFocus,3);assert.equal(g.snapshot().weaken,hand.includes('shatter')?0:4);}
});
test('Frost Omen stacks reservations, reflection preserves focus, first hand attack consumes, unused expires',()=>{
 for(const id of ['frostOmen','frostOmen+']){const amount=engine.card(id).nextFocus,g=fixture([id,'rimeMirror'],{pendingFocus:2,energy:5,origin:'mirror'}, {draw:['bolt','basicStrike','basicWard','basicWard','basicWard','basicWard','basicWard','basicWard']});step(g,'play',0);step(g,'play',0);assert.equal(g.snapshot().pendingFocus,2+amount);step(g,'endTurn');assert.equal(g.snapshot().focus,2+amount);assert.equal(g.snapshot().pendingFocus,0);assert.equal(g.previewCard(0).base,'bolt');assert.equal(g.previewCard(0).actualDamage,14+2+amount);step(g,'play',0);assert.equal(g.snapshot().focus,0);assert.equal(g.previewCard(0).actualDamage,3);}
 const stacked=fixture(['frostOmen','frostOmen+']);step(stacked,'play',0);step(stacked,'play',0);assert.equal(stacked.snapshot().pendingFocus,8);step(stacked,'endTurn');assert.equal(stacked.snapshot().focus,8);step(stacked,'endTurn');assert.equal(stacked.snapshot().focus,0);
});
test('Omen participates in total, single and count interruptions; Mirror is never an attack',()=>{
 const total=fixture(['frostOmen'],{weaken:3},{battle:3});step(total,'play',0);assert.equal(total.snapshot().interrupted,false);const total2=fixture(['frostOmen','basicStrike'],{weaken:3},{battle:3});step(total2,'play',0);step(total2,'play',0);assert.equal(total2.snapshot().interrupted,false,'turn1 trial has no threshold');
 const single=fixture(['frostOmen'],{turn:3,weaken:3,focus:4},{battle:4});step(single,'play',0);assert.equal(single.snapshot().interrupted,true);assert.equal(single.snapshot().pendingFocus,3);
 const count=fixture(['rimeMirror','frostOmen','basicStrike','basicStrike'],{turn:2},{battle:4});step(count,'play',0);assert.equal(count.snapshot().spellCount,0);for(let i=0;i<3;i++)step(count,'play',0);assert.equal(count.snapshot().spellCount,3);assert.equal(count.snapshot().interrupted,true);
 const sum=fixture(['frostOmen','basicStrike'],{turn:2,weaken:3},{battle:3});step(sum,'play',0);assert.equal(sum.snapshot().interrupted,false);step(sum,'play',0);assert.equal(sum.snapshot().interrupted,true);
});
test('victory, defeat, reflection lethal and next battle clear all Omen reservations',()=>{
 const victory=fixture(['frostOmen'],{enemyHp:1});step(victory,'play',0);assert.equal(victory.snapshot().phase,'victory');assert.equal(victory.snapshot().pendingFocus,0);
 const defeat=fixture(['frostOmen'],{hp:1});step(defeat,'play',0);step(defeat,'endTurn');assert.equal(defeat.snapshot().phase,'defeat');assert.equal(defeat.snapshot().pendingFocus,0);
 const reflect=fixture(['frostOmen','rimeMirror'],{enemyHp:5});step(reflect,'play',0);step(reflect,'play',0);step(reflect,'endTurn');assert.equal(reflect.snapshot().phase,'victory');assert.equal(reflect.snapshot().pendingFocus,0);step(reflect,'openReward');step(reflect,'chooseReward',null);step(reflect,'chooseSanctuary','rest');step(reflect,'nextBattle');assert.equal(reflect.snapshot().focus,0);assert.equal(reflect.snapshot().pendingFocus,0);
});
test('both cards enter only growth-v2 battle2+ rewards with unique persistent offers',()=>{
 for(const ruleset of ['classic','growth-v1','growth-v2'])for(const battle of [1,2,4,5]){const seen=new Set(),g=restore(base(battle,ruleset));win(g);const saved=plain(g.exportSave());
  for(let seed=1;seed<=128;seed++){const s=plain(saved);s.rngState=seed;const x=restore(s);step(x,'openReward');const offers=plain(x.rewardOptions());assert.equal(new Set(offers).size,4);offers.filter(id=>NEW.includes(id)).forEach(id=>seen.add(id));const open=plain(x.exportSave());assert.equal(x.openReward(),false);assert.deepEqual(plain(x.exportSave()),open);assert.deepEqual(plain(restore(open).rewardOptions()),offers);}
  assert.deepEqual(sorted(seen),ruleset==='growth-v2'&&battle>=2?sorted(NEW):[]);
 }
});
test('both cards survive reward, guaranteed opening, upgrade, remove, and complete six-battle v5 replay',()=>{
 for(const id of NEW){let offered;for(let seed=1;seed<=512&&!offered;seed++){const g=restore(base(2));win(g);const save=plain(g.exportSave());save.rngState=seed;const x=restore(save);x.openReward();if(x.rewardOptions().includes(id))offered=x;}assert(offered);step(offered,'chooseReward',id);const raw=restore(offered.exportSave());step(raw,'chooseSanctuary','rest');step(raw,'nextBattle');assert(raw.snapshot().hand.includes(id));step(offered,'chooseSanctuary','evolve');step(offered,'evolve',id);step(offered,'nextBattle');assert(offered.snapshot().hand.includes(id+'+'));win(offered);step(offered,'openReward');step(offered,'chooseReward',null);step(offered,'chooseChapter','library');step(offered,'nextBattle');win(offered);step(offered,'openReward');step(offered,'chooseReward',null);step(offered,'chooseSanctuary','remove');step(offered,'removeCard',id+'+');step(offered,'nextBattle');assert(!zones(offered.snapshot()).includes(id+'+'));win(offered);step(offered,'openReward');step(offered,'chooseReward',null);step(offered,'chooseCamp','rest');step(offered,'nextBattle');win(offered);step(offered,'openReward');assert.equal(offered.snapshot().phase,'complete');assert.equal(offered.exportSave().version,5);}
});
test('eight synthetic UI fixtures retain v5 restoration and storage-isolated harness',()=>{
 const cases=JSON.parse(read('ui-qa/frost-synergy-fixtures.json'));assert.equal(Object.keys(cases).length,8);for(const value of Object.values(cases)){assert.equal(value.engine.version,5);restore(value.engine);}
 const html=read('ui-qa/frost-synergy.html');assert(html.includes('sandbox="allow-scripts"'));assert(!html.includes('allow-same-origin'));assert(html.includes("Object.defineProperty(window,'localStorage'"));assert(html.includes('script[src="./pwa.js"]'));assert(html.includes("link.removeAttribute('href')"));
});
test('Rime Mirror alone reduces each of three hits, including zero-clamp without block',()=>{
 for(const [id,origin,hp,enemyHp]of [['rimeMirror','mirror',54,68],['rimeMirror+','mirror',57,65],['rimeMirror','frost',57,68],['rimeMirror+','frost',60,65]]){
  const g=fixture([id],{origin,turn:2,block:0},{battle:4});assert.equal(g.snapshot().hp,60);assert.equal(g.snapshot().enemyHp,74);step(g,'play',0);assert.equal(g.intent().hpLoss,60-hp);assert.equal(g.intent().reflected,74-enemyHp);step(g,'endTurn');assert.equal(g.snapshot().hp,hp);assert.equal(g.snapshot().enemyHp,enemyHp);
 }
});
