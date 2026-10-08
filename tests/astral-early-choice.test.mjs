import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {loadEngine, restored, fight} from '../tools/astral-growth-balance.mjs';
import {OPTIONS} from '../tools/astral-early-choice-check.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const E=loadEngine(),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function fresh(seed=1,origin='frost'){const g=E.createGame(E.seededRandom(seed),{ruleset:E.EARLY_CHOICE_RULESET});assert(g.selectOrigin(origin));assert(g.start());return g;}
function reward(seed=1,origin='frost'){const g=fresh(seed,origin);assert(fight(E,g,OPTIONS).win);assert(g.openReward());return g;}
function roundtrip(g){const save=plain(g.exportSave()),copy=restored(E,save);assert.deepEqual(plain(copy.exportSave()),save);return copy;}

test('v6 changes only first two reward draws; every charm starts with the same v5 battle',()=>{
 for(const origin of Object.keys(E.ORIGINS)){
  const next=fresh(7,origin),old=E.createGame(E.seededRandom(7));old.selectOrigin(origin);old.start();
  assert.equal(next.exportSave().version,6);assert.equal(next.card('basicStrike').cost,1);assert.equal(next.card('basicWard+').cost,1);assert.equal(E.manaRegenFor(next.snapshot()),3);
  const a=plain(next.exportSave()),b=plain(old.exportSave());a.version=5;a.state.ruleset='growth-v2';assert.deepEqual(a,b);
  roundtrip(next);assert(fight(E,next,OPTIONS).win);assert.equal(next.snapshot().phase,'victory');assert(next.openReward());
  const offers=next.rewardOptions();assert.equal(offers.length,3);assert.equal(new Set(offers).size,3);
  offers.forEach((id,i)=>assert(E.EARLY_REWARD_POOLS[0][i].includes(id)));roundtrip(next);
  const before=plain(next.exportSave());assert.equal(next.openReward(),false);assert.equal(next.chooseReward('basicStrike'),false);assert.deepEqual(plain(next.exportSave()),before);
 }
});

test('all early pool cards exist and roles are disjoint; pools do not guarantee a build',()=>{
 for(const pools of E.EARLY_REWARD_POOLS){const all=pools.flat();assert.equal(new Set(all).size,all.length);for(const id of all){assert(E.CARDS[id]);assert(!E.CARDS[id].starterOnly);}}
 const seen=new Set();for(let seed=1;seed<=8;seed++)seen.add(reward(seed).rewardOptions().join('|'));assert(seen.size>1);
});

test('take / skip, both routes, guaranteed opening, second reward, evolution and third battle roundtrip',()=>{
 const opened=reward(7),save=plain(opened.exportSave());
 for(const route of ['moon','forge'])for(const id of [...opened.rewardOptions(),null]){
  const g=restored(E,save);assert(g.chooseReward(id));assert.equal(g.snapshot().deck.length,id?11:10);assert.equal(g.snapshot().lastReward,id);roundtrip(g);
  assert(g.chooseRoute(route));roundtrip(g);assert(g.nextBattle());if(id)assert(g.snapshot().hand.includes(id));
  if(id){const zero=plain(g.exportSave());zero.state.energy=0;const low=restored(E,zero),index=low.snapshot().hand.indexOf(id);if(low.card(id).cost>0){const before=plain(low.exportSave());assert.equal(low.play(index),false);assert.deepEqual(plain(low.exportSave()),before);}}
  assert(fight(E,g,OPTIONS).win);assert(g.openReward());assert.equal(g.rewardOptions().length,3);g.rewardOptions().forEach((id,i)=>assert(E.EARLY_REWARD_POOLS[1][i].includes(id)));roundtrip(g);
  const picked=g.rewardOptions()[0];assert(g.chooseReward(picked));assert(g.chooseSanctuary('evolve'));roundtrip(g);assert(g.evolve(picked));roundtrip(g);assert(g.snapshot().deck.includes(picked+'+'));assert(g.nextBattle());assert(g.snapshot().hand.includes(picked+'+'));roundtrip(g);
  assert(fight(E,g,OPTIONS).win);assert(g.openReward());assert.equal(g.rewardOptions().length,4);roundtrip(g);
  const old=plain(g.exportSave());old.version=5;old.state.ruleset='growth-v2';const v5=restored(E,old);
  // Same battle-3 victory/RNG in both versions gives identical general rewards.
  const victory=plain(g.exportSave());victory.state.phase='victory';victory.state.rewardOffers=[];
  const current=restored(E,victory),legacy=plain(victory);legacy.version=5;legacy.state.ruleset='growth-v2';const older=restored(E,legacy);
  assert(current.openReward());assert(older.openReward());assert.deepEqual(plain(current.rewardOptions()),plain(older.rewardOptions()));assert.equal(current.exportSave().rngState,older.exportSave().rngState);
 }
});

function withFirstCard(id,route='moon'){
 for(let seed=1;seed<50;seed++){const g=reward(seed,'storm');if(!g.rewardOptions().includes(id))continue;g.chooseReward(id);g.chooseRoute(route);g.nextBattle();return g;}throw Error('missing card '+id);
}
function handFixture(id,hand,extra={}){const g=withFirstCard(id),save=plain(g.exportSave()),s=save.state;const remaining=[...s.deck];for(const x of hand){const i=remaining.indexOf(x);assert(i>=0);remaining.splice(i,1);}Object.assign(s,{hand,draw:remaining,discard:[],exhaust:[],energy:2,block:0,focus:0,weaken:0,reflect:0,...extra});return restored(E,save);}
test('existing choices create distinct payment, defense, sequencing and next-turn decisions',()=>{
 const ward=handFixture('frostWard',['frostWard','basicStrike']);assert(ward.play(0));assert.equal(ward.snapshot().weaken,2);assert.equal(ward.snapshot().block,5);assert.equal(ward.intent().perHit,1); // double hit reduced twice
 const mirror=handFixture('mirror',['mirror','basicStrike']);assert(mirror.play(0));assert.equal(mirror.intent().reflected,6);
 const strike=handFixture('shieldStrike',['basicWard','shieldStrike']);assert.equal(strike.previewCard(1).actualDamage,3);assert(strike.play(0));assert.equal(strike.previewCard(0).actualDamage,6);assert(strike.play(0));assert.equal(strike.snapshot().block,0); // spend the shield, lose defense
 const chain=handFixture('chain',['basicStrike','chain']);assert.equal(chain.previewCard(1).actualDamage,7);assert(chain.play(0));assert.equal(chain.previewCard(0).actualDamage,12);
 const wait=handFixture('starWait',['starWait','basicStrike']);assert(wait.play(0));assert.equal(wait.snapshot().pendingFocus,8);assert.equal(wait.snapshot().block,3);assert(wait.endTurn());assert.equal(wait.snapshot().focus,8);
 const bolt=handFixture('bolt',['bolt','basicWard']);assert(bolt.play(0));assert.equal(bolt.snapshot().energy,0);assert.equal(bolt.play(0),false);
});

test('v6 rejects wrong ruleset / reward count atomically; open old rewards and RNG remain pinned',()=>{
 const g=reward(),valid=plain(g.exportSave());for(const modify of [s=>{s.version=5;},s=>{s.state.ruleset='growth-v2';},s=>{s.state.rewardOffers.push('focus');},s=>{s.state.rewardOffers.pop();}]){const bad=plain(valid);modify(bad);const live=roundtrip(g),before=plain(live.exportSave());assert.equal(live.restoreSave(bad),false);assert.deepEqual(plain(live.exportSave()),before);}
 const baseline=JSON.parse(read('tests/fixtures/astral-early-choice-main.json'));assert.equal(hash({CARDS:E.CARDS,ORIGINS:E.ORIGINS,ENEMIES:E.ENEMIES,GROWTH_ENEMIES:E.GROWTH_ENEMIES,CURRENT_ENEMIES:E.CURRENT_ENEMIES}),baseline.definitions);
 for(const row of baseline.rows){const old=E.createGame(E.seededRandom(row.seed),{ruleset:row.ruleset});assert.equal(hash(old.exportSave()),row.intro);old.start();assert(fight(E,old,OPTIONS).win);assert.equal(hash(old.exportSave()),row.victory);old.openReward();assert.equal(hash(old.exportSave()),row.reward);const resumed=roundtrip(old);assert.equal(resumed.rewardOptions().length,4);const id=resumed.rewardOptions()[0];resumed.chooseReward(id);resumed.chooseRoute('moon');resumed.nextBattle();assert.equal(hash(resumed.exportSave()),row.second);}
});

function uiHarness(save) {
 const elements=new Map(),storage=new Map(),html=read('v4-1/planning.html');let now=1000;
 if(save)storage.set('shinka-astral-planning-save-v1',JSON.stringify({version:1,seed:416,engine:save,savedAt:0}));
 class Element {
  constructor(key){this.key=key;this.textContent='';this._innerHTML='';this.dataset={};this.style={};this.attributes=new Map();this.listeners=new Map();this.classList={add(){},remove(){},toggle(){}};this.open=false;this.disabled=false;this.hidden=false;}
  get innerHTML(){if(this.key==='#rulesSource > div')return html.match(/<details id="rulesSource"[^>]*>[\s\S]*?<div>([\s\S]*?)<\/div><\/details>/)[1].replace(/(<span data-starter-rule>)[\s\S]*?(<\/span>)/,(_,a,b)=>a+node('#rulesSource [data-starter-rule]').textContent+b).replace(/(<span data-mana-rule>)[\s\S]*?(<\/span>)/,(_,a,b)=>a+node('#rulesSource [data-mana-rule]').textContent+b);return this._innerHTML;}
  set innerHTML(value){this._innerHTML=value;}
  get content(){return this;}get parentElement(){return node(this.key+'/parent');}
  setAttribute(k,v){this.attributes.set(k,String(v));}getAttribute(k){return this.attributes.get(k)||'./assets/test-placeholder.webp';}
  querySelector(q){return node(this.key+' '+q);}querySelectorAll(){return [];}append(){}focus(){}close(){this.open=false;}showModal(){this.open=true;}
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
 }
 function node(selector){if(!elements.has(selector))elements.set(selector,new Element(selector));return elements.get(selector);}
 const document={querySelector:node,querySelectorAll:()=>[],body:node('body'),addEventListener(){}};
 const context={document,window:{CARD_ART_DATA:{}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},performance:{now:()=>now+=1000}};
 for(const file of ['planning-v1-engine.js','planning-v2-engine.js','planning-engine.js','fan-card-text.js','journey-visual.js','planning-game.js']){vm.runInNewContext(read('v4-1/'+file),context);if(file==='journey-visual.js')context.ShinkaJourney=context.window.ShinkaJourney;}
 function click(selector,dataset={}){const target={dataset,disabled:false,focus(){},closest:()=>target,matches:()=>false};for(const fn of node(selector).listeners.get('click')||[])fn({target});}
 return {node,click,storage,saved:()=>JSON.parse(storage.get('shinka-astral-planning-save-v1')).engine};
}


test('actual UI starts v6, renders three offers / existing preview, and wires take or skip (DOM stub)',()=>{
 const freshUI=uiHarness();freshUI.click('#storyDialog',{action:'start'});assert.equal(freshUI.saved().version,6);
 const opened=reward(7),save=plain(opened.exportSave());
 for(const choice of [opened.rewardOptions()[0],null]){
  const ui=uiHarness(save);assert.deepEqual(ui.saved(),save);ui.click('#storyDialog',{action:'resume'});
  const markup=ui.node('#storyBody').innerHTML;assert.equal((markup.match(/data-reward=/g)||[]).length,3);assert(markup.includes('reward-forecast'));assert(markup.includes('水鏡'));assert(markup.includes('炉'));assert(markup.includes('skipReward'));
  if(choice)ui.click('#storyDialog',{reward:choice});else ui.click('#storyDialog',{action:'skipReward'});
  assert.equal(ui.saved().state.deck.length,choice?11:10);assert.equal(ui.saved().state.phase,'route');ui.click('#storyDialog',{route:'moon'});ui.click('#storyDialog',{action:'next'});assert.equal(ui.saved().state.battle,2);if(choice)assert(ui.saved().state.hand.includes(choice));
 }
 const second=restored(E,save);second.chooseReward(null);second.chooseRoute('moon');second.nextBattle();assert(fight(E,second,OPTIONS).win);second.openReward();const ui=uiHarness(plain(second.exportSave()));ui.click('#storyDialog',{action:'resume'});assert(ui.node('#storyBody').innerHTML.includes(E.enemiesFor(second.snapshot()).trial.name));assert.equal((ui.node('#storyBody').innerHTML.match(/data-reward=/g)||[]).length,3);
});

test('trial UI uses three offered charms, persists intro selection, and restores old three fixed options (DOM stub)',()=>{
 const g=E.createGame(E.seededRandom(7),{ruleset:E.EARLY_CHOICE_RULESET,charmTrial:true}),save=plain(g.exportSave());
 const ui=uiHarness(save);ui.click('#storyDialog',{action:'resume'});const markup=ui.node('#storyBody').innerHTML;assert.equal((markup.match(/data-origin=/g)||[]).length,3);for(const id of g.originOptions())assert(markup.includes(E.originsFor(g.snapshot())[id].name));const choice=g.originOptions()[1];ui.click('#storyDialog',{origin:choice});assert.equal(ui.saved().state.origin,choice);assert(ui.saved().state.flags.charmTrial);const again=uiHarness(ui.saved());again.click('#storyDialog',{action:'resume'});assert(again.node('#storyBody').innerHTML.includes(E.originsFor(g.snapshot())[choice].effect));again.click('#storyDialog',{action:'start'});assert.equal(again.saved().version,6);assert.equal(again.saved().state.origin,choice);assert.deepEqual(again.saved().state.flags,{});assert(again.node('#charm').textContent.includes(E.originsFor(g.snapshot())[choice].name));
 const old=E.createGame(E.seededRandom(7),{ruleset:E.EARLY_CHOICE_RULESET}),legacy=uiHarness(plain(old.exportSave()));legacy.click('#storyDialog',{action:'resume'});const html=legacy.node('#storyBody').innerHTML;for(const id of Object.keys(E.ORIGINS))assert(html.includes(`data-origin="${id}"`));assert(!html.includes('data-origin="cadence"'));
});
