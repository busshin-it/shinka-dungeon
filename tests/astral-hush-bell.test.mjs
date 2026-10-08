import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createHash} from 'node:crypto';
import {engine as E,fixture,plain,step,base,restore,win,advance} from './helpers/restitch-fixtures.mjs';
import {validateSet} from '../tools/astral-card-production.mjs';
const ids=['hushNeedle','bellUnbind'],read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function bell(hand=[],changes={}){return fixture(hand,{route2:'wind',chapter2Encounter:'hushBell',enemyId:'hushBell',enemyMaxHp:72,enemyHp:72,maxHp:66,hp:66,insight:false,turn:2,...changes},{battle:4});}

test('small set is exactly two cards, one current-only enemy and no save fields',()=>{
 const spec=JSON.parse(read('design/production/hush-bell-cards.json'));assert.equal(validateSet(spec,{stage:'release'}).scenarios,6);
 const def=JSON.parse(read('design/production/hush-bell-enemy.json'));assert.deepEqual(plain(E.CURRENT_ENEMIES.hushBell),def.definition);
 assert.equal(Object.keys(E.CARDS).length,63);for(const ruleset of ['classic','growth-v1'])assert.equal(E.enemiesFor({ruleset}).hushBell,undefined);
 const g=E.createGame(E.seededRandom(424));assert.deepEqual(plain(g.snapshot().chapter2Options),{library:'starScaleGuard',wind:'hushBell'});assert.equal(g.exportSave().version,5);
 const old=JSON.parse(read('tests/fixtures/astral-v421-hush-baseline.json'));assert.deepEqual(Object.keys(g.snapshot()).sort(),Object.keys(old.rows[0].save.state).sort().filter(k=>k!=='earlyRemoval'&&k!=='ruleset').concat(['earlyRemoval','ruleset']).sort());
});
test('weakness threshold 1/2/3 changes hit count before guard and reflects only actual hits',()=>{
 for(const weaken of [0,1,2,3,5,6])for(const block of [0,3,15])for(const reflect of [0,2,6]){
  const g=bell([],{weaken,block,reflect}),saved=plain(g.exportSave()),a=g.intent();const hits=weaken>=2?1:3,perHit=Math.max(0,5-weaken);
  assert.equal(a.hits,hits);assert.equal(a.perHit,perHit);assert.equal(a.damage,hits*perHit);assert.equal(a.hpLoss,Math.max(0,hits*perHit-block));assert.equal(a.reflected,hits*reflect);assert.equal(a.weakHitConditionMet,weaken>=2);assert.deepEqual(plain(g.exportSave()),saved);
  step(g,'endTurn');assert.equal(g.snapshot().hp,saved.state.hp-a.hpLoss);assert.equal(g.snapshot().enemyHp,saved.state.enemyHp-a.reflected);assert.equal(g.snapshot().weaken,0);
 }
});
test('recover preserves weakness, next single hit ignores hit-count rule and clears weakness',()=>{
 const g=bell(['quietComet'],{turn:1,weaken:2,reflect:5});assert.equal(g.previewCard(0).recoverCondition,true);step(g,'endTurn');assert.equal(g.snapshot().weaken,2);assert.equal(g.snapshot().reflect,0);assert.equal(g.intent().hits,1);step(g,'endTurn');assert.equal(g.intent().hits,1);assert.equal(g.intent().perHit,14);assert.equal(g.intent().weakHitThreshold,undefined);
});
test('consuming weakness restores three hits; thaw guard and reflection produce opposing choices',()=>{
 const kept=bell(['rimeThaw'],{weaken:2}),spent=restore(kept.exportSave());step(spent,'play',0);assert.equal(kept.intent().hpLoss,3);assert.equal(spent.intent().hpLoss,5);assert.equal(spent.intent().hits,3);
 const reflected=bell(['bellUnbind'],{weaken:2,reflect:7,block:15});const before=reflected.intent();step(reflected,'play',0);assert.equal(before.reflected,7);assert.equal(reflected.intent().reflected,21);assert.equal(reflected.intent().hpLoss,0);assert.equal(reflected.snapshot().pendingFocus,4);
});
test('Needle normal payment boundary and zero-cost evolution change timing; insufficient payment is atomic',()=>{
 for(const suffix of ['', '+'])for(const energy of [0,1,2,5])for(const origin of ['frost','storm','mirror']){
  const c=E.card('hushNeedle'+suffix),g=bell(['hushNeedle'+suffix],{energy,origin}),before=plain(g.exportSave()),p=g.previewCard(0);assert.equal(c.cost,suffix?0:1);assert.equal(p.actualDamage,suffix?4:3);assert.equal(p.actualWeak,energy===c.cost?2:0);assert.equal(p.actualReflect,2);
  if(energy<c.cost){assert.equal(g.play(0),false);assert.deepEqual(plain(g.exportSave()),before);}else{step(g,'play',0);assert.equal(g.snapshot().energy,energy-c.cost);assert.equal(g.snapshot().weaken,p.actualWeak);assert.equal(g.snapshot().reflect,p.actualReflect);assert.equal(g.intent().hits,p.actualWeak>=2?1:3);}
 }
});
test('Needle order with Charge, Spark and ice makes empty mana a choice instead of a guarantee',()=>{
 const a=bell(['charge','hushNeedle'],{energy:1});step(a,'play',0);step(a,'play',0);assert.equal(a.snapshot().weaken,0);assert.equal(a.snapshot().energy,1);
 const b=bell(['hushNeedle','charge','spark'],{energy:1});step(b,'play',0);assert.equal(b.snapshot().weaken,2);assert.equal(b.previewCard(1).actualDamage,6);step(b,'play',0);assert.equal(b.snapshot().weaken,2);assert.equal(b.previewCard(0).actualDamage,2);
 const c=bell(['hushNeedle+','ice'],{energy:1,origin:'frost'});step(c,'play',0);assert.equal(c.snapshot().weaken,0);step(c,'play',0);assert.equal(c.snapshot().weaken,3);assert.equal(c.intent().hits,1);
});
test('Unbind normal/evolved consume all weakness, reserve future attack and add guard only after evolution',()=>{
 for(const suffix of ['', '+'])for(const weaken of [0,1,3,9])for(const energy of [0,1,2]){
  const g=bell(['bellUnbind'+suffix],{energy,weaken,origin:'mirror'}),before=plain(g.exportSave()),p=g.previewCard(0);assert.equal(p.actualDamage,(suffix?5:2)+(weaken?6:0));assert.equal(p.actualNextFocus,suffix?6:4);assert.equal(p.actualBlock,suffix?3:0);
  if(!energy){assert.equal(g.play(0),false);assert.deepEqual(plain(g.exportSave()),before);continue;}
  step(g,'play',0);assert.equal(g.snapshot().weaken,0);assert.equal(g.snapshot().block,suffix?3:0);assert.equal(g.snapshot().reflect,suffix?2:0);assert.equal(g.snapshot().pendingFocus,suffix?6:4);assert.equal(g.intent().hits,3);
 }
});
test('Omen before Unbind keeps threshold damage; Letter+Unbind reservations combine, first attack only and expire',()=>{
 const a=bell(['frostOmen','bellUnbind'],{weaken:3,energy:2});assert.equal(a.previewCard(0).actualDamage,8);step(a,'play',0);step(a,'play',0);assert.equal(a.snapshot().pendingFocus,7);
 const b=bell(['bellUnbind','frostOmen'],{weaken:3,energy:2});step(b,'play',0);assert.equal(b.previewCard(0).actualDamage,3);step(b,'play',0);
 for(const suffix of ['', '+']){const g=fixture(['starFrostLetter','bellUnbind'+suffix],{energy:2,origin:'mirror'},{draw:['bolt','basicStrike',...Array(6).fill('basicWard')]});step(g,'play',0);step(g,'play',0);step(g,'endTurn');assert.equal(g.snapshot().focus,suffix?10:8);assert.equal(g.previewCard(0).actualDamage,suffix?24:22);step(g,'play',1);assert.equal(g.previewCard(0).actualDamage,14);step(g,'endTurn');assert.equal(g.snapshot().focus,0);}
 const unused=bell(['bellUnbind'],{turn:1,weaken:2});step(unused,'play',0);step(unused,'endTurn');assert.equal(unused.snapshot().focus,4);step(unused,'endTurn');assert.equal(unused.snapshot().focus,0);
});
test('bounded same-state comparisons retain reasons to skip the new cards',()=>{
 const raw=fixture(['hushNeedle','ebbArrow'],{energy:2});assert.equal(raw.previewCard(0).actualWeak,0);assert.equal(raw.previewCard(0).actualDamage,3);assert.equal(raw.previewCard(1).actualDamage,5);
 const zero=fixture(['hushNeedle+','spark+'],{energy:0});assert.equal(zero.previewCard(0).actualDamage,4);assert.equal(zero.previewCard(1).actualDamage,7);
 const lethal=bell(['bellUnbind','shatter'],{enemyHp:10,weaken:2,energy:1});assert.equal(lethal.previewCard(0).actualDamage,8);assert.equal(lethal.previewCard(1).actualDamage,13);step(lethal,'play',1);assert.equal(lethal.snapshot().phase,'victory');
});
test('future and route/reward text carry hit condition, remain pure and never pretend reduced attack is rest',()=>{
 const g=bell(['quietComet'],{turn:1,weaken:5}),before=plain(g.exportSave()),f=plain(g.futureIntents());assert.equal(f[0].hits,3);assert.equal(f[0].weakHitThreshold,2);assert.equal(f[0].weakHits,1);assert.match(f[0].detail,/弱体2以上で1撃/);assert.match(E.enemyPattern('hushBell',g.snapshot()),/弱体2以上で1撃/);assert.deepEqual(plain(g.exportSave()),before);
 const source=read('v4-1/planning-game.js'),ctx={};vm.runInNewContext(source.match(/  const futurePower = [^\n]+/)[0]+';globalThis.f=futurePower;',ctx);vm.runInNewContext(source.match(/  const compactFuturePower = [^\n]+/)[0]+';globalThis.c=compactFuturePower;',ctx);assert.equal(ctx.f(f[0]),'5×3〔弱体2以上で1撃〕');assert.equal(ctx.c(f[0]),'5×3〔弱体2:1撃〕');step(g,'endTurn');assert.equal(g.intent().damage,0);assert.equal(g.previewCard(g.snapshot().hand.indexOf('quietComet'))?.recoverCondition||false,false);
});
test('reflection early lethal and simultaneous defeat use only actually resolved hits',()=>{
 for(const [hp,phase]of [[10,'victory'],[4,'defeat']]){const g=bell([],{hp,enemyHp:2,reflect:2,weaken:1}),a=g.intent();assert.equal(a.resolvedHits,1);assert.equal(a.reflected,2);step(g,'endTurn');assert.equal(g.snapshot().phase,phase);assert.equal(g.snapshot().stats.reflected,2);}
});
test('old main cards/upgrades/enemies and 24 pinned next operations remain byte-exact',()=>{
 const baseline=JSON.parse(read('tests/fixtures/astral-v421-hush-baseline.json'));for(const [id,c]of Object.entries(baseline.cards))assert.deepEqual(plain(E.CARDS[id]),c);for(const [id,c]of Object.entries(baseline.upgrades))assert.deepEqual(plain(E.card(id+'+')),c);for(const [id,e]of Object.entries(baseline.currentEnemies))assert.deepEqual(plain(E.CURRENT_ENEMIES[id]),e);
 for(const row of baseline.rows){const g=restore(row.save);step(g,row.command,...(row.args||[]));assert.equal(hash(g.exportSave()),row.afterSha256);}
 for(const ruleset of ['classic','growth-v1']){const g=E.createGame(E.seededRandom(9),{ruleset});const save=plain(g.exportSave());save.state.chapter2Options.wind='hushBell';assert.equal(g.restoreSave(save),false);}
});
test('actual rewards acquire, use, later evolve and use both cards through saved transitions',()=>{
 for(const id of ids){let g;for(let seed=1;seed<=256&&!g;seed++){const trial=restore(base(2));win(trial);const saved=plain(trial.exportSave());saved.rngState=seed;assert(trial.restoreSave(saved));trial.openReward();if(trial.rewardOptions().includes(id))g=trial;}assert(g,id);step(g,'chooseReward',id);step(g,'chooseSanctuary','rest');step(g,'nextBattle');let index=g.snapshot().hand.indexOf(id);assert(index>=0);step(g,'play',index);win(g);step(g,'openReward');step(g,'chooseReward',null);step(g,'chooseChapter','wind');step(g,'nextBattle');assert.equal(g.snapshot().enemyId,'hushBell');win(g);step(g,'openReward');step(g,'chooseReward',null);step(g,'chooseSanctuary','evolve');step(g,'evolve',id);step(g,'nextBattle');index=g.snapshot().hand.indexOf(id+'+');assert(index>=0);step(g,'play',index);assert(g.snapshot().deck.includes(id+'+'));}
});
test('three dedicated art JOBs match local images, safe HTML art keys and distribution list',()=>{
 const meta=JSON.parse(read('design/production/hush-bell-art-jobs.json')),files=JSON.parse(read('tools/astral-files.json')),html=read('v4-1/planning.html');assert.equal(meta.jobs.length,3);assert.equal(new Set(meta.jobs.map(j=>j.path)).size,3);assert.equal(new Set(meta.jobs.map(j=>j.generation_id)).size,3);
 for(const j of meta.jobs){assert.equal(j.status,'integrated_candidate');assert.equal(j.attempts,1);assert.equal(j.aspect_ratio,'2:3');assert.match(j.prompt,/Gothic silhouette puppet/);assert.match(j.negative,/card frame/);assert(files.includes('./assets/'+j.filename));const bytes=fs.readFileSync(new URL('../'+j.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),j.sha256);assert.equal(bytes.toString('ascii',8,12),'WEBP');assert(html.includes(`data-${j.type==='card'?'card-art':'art'}="${j.game_key}" src="./assets/${j.filename}" alt=""`));}
 assert(meta.jobs[2].alpha_check.zero_fraction>0.3);assert(meta.jobs[2].alpha_check.corner_values.every(v=>v===0));
});
test('compact current intent keeps the hit condition and catalog reports the new evolution effect',async()=>{
 const source=read('v4-1/planning-game.js');for(const weaken of [0,2]){const g=bell([],{weaken}),ctx={s:g.snapshot(),e:E.CURRENT_ENEMIES.hushBell,a:g.intent()};vm.runInNewContext(source.match(/const currentMove=.*?(?=;\$\('#intentText'\))/)[0]+';globalThis.result=compactIntent;',ctx);assert.match(ctx.result,/弱体2で1撃/);assert.equal(ctx.result.includes('○'),weaken===2);}
 const {execFileSync}=await import('node:child_process');const catalog=JSON.parse(execFileSync(process.execPath,['tools/astral-card-production.mjs','catalog'],{encoding:'utf8'}));assert.equal(catalog.find(c=>c.id==='bellUnbind').upgrade.block,3);assert.equal(catalog.find(c=>c.id==='hushNeedle').upgrade.cost,0);
});
test('current first reward and every legacy pool exclude both new cards; invalid new enemy pair is rejected',()=>{
 for(const ruleset of ['classic','growth-v1','growth-v2'])for(const battle of [1,2,3]){if(ruleset==='growth-v2'&&battle>1)continue;const g=restore(base(battle,ruleset));win(g);step(g,'openReward');assert(g.rewardOptions().every(id=>!ids.includes(id)));}
 const g=E.createGame(E.seededRandom(424)),saved=plain(g.exportSave()),bad=plain(saved);bad.state.chapter2Options.library='starDial';assert.equal(g.restoreSave(bad),false);assert.deepEqual(plain(g.exportSave()),saved);
});
