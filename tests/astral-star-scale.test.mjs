import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {loadEngine} from '../tools/astral-growth-balance.mjs';
const E=loadEngine(),p=x=>JSON.parse(JSON.stringify(x));
const read=x=>fs.readFileSync(new URL('../'+x,import.meta.url),'utf8');
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const old=JSON.parse(read('tests/fixtures/astral-v417-enemy-synthetic.json'));
const zones=s=>[...s.hand,...s.draw,...s.discard,...s.exhaust];
function restore(save){const g=E.createGame();assert.equal(g.restoreSave(p(save)),true);assert.deepEqual(p(g.exportSave()),p(save));return g;}
function step(g,name,...args){const copy=restore(g.exportSave());assert.equal(g[name](...args),true,name);assert.equal(copy[name](...args),true);assert.deepEqual(p(g.exportSave()),p(copy.exportSave()));restore(g.exportSave());}
function win(g){const save=p(g.exportSave()),s=save.state;Object.assign(s,{hp:s.maxHp,enemyHp:1,energy:5,block:0,focus:0,reflect:0,weaken:0,pendingBlock:0,pendingFocus:0,turnLastAttack:0,prevLastAttack:0,prevEndEmpty:false,usedExhaustThisTurn:false,turnDamage:0,spellCount:0,interrupted:false,flags:{}});s.draw=[...s.deck];s.hand=s.draw.splice(s.draw.findIndex(x=>E.card(x).isAttack),1);s.discard=[];s.exhaust=[];assert(g.restoreSave(save));step(g,'play',0);}
const bases=new Map();
function base(battle=4,route='library',ruleset='growth-v2'){
 const key=[battle,route,ruleset].join('/');if(bases.has(key))return p(bases.get(key));
 const g=E.createGame(E.seededRandom(418),{ruleset});g.start();
 for(let b=1;b<battle;b++){win(g);g.openReward();g.chooseReward(null);if(b===1)g.chooseRoute('moon');else if(b===3)g.chooseChapter(route);else if(b===5)g.chooseCamp('rest');else g.chooseSanctuary('rest');g.nextBattle();}
 bases.set(key,p(g.exportSave()));return p(g.exportSave());
}
function fixture(hand=[],changes={},options={}){const save=base(options.battle||4,options.route||'library',options.ruleset||'growth-v2'),s=save.state;Object.assign(s,{origin:'mirror',hp:s.maxHp,energy:5},changes);s.hand=[...hand];s.draw=Array(10-hand.length).fill('basicWard');s.discard=[];s.exhaust=[];s.deck=zones(s);return restore(save);}
function denySave(g,edit){const before=p(g.exportSave()),bad=p(before);edit(bad);assert.equal(g.restoreSave(bad),false);assert.deepEqual(p(g.exportSave()),before);}

test('one current enemy, all old card definitions and save shape remain exact',()=>{
 assert.deepEqual(p(E.ENEMIES),old.definitions.enemies);assert.deepEqual(p(E.GROWTH_ENEMIES),old.definitions.growthEnemies);assert.deepEqual(p(Object.fromEntries(Object.entries(E.CARDS).filter(([id])=>!['restitch','frostCrossing','starFrostLetter','stillMirror','afterglowWard','bankedStarBlade','rimeThaw','iceLanternWard','mirrorEmberSeed'].includes(id)))),old.definitions.cards);
 for(const [id,c]of Object.entries(old.definitions.upgrades))assert.deepEqual(p(E.card(id)),c);
 assert.equal(Object.keys(E.CURRENT_ENEMIES).length,Object.keys(E.GROWTH_ENEMIES).length+1);
 assert.equal(E.RUN_LENGTH,6);assert.equal(Object.keys(E.CARDS).length,63);
 const e=E.enemiesFor({ruleset:'growth-v2'}).starScaleGuard;
 assert.deepEqual(p(e),JSON.parse(read('design/production/star-scale-guard.json')).definition);
 assert.equal(e.art,'starDial');assert(read('v4-1/planning.html').includes('data-art="starDial"'));
 assert.equal(E.enemiesFor({ruleset:'growth-v1'}).starScaleGuard,undefined);
 assert.equal(E.enemiesFor({}).starScaleGuard,undefined);
 const g=E.createGame(E.seededRandom(418));assert.equal(g.snapshot().chapter2Options.library,'starScaleGuard');assert.equal(g.exportSave().version,5);
 assert.deepEqual(Object.keys(g.snapshot()).sort(),Object.keys(old.fixtures.find(x=>x.save.version===5).save.state).sort());
});
test('66 pinned v3/v4/v5 saves keep old enemy, options, history, next action and RNG exactly',()=>{
 assert.equal(old.fixtures.length,66);
 for(const {name,save,command,afterSha256}of old.fixtures){const g=restore(save);step(g,command[0],...command.slice(1));assert.equal(sha(g.exportSave()),afterSha256,`${save.version}/${name}`);}
 for(const ruleset of ['classic','growth-v1'])assert.equal(E.createGame(E.seededRandom(1),{ruleset}).snapshot().chapter2Options.library,'starDial');
});
test('2112 legacy and first-current reward selections and RNG remain exact after current-pool expansion',()=>{
 const rows=[];
 for(const ruleset of ['classic','growth-v1','growth-v2'])for(const origin of ['frost','storm','mirror'])for(let seed=1;seed<=64;seed++){
  const g=E.createGame(E.seededRandom(seed),{ruleset});g.selectOrigin(origin);g.start();
  for(let battle=1;battle<=5;battle++){win(g);g.openReward();if(ruleset!=='growth-v2'||battle===1)rows.push([ruleset,origin,seed,battle,p(g.rewardOptions()),g.exportSave().rngState]);g.chooseReward(null);if(battle===1)g.chooseRoute('moon');else if(battle===3)g.chooseChapter('library');else if(battle===5)g.chooseCamp('rest');else g.chooseSanctuary('rest');g.nextBattle();}
 }
 // V4.19 intentionally expands current battle2+ only; preserve the pinned legacy/first-reward baseline.
 const stable=JSON.parse(read('tests/fixtures/astral-v416-frost-synthetic.json'));
 assert.equal(rows.length,stable.rewardRows);assert.equal(sha(rows),stable.rewardSha256);
});
test('new runs have fixed encounter from intro; all three chapter routes preserve their own enemy',()=>{
 for(const route of ['library','wind','causeway']){const g=restore(base(4,route));assert.equal(g.snapshot().enemyId,{library:'starScaleGuard',wind:'bellSpirit',causeway:'tideStarSentinel'}[route]);assert.equal(g.snapshot().enemyMaxHp,{library:70,wind:76,causeway:72}[route]);step(g,'endTurn');}
});
test('unsupported enemy/ruleset/pair/history/HP changes are rejected atomically',()=>{
 const g=fixture();
 for(const edit of [s=>s.state.chapter2Options.wind='wind',s=>s.state.chapter2Options.library='starDial',s=>s.state.chapter2Encounter='starDial',s=>s.state.enemyId='starDial',s=>s.state.enemyMaxHp=71,s=>s.state.history[0].enemy='星秤の衛兵',s=>{s.version=4;s.state.ruleset='growth-v1';}])denySave(g,edit);
 for(const ruleset of ['classic','growth-v1']){const oldg=E.createGame(E.seededRandom(1),{ruleset});denySave(oldg,s=>s.state.chapter2Options.library='starScaleGuard');}
});
test('current and two future intents cycle across turns 1 through 6 without mutating state',()=>{
 const expected=['recover','bank','total'];
 for(let turn=1;turn<=6;turn++){const g=fixture([],{turn,block:20,weaken:2,energy:2}),before=p(g.exportSave());const current=g.intent(),future=p(g.futureIntents(3));assert.equal(current.type==='recover'?'recover':current.manaCondition||current.breakKind,expected[(turn-1)%3]);assert.equal(future.length,2);for(const [i,a]of future.entries()){assert.equal(a.type==='recover'?'recover':a.manaCondition||a.breakKind,expected[(turn+i)%3]);assert.equal(a.hpLoss,undefined);assert.equal(a.perHit,undefined);}assert.deepEqual(p(g.exportSave()),before);}
 const g=fixture(),future=p(g.futureIntents());assert.match(future[0].detail,/12→6/);assert.match(future[1].detail,/合計12で8/);assert.match(E.enemyPattern('starScaleGuard',g.snapshot()),/12→6/);
 assert.match(E.enemyPattern('tideStarSentinel',g.snapshot()),/14→6/);assert.match(E.enemyPattern('tideStarSentinel',g.snapshot()),/16→8/);
});
test('chapter cycle and normal/compact future text use the same values as execution',()=>{
 const source=read('v4-1/planning-game.js');assert.match(source,/const cycle=enemyPattern\(enemyId,s\)/);
 const ctx={};vm.runInNewContext(source.match(/  const futurePower = [^\n]+/)[0]+';globalThis.format=futurePower;',ctx);
 const g=fixture(),f=p(g.futureIntents());assert.equal(ctx.format(f[0]),'12〔終魔力2以上で6〕');assert.equal(ctx.format(f[1]),'18〔合計12で8〕');
 vm.runInNewContext(source.match(/  const compactFuturePower = [^\n]+/)[0]+';globalThis.compact=compactFuturePower;',ctx);assert.equal(ctx.compact(f[0]),'12〔魔力2↑:6〕');assert.equal(ctx.compact(f[1]),'18〔合計12:8〕');
 const oldFuture=fixture([],{turn:1},{ruleset:'growth-v1'}).futureIntents();assert.equal(ctx.compact(oldFuture[0]),'4×3〔札3:1×3〕');assert.equal(ctx.compact(oldFuture[1]),'18〔一撃12:8〕');
 assert.match(read('v4-1/journey-visual.js'),/const pair=s.chapter2Options/);
});
test('mana 0/1/2/3/5 resolves 12/12/6/6/6 before guard and weakness, matching telegraph',()=>{
 for(const energy of [0,1,2,3,5])for(const weaken of [0,2,12])for(const block of [0,3,20]){const g=fixture([],{turn:2,energy,weaken,block,reflect:2});const before=g.snapshot(),a=g.intent(),perHit=Math.max(0,(energy>=2?6:12)-weaken);assert.equal(a.perHit,perHit);assert.equal(a.hpLoss,Math.max(0,perHit-block));assert.equal(a.manaConditionMet,energy>=2);assert.match(a.detail,/12→6/);step(g,'endTurn');assert.equal(g.snapshot().hp,before.hp-a.hpLoss);assert.equal(g.snapshot().enemyHp,before.enemyHp-a.reflected);assert.equal(g.snapshot().weaken,0);assert.equal(g.snapshot().reflect,0);}
});
test('payment-time ferry block stays fixed while later plays re-evaluate enemy mana condition',()=>{
 const g=fixture(['starFerryWard','basicStrike','charge'],{turn:2,energy:3});step(g,'play',0);assert.equal(g.snapshot().block,10);assert.equal(g.intent().perHit,6);step(g,'play',0);assert.equal(g.snapshot().energy,1);assert.equal(g.snapshot().block,10);assert.equal(g.intent().perHit,12);assert.equal(g.intent().hpLoss,2);step(g,'play',0);assert.equal(g.snapshot().energy,2);assert.equal(g.snapshot().block,10);assert.equal(g.intent().perHit,6);assert.equal(g.intent().hpLoss,0);step(g,'endTurn');
});
test('cumulative chant threshold 11/12/13 is shared by actual damage and current intent',()=>{
 for(const damage of [11,12,13]){const g=fixture(['spark'],{turn:3,focus:damage-2,energy:2});step(g,'play',0);assert.equal(g.snapshot().turnDamage,damage);assert.equal(g.intent().breakKind,'total');assert.equal(g.intent().broken,damage>=12);assert.equal(g.intent().perHit,damage>=12?8:18);const before=g.snapshot(),a=g.intent();step(g,'endTurn');assert.equal(g.snapshot().hp,before.hp-a.hpLoss);assert.equal(g.snapshot().turnDamage,0);assert.equal(g.snapshot().interrupted,false);}
 for(const hand of [['ice','ice'],['basicStrike+','basicStrike+','spark']]){const g=fixture(hand,{turn:3,energy:5});for(let i=0;i<hand.length;i++)step(g,'play',0);assert.equal(g.snapshot().turnDamage,12);assert.equal(g.snapshot().interrupted,true);assert.equal(g.snapshot().stats.interrupts,1);}
});
test('reflection is not chant progress; blocked zero damage does not grant recover bonuses',()=>{
 const g=fixture(['rimeMirror','quietComet'],{turn:3,turnDamage:11,spellCount:1,block:20});step(g,'play',0);assert.equal(g.snapshot().spellCount,1);assert.equal(g.snapshot().turnDamage,11);assert.equal(g.intent().broken,false);assert.equal(g.intent().hpLoss,0);assert.equal(g.previewCard(0).recoverCondition,false);step(g,'endTurn');assert.equal(g.snapshot().stats.interrupts,0);assert.equal(g.snapshot().stats.reflected,2);assert.equal(g.snapshot().turnDamage,0);
});
test('rest deals and heals zero, preserves weakness but expires reflect and turn-local progress',()=>{
 const g=fixture(['rimeMirror','quietComet','quietScript'],{turn:1,enemyHp:40,energy:5});assert.equal(g.intent().heal,0);assert.equal(g.previewCard(1).actualDamage,20);assert.equal(g.previewCard(2).recoverCondition,true);step(g,'play',0);const before=g.snapshot();step(g,'endTurn');assert.equal(g.snapshot().hp,before.hp);assert.equal(g.snapshot().enemyHp,before.enemyHp);assert.equal(g.snapshot().weaken,2);assert.equal(g.snapshot().reflect,0);assert.equal(g.snapshot().spellCount,0);assert.equal(g.snapshot().turnDamage,0);
});
test('hand lethal skips the pending strike and preserves actual capped damage',()=>{
 const g=fixture(['bolt'],{turn:3,enemyHp:11,energy:2});const dealt=g.snapshot().stats.dealt;step(g,'play',0);assert.equal(g.snapshot().phase,'victory');assert.equal(g.snapshot().stats.dealt-dealt,11);assert.equal(g.snapshot().stats.taken,0);assert.equal(g.snapshot().stats.interrupts,0);const before=p(g.exportSave());assert.equal(g.endTurn(),false);assert.deepEqual(p(g.exportSave()),before);
});
test('reflection lethal resolves only the existing hit and simultaneous lethal is defeat',()=>{
 for(const [hp,result]of [[20,'victory'],[6,'defeat']]){const g=fixture([],{turn:2,hp,enemyHp:2,energy:2,reflect:2});const a=g.intent();assert.equal(a.resolvedHits,1);assert.equal(a.reflected,2);step(g,'endTurn');assert.equal(g.snapshot().phase,result);assert.equal(g.snapshot().stats.reflected,2);assert.equal(g.snapshot().wins,result==='victory'?4:3);}
});
test('new encounter and all later phases preserve saves, including completed history',()=>{
 const g=restore(base(4));for(let b=4;b<=6;b++){win(g);step(g,'openReward');if(b===6)break;step(g,'chooseReward',null);if(b===4)step(g,'chooseSanctuary','rest');else step(g,'chooseCamp','rest');step(g,'nextBattle');}assert.equal(g.snapshot().phase,'complete');assert.equal(g.snapshot().history[3].enemy,'星秤の衛兵');
});
test('eight display fixtures restore with their actual enemy and isolated storage/PWA harness',()=>{
 const fixtures=JSON.parse(read('ui-qa/star-scale-fixtures.json'));assert.equal(Object.keys(fixtures).length,8);for(const value of Object.values(fixtures))restore(value.engine);
 assert.equal(fixtures.savedOld.engine.state.chapter2Encounter,'starDial');assert.equal(fixtures.ready.engine.state.chapter2Encounter,'starScaleGuard');
 const html=read('ui-qa/star-scale.html');assert.match(html,/sandbox="allow-scripts"/);assert(!html.includes('allow-same-origin'));assert.match(html,/Object.defineProperty\(window,'localStorage'/);assert.match(html,/script\[src="\.\/pwa.js"\]/);assert.match(html,/removeAttribute\('href'\)/);
});
