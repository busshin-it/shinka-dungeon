import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateSet,promptManifest} from '../tools/astral-card-production.mjs';
import {engine,format,plain,zones,restore,step,win,advance,base,fixture} from './helpers/restitch-fixtures.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sha=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const variants=['restitch','restitch+'];
const spec=JSON.parse(read('design/production/restitch.json'));

test('single-card pilot matches exact PR14 definition, evolved draw only, and reviewed reused art',()=>{
 assert.deepEqual(validateSet(spec,{stage:'release'}),{set:'restitch',stage:'release',cards:1,assets:1,scenarios:3});assert.deepEqual(promptManifest(spec).jobs,[]);
 assert.deepEqual(plain(engine.CARDS.restitch),{name:'綴じ直し',cost:1,recycleAttack:true,draw:1,exhaust:true,family:'focus',art:'restitch'});
 assert.equal(engine.card('restitch+').draw,2);assert.equal(engine.card('restitch+').cost,1);assert.equal(engine.card('restitch+').isAttack,false);assert.equal(Object.keys(engine.CARDS).length,55);
 assert.equal(spec.assets[0].sha256,sha(fs.readFileSync(new URL('../v4-1/assets/star-bookmark.webp',import.meta.url))));
 for(const change of [s=>delete s.scope,s=>s.scope='two-card-pilot',s=>s.scope='unknown',s=>s.cards.push(s.cards[0]),s=>s.assets.push(s.assets[0]),s=>s.assets[0].kind='npc',s=>s.cards[0].base.newRule=true]){const bad=plain(spec);change(bad);assert.throws(()=>validateSet(bad,{stage:'draft'}));}
});

test('recycle text follows effective draw, preserving every existing no-draw recycle card',()=>{
 for(const id of ['starBookmark','returnPage','frostRecall'])for(const suffix of ['','+']){const g=fixture([id+suffix],{}, {discard:['bolt+']});assert(format(g.previewCard(0)).rules.includes('今は引かない'));const before=g.snapshot();step(g,'play',0);assert.equal(g.snapshot().draw[0],'bolt+');assert.equal(g.snapshot().hand.length,before.hand.length-1);}
 for(const id of variants){const p=fixture([id],{}, {discard:['bolt+']}).previewCard(0),text=format(p);assert(text.rules.includes(`その後${p.actualDraw}枚引く`));assert(!text.rules.includes('今は引かない'));assert(text.summary.includes('雷撃＋'));assert(engine.card(id).text.indexOf('山札')<engine.card(id).text.indexOf('枚引く'));assert(format({...p,actualDraw:0}).rules.includes('今は引かない'));}
});

test('normal and upgraded preview are pure; insufficient mana and invalid indexes are atomic',()=>{
 for(const id of variants){const g=fixture([id],{energy:0},{discard:['bolt+']}),before=plain(g.exportSave());for(let i=0;i<3;i++){g.previewCard(0);g.intent();g.futureIntents();}assert.deepEqual(plain(g.exportSave()),before);for(const index of [0,-1,1,0.1,NaN])assert.equal(g.play(index),false);assert.deepEqual(plain(g.exportSave()),before);assert.equal(g.snapshot().usedExhaustThisTurn,false);}
});

test('latest discard attack skips support, keeps upgraded ID and duplicates, and is drawn before old top',()=>{
 for(const id of variants)for(const discard of [['bolt'],['bolt','guard'],['bolt','ice','guard'],['ice','bolt+','guard'],['bolt','bolt','guard']]){
  const g=fixture([id],{}, {discard,draw:['guard','focus']}),before=plain(g.exportSave()),target=[...discard].reverse().find(x=>engine.card(x).isAttack),index=discard.lastIndexOf(target);assert.equal(g.previewCard(0).recycleTargetId,target);step(g,'play',0);const s=g.snapshot();assert.deepEqual(plain(s.hand),id.endsWith('+')?[target,'guard']:[target]);assert.deepEqual(plain(s.discard),discard.filter((_,i)=>i!==index));assert.equal(s.draw[0],id.endsWith('+')?'focus':'guard');assert.equal(g.exportSave().rngState,before.rngState);assert.equal(s.exhaust.filter(x=>x===id).length,1);assert.equal(s.energy,4);assert.equal(s.usedExhaustThisTurn,true);
 }
});

test('empty discard or support-only discard still performs ordinary draw without acquiring a fake target',()=>{
 for(const id of variants)for(const discard of [[],['guard','focus']]){const g=fixture([id],{}, {discard,draw:['ice','guard']}),before=g.exportSave();assert.equal(g.previewCard(0).recycleTargetId,null);step(g,'play',0);assert.deepEqual(plain(g.snapshot().hand),id.endsWith('+')?['ice','guard']:['ice']);assert.deepEqual(plain(g.snapshot().discard),discard);assert.equal(g.exportSave().rngState,before.rngState);}
});

test('empty draw pile recycles first; evolved second draw reshuffles only remaining discard',()=>{
 const g=fixture(['restitch+'],{}, {discard:['guard','focus','bolt+'],draw:[]}),save=plain(g.exportSave());step(g,'play',0);assert.equal(g.snapshot().hand[0],'bolt+');assert(['guard','focus'].includes(g.snapshot().hand[1]));assert.equal(g.snapshot().draw.length,1);assert.equal(g.snapshot().discard.length,0);assert.notEqual(g.exportSave().rngState,save.rngState);assert(!g.snapshot().hand.includes('restitch+'));
 const normal=fixture(['restitch'],{}, {discard:['guard','focus','bolt+'],draw:[]}),rng=normal.exportSave().rngState;step(normal,'play',0);assert.deepEqual(plain(normal.snapshot().hand),['bolt+']);assert.equal(normal.exportSave().rngState,rng);
});

test('draw is capped by available cards, never by a new hand rule, and cannot redraw self or exhausted attacks',()=>{
 for(const id of variants)for(const discard of [[],['bolt+']]){const g=fixture([id],{}, {discard,draw:[],exhaust:['drain+']}),rng=g.exportSave().rngState;step(g,'play',0);assert.deepEqual(plain(g.snapshot().hand),discard);assert.equal(g.exportSave().rngState,rng);assert(g.snapshot().exhaust.includes('drain+'));assert.equal(zones(g.snapshot()).length,10);}
 const full=fixture(['restitch+',...Array(7).fill('guard')],{}, {discard:['ice'],draw:['bolt']});step(full,'play',0);assert.equal(full.snapshot().hand.length,9);assert.deepEqual(plain(full.snapshot().hand.slice(-2)),['ice','bolt']);
});

test('two copies spend two mana, exhaust independently and cannot duplicate the single returned attack',()=>{
 const g=fixture(['restitch','restitch+'],{energy:2},{discard:['bolt+'],draw:['guard','focus']}),rng=g.exportSave().rngState;step(g,'play',0);assert.equal(g.previewCard(0).recycleTargetId,null);step(g,'play',0);assert.equal(g.snapshot().energy,0);assert.deepEqual(plain(g.snapshot().hand),['bolt+','guard','focus']);assert.equal(g.snapshot().exhaust.filter(x=>variants.includes(x)).length,2);assert.equal(g.exportSave().rngState,rng);
});

test('attack then restitch then same attack realizes proposal order and counts only two attacks',()=>{
 const g=fixture(['ice','restitch'],{energy:3,origin:'mirror'});step(g,'play',0);assert.equal(g.previewCard(0).recycleTargetId,'ice');step(g,'play',0);assert.equal(g.snapshot().spellCount,1);assert.equal(g.snapshot().weaken,2);step(g,'play',0);assert.equal(g.snapshot().enemyMaxHp-g.snapshot().enemyHp,12);assert.equal(g.snapshot().spellCount,2);assert.equal(g.snapshot().energy,0);assert.equal(g.snapshot().weaken,2);
 const reverse=fixture(['restitch','ice'],{energy:3},{draw:['guard']});assert.equal(reverse.previewCard(0).recycleTargetId,null);step(reverse,'play',0);assert.deepEqual(plain(reverse.snapshot().hand),['ice','guard']);
});

test('replay or ash defense is a real mana tradeoff, with no own attack/block/charm/forge trigger',()=>{
 const g=fixture(['ice','restitch','ashWard'],{energy:3,origin:'mirror',focus:2},{discard:[]});step(g,'play',0);const before=plain(g.exportSave());assert.equal(g.previewCard(0).actualBlock,0);assert.equal(g.previewCard(0).actualDamage,0);step(g,'play',0);assert.equal(g.snapshot().flags.mirror,undefined);assert.equal(g.snapshot().spellCount,1);assert.equal(g.previewCard(0).actualBlock,8);step(g,'play',0);assert.equal(g.snapshot().block,8);assert.equal(g.snapshot().reflect,4);assert.equal(g.play(0),false);assert.equal(g.snapshot().energy,0);
 const replay=restore(before);step(replay,'play',0);step(replay,'play',1);assert.equal(replay.snapshot().block,0);assert.equal(replay.snapshot().energy,0);assert.equal(replay.play(0),false);
 for(const origin of ['frost','storm','mirror']){const x=fixture(['restitch','ashStudy'],{origin,focus:4,forge:false});assert.equal(x.previewCard(1).exhaustCondition,false);step(x,'play',0);assert.equal(x.snapshot().focus,4);assert.deepEqual(plain(x.snapshot().flags),{});assert.equal(x.previewCard(0).exhaustCondition,true);step(x,'play',0);assert.equal(x.snapshot().block,4);assert.equal(x.snapshot().reflect,2);}
});

test('paid basic and 2-cost replay still need separate mana; enemy lethal forbids subsequent draw or play',()=>{
 for(const target of ['basicStrike','bolt']){const cost=target==='bolt'?2:1;const g=fixture(['restitch'],{energy:cost},{discard:[target]});step(g,'play',0);const before=plain(g.exportSave());assert.equal(g.play(0),false);assert.deepEqual(plain(g.exportSave()),before);}
 const bolt=fixture(['bolt','restitch'],{energy:5,origin:'mirror'});step(bolt,'play',0);step(bolt,'play',0);step(bolt,'play',0);assert.equal(bolt.snapshot().energy,0);assert.equal(bolt.snapshot().enemyMaxHp-bolt.snapshot().enemyHp,28);
 for(const hp of [1,6]){const g=fixture(['ice','restitch'],{enemyHp:hp,energy:3});step(g,'play',0);assert.equal(g.snapshot().phase,'victory');const save=plain(g.exportSave());assert.equal(g.play(0),false);assert.deepEqual(plain(g.exportSave()),save);assert.equal(g.snapshot().stats.played.restitch,undefined);}
 const lethal=fixture(['restitch+'],{enemyHp:1},{discard:['ice'],draw:['guard']});step(lethal,'play',0);step(lethal,'play',0);assert.equal(lethal.snapshot().phase,'victory');assert.equal(lethal.snapshot().usedExhaustThisTurn,false);assert.equal(lethal.snapshot().stats.dealt,2);
});

test('restitch never supplies attack count itself; repeat attack advances a real count chant',()=>{
 const g=fixture(['chain','restitch'],{turn:2,energy:3,chapter2Options:{library:'starDial',wind:'bellSpirit'},chapter2Encounter:'starDial',enemyId:'starDial',enemyMaxHp:74,enemyHp:74},{battle:4});step(g,'play',0);assert.equal(g.intent().perHit,3);step(g,'play',0);assert.equal(g.intent().perHit,3);step(g,'play',0);assert.equal(g.intent().perHit,2);assert.equal(g.snapshot().spellCount,2);
});

test('only current battle2+ future rewards include restitch; offers persist with unique IDs and same schema',()=>{
 for(const ruleset of ['classic','growth-v1','growth-v2'])for(const battle of [1,2,4,5]){const g=restore(base(battle,ruleset));win(g);const source=g.exportSave();let seen=false;for(let seed=1;seed<=128;seed++){const save=plain(source);save.rngState=seed;const x=restore(save);step(x,'openReward');const offers=plain(x.rewardOptions());assert.equal(new Set(offers).size,4);seen ||= offers.includes('restitch');const open=plain(x.exportSave());assert.equal(x.openReward(),false);assert.deepEqual(plain(x.exportSave()),open);assert.deepEqual(plain(restore(open).rewardOptions()),offers);}assert.equal(seen,ruleset==='growth-v2'&&battle>=2);}
});

test('acquire, opening hand, evolve, remove and next battles preserve real v5 save provenance',()=>{
 let g;for(let seed=1;seed<=128&&!g;seed++){const x=restore(base(2));win(x);const save=plain(x.exportSave());save.rngState=seed;const t=restore(save);t.openReward();if(t.rewardOptions().includes('restitch'))g=t;}assert(g);step(g,'chooseReward','restitch');const plainReward=restore(g.exportSave());step(plainReward,'chooseSanctuary','rest');step(plainReward,'nextBattle');assert(plainReward.snapshot().hand.includes('restitch'));step(g,'chooseSanctuary','evolve');step(g,'evolve','restitch');step(g,'nextBattle');assert(g.snapshot().hand.includes('restitch+'));win(g);step(g,'openReward');step(g,'chooseReward',null);step(g,'chooseChapter','library');step(g,'nextBattle');win(g);step(g,'openReward');step(g,'chooseReward',null);step(g,'chooseSanctuary','remove');step(g,'removeCard','restitch+');step(g,'nextBattle');assert(!zones(g.snapshot()).includes('restitch+'));assert(g.snapshot().removed.includes('restitch+'));assert.equal(g.exportSave().version,5);
});

test('eight v5 synthetic UI fixtures restore and remain isolated from real saves',()=>{
 const data=JSON.parse(read('ui-qa/restitch-fixtures.json'));assert.equal(Object.keys(data).length,8);for(const value of Object.values(data)){assert.equal(value.engine.version,5);restore(value.engine);}
 const html=read('ui-qa/restitch.html');for(const text of ['sandbox="allow-scripts"',"Object.defineProperty(window,'localStorage'",'script[src="./pwa.js"]',"link.removeAttribute('href')"])assert(html.includes(text));assert(!html.includes('allow-same-origin'));
 for(const file of ['planning.html','planning-game.js','game.js','index.html'])assert(read('v4-1/'+file).includes('55枚'));
});
