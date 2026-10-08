import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

// Public synthetic states only. No user/browser saves, network, dependencies, or git
// history are required by these tests. The fixture was generated from exact main
// a84ec049d3ff5e94b818b2f3447abe29739da513, before any v4.16 runtime edits.
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ctx = {};
for (const file of ['planning-v1-engine.js','planning-v2-engine.js','planning-engine.js']) vm.runInNewContext(read('v4-1/' + file), ctx);
const E = ctx.ShinkaV43;
const baseline = JSON.parse(read('tests/fixtures/astral-v415-starter-cost-synthetic.json'));
const zones = s => [...s.hand,...s.draw,...s.discard,...s.exhaust];
function restore(save) {
  const g = E.createGame(E.seededRandom(987));
  assert.equal(g.restoreSave(plain(save)), true, `restore v${save.version}/${save.state.phase}`);
  if (save.version >= 3) assert.deepEqual(plain(g.exportSave()), save, 'lossless save restoration');
  return g;
}
function step(g, name, ...args) {
  const copy = restore(plain(g.exportSave()));
  assert.equal(g[name](...args), true, name);
  assert.equal(copy[name](...args), true, `${name} after restore`);
  assert.deepEqual(plain(g.exportSave()), plain(copy.exportSave()), `${name}: deterministic state and RNG`);
  restore(plain(g.exportSave()));
}
function denied(g, name, ...args) {
  const before = plain(g.exportSave());
  assert.equal(g[name](...args), false, name);
  assert.deepEqual(plain(g.exportSave()), before, `${name}: atomic denial, including RNG`);
}
function fixture(hand, changes = {}, ruleset = 'growth-v2') {
  const g = E.createGame(E.seededRandom(1607), {ruleset}); g.start();
  const save = plain(g.exportSave()), s = save.state;
  Object.assign(s, changes);
  s.hand = [...hand]; s.draw = Array(10-hand.length).fill('basicWard'); s.discard = []; s.exhaust = []; s.deck = zones(s);
  return restore(save);
}

// BEGIN PINNED BASELINE TRACE. This exact helper is used by the one-off generator.
function oldGrowthTrace(E, digest, capture = () => {}) {
  const clean = value => JSON.parse(JSON.stringify(value));
  const traces = [], natural = [];
  for (const origin of ['frost','storm','mirror'])
  for (const route of ['moon','forge'])
  for (const chapter of ['library','wind','causeway'])
  for (const early of ['rest','evolve','remove']) {
    const g = E.createGame(E.seededRandom(416), {ruleset:'growth-v1'}), rows = [];
    const record = () => {
      rows.push(clean(g.exportSave()));
      if (g.snapshot().phase === 'battle') rows.push(clean([g.intent(),g.futureIntents(),g.snapshot().hand.map((_,i) => g.previewCard(i))]));
    };
    const act = (name, ...args) => {
      capture(clean(g.exportSave()), [name,...args], {origin,route,chapter,early});
      if (!g[name](...args)) throw new Error(`baseline action ${name}`);
      record();
    };
    record(); act('selectOrigin',origin); act('start');
    for (let battle=1;battle<=6;battle++) {
      const i = g.snapshot().hand.findIndex((_,i) => g.previewCard(i).cost <= g.snapshot().energy);
      if (i >= 0) act('play',i);
      act('endTurn');
      const save = clean(g.exportSave()), s = save.state;
      Object.assign(s,{hp:s.maxHp,enemyHp:1,energy:5,block:0,focus:0,reflect:0,weaken:0,pendingBlock:0,pendingFocus:0,turnLastAttack:0,prevLastAttack:0,prevEndEmpty:false,usedExhaustThisTurn:false,turnDamage:0,spellCount:0,interrupted:false,flags:{}});
      s.draw = [...s.deck]; s.hand = s.draw.splice(s.draw.findIndex(id => E.card(id).isAttack),1); s.discard=[];s.exhaust=[];
      if (!g.restoreSave(save)) throw new Error('baseline synthetic win restore');
      record(); act('play',0); act('openReward');
      if (battle===6) { capture(clean(g.exportSave()),['endTurn'],{origin,route,chapter,early}); break; }
      act('chooseReward',g.rewardOptions()[(battle+origin.length)%4]);
      if (battle===1) act('chooseRoute',route);
      else if (battle===3) act('chooseChapter',chapter);
      else if (battle===5) { act('chooseCamp','remove');act('cancelRemoval');act('chooseCamp','remove');act('removeCard',g.removeOptions().at(-1)); }
      else {
        const choice = battle===2 ? early : early==='evolve' ? 'remove' : 'evolve';
        act('chooseSanctuary',choice);
        if (choice==='evolve') { act('cancelEvolution');act('chooseSanctuary','evolve');act('evolve',g.upgradeOptions()[0]); }
        if (choice==='remove') { act('cancelRemoval');act('chooseSanctuary','remove');act('removeCard',g.removeOptions().at(-1)); }
      }
      act('nextBattle');
    }
    traces.push([origin,route,chapter,early,digest(rows)]);
  }
  for (const origin of ['frost','storm','mirror']) for(let seed=1;seed<=8;seed++) {
    const g = E.createGame(E.seededRandom(seed),{ruleset:'growth-v1'}), rows=[];g.selectOrigin(origin);
    for(let i=0;i<1200;i++) {
      const s=g.snapshot();rows.push(clean(g.exportSave()));
      let cmd;
      if(s.phase==='battle') {
        const options=s.hand.map((_,j)=>[j,g.previewCard(j)]).filter(([,c])=>c.cost<=s.energy).sort((a,b)=>(b[1].actualDamage+b[1].actualBlock*.6+b[1].actualDraw*3)-(a[1].actualDamage+a[1].actualBlock*.6+a[1].actualDraw*3));
        cmd=options.length?['play',options[0][0]]:['endTurn'];
      } else cmd={intro:['start'],victory:['openReward'],reward:['chooseReward',g.rewardOptions()[0]],route:['chooseRoute','moon'],sanctuary:['chooseSanctuary','rest'],chapter:['chooseChapter','library'],camp:['chooseCamp','rest'],ready:['nextBattle']}[s.phase];
      if(!cmd)break;
      if(!g[cmd[0]](...cmd.slice(1)))throw Error('baseline natural action');
    }
    natural.push([origin,seed,digest(rows)]);
  }
  return {transitionsSha256:digest(traces),naturalSha256:digest(natural),scenarioCount:traces.length,naturalCount:natural.length};
}
// END PINNED BASELINE TRACE.

test('v4.15 definitions, 54 full growth-v1 phase traces, and 24 natural runs remain byte-exact', () => {
  assert.equal(baseline.sourceCommit,'a84ec049d3ff5e94b818b2f3447abe29739da513');
  assert.equal(baseline.synthetic,true);
  assert.equal(Object.keys(E.CARDS).length, 62);
  for(const name of ['CARDS','ORIGINS','ENEMIES','GROWTH_ENEMIES','RELICS','BASIC_STARTER','FIRST_REWARD_POOLS']) assert.equal(sha(plain(name === 'CARDS' ? Object.fromEntries(Object.entries(E.CARDS).filter(([id]) => !['rimeMirror','frostOmen','restitch','frostCrossing','starFrostLetter','stillMirror','afterglowWard','bankedStarBlade','rimeThaw','bankedStance'].includes(id))) : E[name])),baseline.definitions[name],name);
  assert.deepEqual(oldGrowthTrace(E,sha),baseline.growthTrace);
});

test('pinned v1/v2/v3/v4 saves retain migrated state, open offers, RNG, and exact next action', () => {
  const versions=new Set(),phases=new Set();
  for(const {name,save,restoredSha256,command,accepted,afterSha256} of baseline.fixtures) {
    versions.add(save.version);phases.add(save.state.phase);
    const g=restore(save);
    assert.equal(sha(plain(g.exportSave())),restoredSha256,name+' restore');
    if(save.state.phase==='reward')assert.deepEqual(plain(g.rewardOptions()),save.state.rewardOffers,name+' existing offers');
    assert.equal(g[command[0]](...command.slice(1)),accepted,name+' action result');
    assert.equal(sha(plain(g.exportSave())),afterSha256,name+' next state and RNG');
  }
  assert.deepEqual([...versions].sort(),[1,2,3,4]);
  for(const phase of ['intro','battle','victory','reward','route','ready','sanctuary','evolve','remove','chapter','camp','complete','defeat','astrolabe'])assert(phases.has(phase),phase);
});

test('new default is save v5 growth-v2 for every charm, with same ten cards and start energy two', () => {
  for(const origin of Object.keys(E.ORIGINS)) {
    const g=E.createGame(E.seededRandom(416));
    assert.equal(g.exportSave().version,5);assert.equal(g.snapshot().ruleset,'growth-v2');
    step(g,'selectOrigin',origin);assert.equal(g.snapshot().deck.length,10);
    assert.equal(g.snapshot().deck.filter(id=>id==='basicStrike').length,5);assert.equal(g.snapshot().deck.filter(id=>id==='basicWard').length,5);
    step(g,'start');assert.deepEqual(plain(g.snapshot().hand),['basicStrike','basicWard','basicStrike','basicWard','basicStrike']);
    assert.equal(g.snapshot().energy,2);assert.equal(g.snapshot().maxEnergy,5);assert.equal(g.snapshot().enemyMaxHp,15);
    assert.equal(g.snapshot().earlyRemoval,null);
  }
  assert.throws(()=>E.createGame(E.seededRandom(1),{ruleset:'growth-v3'}),/Unknown/);
});

test('only active growth-v2 basic costs change, including upgrades; primitive effects stay three/five', () => {
  for(const ruleset of ['classic','growth-v1','growth-v2']) {
    const g=E.createGame(E.seededRandom(7),{ruleset}),cost=ruleset==='growth-v2'?1:0;
    for(const id of Object.keys(E.CARDS))for(const suffix of ['', '+']) {
      const cardId=id+suffix,old=plain(E.card(cardId)),actual=plain(g.card(cardId));
      if(id==='basicStrike'||id==='basicWard')old.cost=cost;
      assert.deepEqual(actual,old,`${ruleset}/${cardId}`);
    }
    for(const [id,key] of [['basicStrike','damage'],['basicWard','block']])for(const suffix of ['', '+']) {
      assert.equal(g.card(id+suffix).cost,cost);assert.equal(g.card(id+suffix)[key],suffix?5:3);
      const x=fixture([id+suffix],{energy:2},ruleset),before=x.snapshot();
      assert.equal(x.previewCard(0).cost,cost);step(x,'play',0);assert.equal(x.snapshot().energy,2-cost);
      assert.deepEqual(plain(x.snapshot().discard),[id+suffix]);
      assert.equal(key==='damage'?before.enemyHp-x.snapshot().enemyHp:x.snapshot().block,suffix?5:3);
    }
  }
});

test('unaffordable v5 starters reject atomically while old growth starters still play at zero mana', () => {
  for(const id of ['basicStrike','basicStrike+','basicWard','basicWard+']) {
    const g=fixture([id],{energy:0});denied(g,'play',0);denied(g,'play',-1);denied(g,'play',1);denied(g,'play',0.5);
    const old=fixture([id],{energy:0},'growth-v1');step(old,'play',0);assert.equal(old.snapshot().energy,0);
  }
});

test('growth-v2 carries energy and restores three only after turn one, capped at five', () => {
  for(const ruleset of ['classic','growth-v1','growth-v2'])for(let energy=0;energy<=5;energy++) {
    const g=fixture(['basicWard'],{energy},ruleset),regen=ruleset==='growth-v2'?3:1;
    assert.equal(E.manaRegenFor(g.snapshot()),regen);
    const before=plain(g.exportSave());g.previewCard(0);g.intent();g.futureIntents();assert.deepEqual(plain(g.exportSave()),before);
    step(g,'endTurn');assert.equal(g.snapshot().energy,Math.min(5,energy+regen));assert.equal(g.snapshot().prevEndEmpty,energy===0);
    step(g,'endTurn');assert.equal(g.snapshot().energy,Math.min(5,energy+regen*2));
  }
});

test('cost-one basics interact with payment, spark, empty-turn memory, and mirror passive at the actual energy', () => {
  const g=fixture(['basicWard','basicStrike','spark'],{energy:2,origin:'mirror'});
  step(g,'play',0);assert.equal(g.snapshot().energy,1);assert.equal(g.snapshot().reflect,2);assert.equal(g.snapshot().block,3);
  assert.equal(g.previewCard(1).actualDamage,2);
  step(g,'play',0);assert.equal(g.snapshot().energy,0);assert.equal(g.previewCard(0).actualDamage,6);
  step(g,'play',0);step(g,'endTurn');assert.equal(g.snapshot().prevEndEmpty,true);assert.equal(g.snapshot().energy,3);
});

test('v5 roundtrips every growth phase and route, preserves guaranteed upgrades/removal, and resets battle energy', () => {
  const seen=new Set();
  for(const {save,command} of baseline.fixtures.filter(row=>row.save.version===4)) {
    const next=plain(save);next.version=5;next.state.ruleset='growth-v2';
    const g=restore(next);seen.add(next.state.phase);
    const copy=restore(next),a=g[command[0]](...command.slice(1)),b=copy[command[0]](...command.slice(1));
    assert.equal(a,b);assert.deepEqual(plain(g.exportSave()),plain(copy.exportSave()));restore(plain(g.exportSave()));
    if(command[0]==='nextBattle') {
      const s=g.snapshot();assert.equal(s.energy,s.route2==='causeway'&&s.battle>=4?3:2);
      if(save.state.pendingUpgrade)assert(s.hand.includes(save.state.pendingUpgrade));
      assert.equal(s.deck.length,save.state.deck.length);
    }
  }
  for(const phase of ['intro','battle','victory','reward','route','ready','sanctuary','evolve','remove','chapter','camp','complete','defeat'])assert(seen.has(phase),phase);
});

test('inconsistent versions/rulesets and corrupt state reject without mutating live state or RNG', () => {
  const originals=['classic','growth-v1','growth-v2'].map(ruleset=>fixture(['basicStrike'],{energy:2},ruleset).exportSave());
  for(const valid of originals)for(const version of [0,1,2,3,4,5,6,'5',null])for(const ruleset of [undefined,'classic','growth-v1','growth-v2','growth-v3',null]) {
    const candidate=plain(valid);candidate.version=version;
    if(ruleset===undefined)delete candidate.state.ruleset;else candidate.state.ruleset=ruleset;
    const correct=valid.version===3 ? version===3&&ruleset===undefined : (version===4&&ruleset==='growth-v1')||(version===5&&ruleset==='growth-v2');
    if(correct)continue;
    const live=fixture(['basicStrike'],{energy:1}),reference=restore(plain(live.exportSave()));
    denied(live,'restoreSave',candidate);
    step(live,'endTurn');step(reference,'endTurn');assert.deepEqual(plain(live.exportSave()),plain(reference.exportSave()));
  }
  for(const mutate of [s=>{delete s.state.ruleset;},s=>{delete s.state.earlyRemoval;},s=>{s.rngState=-1;},s=>{s.state.energy=6;},s=>{s.state.enemyMaxHp=48;},s=>{s.state.hand.push('basicStrike');}]) {
    const live=fixture(['basicStrike'],{energy:1}),bad=plain(live.exportSave());mutate(bad);denied(live,'restoreSave',bad);
  }
});

// A deliberately minimal DOM/event/storage test double executes the unmodified
// UI script. These assertions cover computed markup and wiring, not layout,
// accessibility-tree behavior, physical touch, or real-browser screenshots.
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
 for(const file of ['planning-v1-engine.js','planning-v2-engine.js','planning-engine.js','fan-card-text.js','journey-visual.js','planning-game.js'])vm.runInNewContext(read('v4-1/'+file),context);
 function click(selector,dataset={}){const target={dataset,disabled:false,focus(){},closest:()=>target,matches:()=>false};for(const fn of node(selector).listeners.get('click')||[])fn({target});}
 return {node,click,storage,saved:()=>JSON.parse(storage.get('shinka-astral-planning-save-v1')).engine};
}

test('active-save UI logic renders v3/v4/v5 card costs and mana text consistently (nonvisual DOM stub)', () => {
  const html=read('v4-1/planning.html');
  for(const marker of ['data-starter-rule','data-mana-rule'])assert.equal(html.split(marker).length-1,1,marker+' source anchor is unique');
  assert(!html.includes('id="starterRuleText"'));assert(!html.includes('id="manaRuleText"'));
  const fresh=uiHarness();assert(fresh.node('#storyBody').innerHTML.includes('この旅の基本2種は魔力1。'));
  fresh.click('#storyDialog',{action:'start'});assert.equal(fresh.saved().version,5);assert.equal(fresh.saved().state.energy,2);
for(const version of [3,4,5])for(const phase of ['intro','battle','evolve','remove']) {
 if(version===3&&!['intro','battle'].includes(phase))continue;
 let save=plain(baseline.fixtures.find(x=>x.save.version===(version===5?4:version)&&x.save.state.phase===phase).save);
 if(version===5){save.version=5;save.state.ruleset='growth-v2';}
 if(phase==='battle')save.state.energy=0;
 const ui=uiHarness(save);assert.deepEqual(ui.saved(),save,'pending saves not overwritten');ui.click('#storyDialog',{action:'resume'});assert.deepEqual(ui.saved(),save,'restore is unchanged');
 const cost=version===5?1:0,regen=version===5?3:1;
 assert.equal(ui.node('#energyRule').textContent,`次＋${regen} / 上限5`);
 assert(ui.node('#rulesSource [data-mana-rule]').textContent.includes(`2ターン目から＋${regen}され`));
 if(version>=4)assert.equal(ui.node('#rulesSource [data-starter-rule]').textContent,`この旅の基本2種は魔力${cost}。`);
 if(phase==='battle'){
  if(version>=4){assert(ui.node('#hand').innerHTML.includes(`魔力${cost}。`));assert(ui.node('#hand').innerHTML.includes(`<span class="cost" aria-hidden="true">${cost}</span>`));ui.click('#hand',{card:'0'});assert.equal(ui.node('#playCard').disabled,cost===1);assert(ui.node('#playCard').getAttribute('aria-label').includes(`魔力${cost}`));}
  ui.click('#deckButton');if(version>=4)assert(ui.node('#deckList').innerHTML.includes(`<small>魔力${cost} · 3ダメージ。`));
  ui.click('#catalogButton');assert(ui.node('#catalogList').innerHTML.startsWith(`<article class="catalog-card"><img`));assert(ui.node('#catalogList').innerHTML.includes(`<span class="cost" aria-hidden="true">${cost}</span><span class="card-copy"><strong>小さな魔弾</strong>`));
  ui.click('#helpButton');assert(ui.node('#helpBody').innerHTML.includes(`2ターン目から＋${regen}され`));if(version>=4)assert(ui.node('#helpBody').innerHTML.includes(`この旅の基本2種は魔力${cost}。`));
 } else if(phase==='intro'&&version>=4){assert(ui.node('#storyBody').innerHTML.includes(`この旅の基本2種は魔力${cost}。`));assert(ui.node('#storyBody').innerHTML.includes(`2ターン目から＋${regen}`));}
 else if(phase==='evolve'||phase==='remove'){const markup=ui.node('#storyBody').innerHTML;assert(markup.includes(`魔力${cost}。`));assert(markup.includes(`<span class="cost" aria-hidden="true">${cost}</span>`));assert(markup.includes(phase==='evolve'?'data-evolve="basicStrike"':'data-remove="basicStrike"'));}

}

});
