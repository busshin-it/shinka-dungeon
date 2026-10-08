import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

// Synthetic states only: no browser, localStorage, user saves, or network access.
// Transition tests deliberately isolate correctness from a claim about balance/fun.
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = {};
for (const file of ['planning-v1-engine.js', 'planning-v2-engine.js', 'planning-engine.js'])
  vm.runInNewContext(read('v4-1/' + file), context);
const currentEngine = context.ShinkaV43;
// Historical v4 trial remains pinned; fresh v5 coverage lives in astral-starter-cost.
const engine = {...currentEngine, createGame: (random, options = {ruleset:'growth-v1'}) => currentEngine.createGame(random, options)};
const plain = value => JSON.parse(JSON.stringify(value));
const sorted = values => [...values].sort();
const zones = state => [...state.hand, ...state.draw, ...state.discard, ...state.exhaust];
const count = (values, id) => values.filter(value => value === id).length;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const phasesSeen = new Set();
function restore(save) {
  const game = engine.createGame();
  assert.equal(game.restoreSave(plain(save)), true, `restore ${save.version}/${save.state.phase}/${save.state.battle}`);
  assert.deepEqual(plain(game.exportSave()), plain(save), 'restore is lossless');
  return game;
}
function roundtrip(game) {
  const save = plain(game.exportSave());
  phasesSeen.add(save.state.phase);
  if (['battle', 'victory', 'defeat', 'complete'].includes(save.state.phase))
    assert.deepEqual(sorted(zones(save.state)), sorted(save.state.deck), 'physical cards conserved');
  return restore(save);
}
function step(game, method, ...args) {
  const copy = roundtrip(game);
  assert.equal(game[method](...args), true, method);
  assert.equal(copy[method](...args), true, method + ' after restore');
  assert.deepEqual(plain(game.exportSave()), plain(copy.exportSave()), method + ' deterministic next action');
  roundtrip(game);
  return game.snapshot();
}
function denied(game, method, ...args) {
  const before = plain(game.exportSave());
  assert.equal(game[method](...args), false, method + ' rejected');
  assert.deepEqual(plain(game.exportSave()), before, method + ' rejection is atomic, including RNG');
}
function win(game) {
  const save = plain(game.exportSave()), s = save.state;
  Object.assign(s, { hp:s.maxHp, enemyHp:1, energy:5, block:0, focus:0, reflect:0, weaken:0,
    pendingBlock:0, pendingFocus:0, turnDamage:0, spellCount:0, turnLastAttack:0,
    prevLastAttack:0, prevEndEmpty:false, usedExhaustThisTurn:false, interrupted:false, flags:{} });
  const i = s.deck.findIndex(id => engine.card(id).isAttack);
  assert.notEqual(i, -1, 'transition fixture retains one real attack');
  s.draw = [...s.deck]; s.hand = s.draw.splice(i, 1); s.discard = []; s.exhaust = [];
  assert.equal(game.restoreSave(save), true);
  step(game, 'play', 0);
  assert.equal(game.snapshot().phase, 'victory');
}
const bases = new Map();
function battleBase(battle = 1, route = 'moon', route2 = 'library') {
  const key = `${battle}/${route}/${route2}`;
  if (bases.has(key)) return plain(bases.get(key));
  const game = engine.createGame(engine.seededRandom(4917));
  step(game, 'start');
  for (let b = 1; b < battle; b++) {
    win(game); step(game, 'openReward'); step(game, 'chooseReward', null);
    if (b === 1) step(game, 'chooseRoute', route);
    else if (b === 3) step(game, 'chooseChapter', route2);
    else if (b === 5) step(game, 'chooseCamp', 'rest');
    else step(game, 'chooseSanctuary', 'rest');
    step(game, 'nextBattle');
  }
  bases.set(key, plain(game.exportSave()));
  return plain(bases.get(key));
}
function fixture(hand, changes = {}, { battle = 1, route = 'moon', route2 = 'library', draw, discard = [], exhaust = [] } = {}) {
  const save = battleBase(battle, route, route2), s = save.state;
  Object.assign(s, { origin:'frost', turn:1, hp:s.maxHp, enemyHp:s.enemyMaxHp, energy:5,
    block:0, focus:0, reflect:0, weaken:0, pendingBlock:0, pendingFocus:0,
    prevEndEmpty:false, prevLastAttack:0, turnLastAttack:0, usedExhaustThisTurn:false,
    turnDamage:0, spellCount:0, interrupted:false, flags:{} }, changes);
  s.hand = [...hand]; s.discard = [...discard]; s.exhaust = [...exhaust];
  s.draw = draw === undefined ? Array(10 - s.hand.length - s.discard.length - s.exhaust.length).fill('basicWard') : [...draw];
  while (zones(s).length < 10) s.exhaust.push('meditate');
  s.deck = zones(s);
  assert.equal(s.deck.length, 10);
  return restore(save);
}
function sanctuary(battle = 2) {
  const game = restore(battleBase(battle));
  win(game); step(game, 'openReward'); step(game, 'chooseReward', null);
  assert.equal(game.snapshot().phase, 'sanctuary');
  return game;
}

// This helper is shared verbatim with the one-off baseline calculation. Its pinned
// hashes below were generated from commit 82037597733a2431ce68aa4d70e68bf91ddf588d.
// Tests never need git history or a git executable, including shallow CI checkouts.
function classicTrace(E, digest) {
  const clean = value => JSON.parse(JSON.stringify(value));
  const traces = [], naturals = [];
  for (const origin of ['frost', 'storm', 'mirror'])
  for (const route of ['moon', 'forge'])
  for (const chapter of ['library', 'wind', 'causeway'])
  for (const early of ['rest', 'evolve', 'emberCore', 'starBottle'])
  for (const late of ['rest', 'evolve', 'remove'])
  for (const camp of ['rest', 'remove']) {
    const g = E.createGame(E.seededRandom(701), {ruleset:'classic'}), rows = [];
    const record = () => {
      const saved = clean(g.exportSave());
      rows.push(saved);
      const copy = E.createGame();
      if (!copy.restoreSave(saved) || JSON.stringify(copy.exportSave()) !== JSON.stringify(saved)) throw Error('baseline restoration');
      if (saved.state.phase === 'battle') rows.push(clean([g.intent(), g.futureIntents(), saved.state.hand.map((_, i) => g.previewCard(i))]));
    };
    const act = (name, ...args) => { if (!g[name](...args)) throw Error('baseline ' + name); record(); };
    record(); act('selectOrigin', origin); act('start');
    for (let battle = 1; battle <= 6; battle++) {
      // Combat effects and shuffled zones are recorded before a synthetic victory.
      const playable = g.snapshot().hand.findIndex(id => E.card(id).cost <= g.snapshot().energy);
      if (playable >= 0) act('play', playable);
      act('endTurn');
      const saved = clean(g.exportSave()), s = saved.state;
      Object.assign(s, { hp:s.maxHp, enemyHp:1, energy:5, block:0, focus:0, reflect:0, weaken:0,
        pendingBlock:0, pendingFocus:0, turnDamage:0, spellCount:0, turnLastAttack:0,
        prevLastAttack:0, prevEndEmpty:false, usedExhaustThisTurn:false, interrupted:false, flags:{} });
      const index = s.deck.findIndex(id => E.card(id).isAttack);
      s.draw = [...s.deck]; s.hand = s.draw.splice(index, 1); s.discard = []; s.exhaust = [];
      if (!g.restoreSave(saved)) throw Error('baseline victory fixture');
      record(); act('play', 0); act('openReward');
      if (battle === 6) break;
      act('chooseReward', g.rewardOptions()[(battle + origin.length) % 4]);
      if (battle === 1) act('chooseRoute', route);
      else if (battle === 3) act('chooseChapter', chapter);
      else if (battle === 5) { act('chooseCamp', camp); if (camp === 'remove') { act('cancelRemoval'); act('chooseCamp', camp); act('removeCard', g.removeOptions().at(-1)); } }
      else {
        const choice = battle === 2 ? early : late;
        if (choice === 'emberCore' || choice === 'starBottle') { act('chooseSanctuary', 'relic'); act('cancelRelic'); act('chooseSanctuary', 'relic'); act('chooseRelic', choice); }
        else {
          act('chooseSanctuary', choice);
          if (choice === 'evolve') { act('cancelEvolution'); act('chooseSanctuary', choice); act('evolve', g.upgradeOptions()[0]); }
          if (choice === 'remove') { act('cancelRemoval'); act('chooseSanctuary', choice); act('removeCard', g.removeOptions().at(-1)); }
        }
      }
      act('nextBattle');
    }
    traces.push([origin, route, chapter, early, late, camp, digest(rows)]);
  }
  for (const origin of ['frost', 'storm', 'mirror']) for (let seed = 1; seed <= 8; seed++) {
    const g = E.createGame(E.seededRandom(seed), {ruleset:'classic'}), rows = [];
    g.selectOrigin(origin);
    for (let i = 0; i < 800; i++) {
      const s = g.snapshot(); rows.push(clean(g.exportSave()));
      let cmd;
      if (s.phase === 'battle') {
        const picks = s.hand.map((_, i) => [i, g.previewCard(i)]).filter(([, c]) => c.cost <= s.energy)
          .sort((a, b) => (b[1].actualDamage + b[1].actualBlock*.6 + b[1].actualDraw*3) - (a[1].actualDamage + a[1].actualBlock*.6 + a[1].actualDraw*3));
        cmd = picks.length ? ['play', picks[0][0]] : ['endTurn'];
      } else cmd = {intro:['start'], victory:['openReward'], reward:['chooseReward', g.rewardOptions()[0]], route:['chooseRoute','moon'], sanctuary:['chooseSanctuary','rest'], chapter:['chooseChapter','library'], camp:['chooseCamp','rest'], ready:['nextBattle']}[s.phase];
      if (!cmd) break;
      if (!g[cmd[0]](...cmd.slice(1))) throw Error('natural baseline transition');
    }
    naturals.push([origin, seed, digest(rows)]);
  }
  const cards = Object.fromEntries(Object.entries(E.CARDS).filter(([id, c]) => !c.starterOnly && !['frostRecall','bankedEcho','ashStudy','mirrorRelay','rimeMirror','frostOmen','restitch','frostCrossing','starFrostLetter','stillMirror','afterglowWard','bankedStarBlade','rimeThaw'].includes(id)));
  return {
    definitions: digest([cards, E.ORIGINS, E.ENEMIES, E.RELICS, Object.keys(cards).flatMap(id => [E.card(id), E.card(id+'+')])]),
    transitions: digest(traces), naturalReplays: digest(naturals), scenarioCount:traces.length, naturalCount:naturals.length
  };
}
// End reference helper.

test('classic definitions, 432 complete phase traces and 24 natural runs exactly match v4.13 baseline', () => {
  assert.deepEqual(classicTrace(engine, hash), {
    definitions:'b41c1bec22d78438b08c211957a6087380526e801c3bd56925f9fc5bb715439d', transitions:'28e9d4196db1b7ddab9267716d249e244447c64cb22c10ef6cab7d330fec0d2b', naturalReplays:'e88269c35ce339419a50f1dbddf1f151d54eba8569f326974d0e833ffef578b2', scenarioCount:432, naturalCount:24
  });
});

test('fresh starts use v4 growth, exactly five basic attacks and five wards for all charms', () => {
  assert.equal(Object.keys(engine.CARDS).length, 61);
  for (const origin of Object.keys(engine.ORIGINS)) {
    const game = engine.createGame(engine.seededRandom(37));
    assert.equal(game.exportSave().version, 4);
    assert.equal(game.snapshot().ruleset, 'growth-v1');
    assert.equal(game.snapshot().earlyRemoval, null);
    step(game, 'selectOrigin', origin);
    assert.equal(count(game.snapshot().deck, 'basicStrike'), 5);
    assert.equal(count(game.snapshot().deck, 'basicWard'), 5);
    step(game, 'start');
    assert.deepEqual(plain(game.snapshot().hand), ['basicStrike','basicWard','basicStrike','basicWard','basicStrike']);
    assert.equal(game.snapshot().energy, 2);
    assert.equal(game.snapshot().enemyMaxHp, 15);
  }
  assert.throws(() => engine.createGame(engine.seededRandom(1), {ruleset:'unknown'}), /Unknown/);
});

test('basic cards have one primitive effect, cost zero, and a meaningful +2 upgrade', () => {
  for (const [id, effect] of [['basicStrike','damage'], ['basicWard','block']]) {
    const base = engine.card(id), up = engine.card(id + '+');
    assert.equal(base.cost, 0); assert.equal(up.cost, 0);
    assert.equal(base[effect], 3); assert.equal(up[effect], 5);
    assert.equal(base.isAttack, effect === 'damage');
    assert.equal(base.starterOnly, true); assert.equal(up.starterOnly, true);
    assert.deepEqual(Object.keys(engine.CARDS[id]).filter(key => !['name','cost','family','art','starterOnly'].includes(key)), [effect]);
    for (const energy of [0,1,5]) for (const cardId of [id,id+'+']) {
      const game = fixture([cardId], {energy, focus:effect==='damage'?4:0});
      const expected = cardId.endsWith('+') ? 5 : 3;
      const before = game.snapshot(); step(game, 'play', 0);
      assert.equal(game.snapshot().energy, energy, 'zero-cost really preserves mana');
      assert.equal(game.snapshot().stats.played[id], 1);
      assert.equal(game.snapshot().hand.length, 0);
      assert.deepEqual(plain(game.snapshot().discard), [cardId]);
      if (effect === 'damage') { assert.equal(before.enemyHp-game.snapshot().enemyHp, expected+4); assert.equal(game.snapshot().spellCount,1); assert.equal(game.snapshot().focus,0); }
      else assert.equal(game.snapshot().block, expected);
      denied(game, 'play', 0);
    }
  }
});

test('basic attacks preserve focus/forge and attack-count rules; ward uses only the mirror passive', () => {
  for (const origin of ['frost','storm','mirror']) {
    const game = fixture(['basicStrike','basicWard'], {origin,energy:0,focus:4}, {route:'forge',battle:2});
    assert.equal(game.previewCard(0).actualDamage, 9);
    assert.equal(game.previewCard(0).actualWeak, 0);
    step(game,'play',0); assert.equal(game.snapshot().flags.forge,true);
    step(game,'play',0); assert.equal(game.snapshot().reflect, origin==='mirror'?2:0);
    assert.equal(game.snapshot().flags.storm,undefined); assert.equal(game.snapshot().flags.frost,undefined);
  }
  const countGame = fixture(['basicStrike','basicStrike','basicStrike'],{turn:2,energy:0},{battle:4});
  for (let n=1;n<=3;n++) { step(countGame,'play',0); assert.equal(countGame.intent().perHit,4-n); }
  assert.equal(countGame.snapshot().interrupted,true);
});

test('only encounters within the first three battles are weakened, without mutating classic enemies', () => {
  assert.deepEqual(Object.keys(engine.ENEMIES), Object.keys(engine.GROWTH_ENEMIES));
  const early = {skeleton:15,wraith:36,stone:38,trial:52};
  for (const [id, oldEnemy] of Object.entries(engine.ENEMIES)) {
    const current = engine.enemiesFor({ruleset:'growth-v1'})[id];
    if (Object.hasOwn(early,id)) { assert.equal(current.hp,early[id]); assert(current.hp<oldEnemy.hp); }
    else assert.deepEqual(plain(current),plain(oldEnemy),id+' late-game definition unchanged');
  }
  assert.equal(engine.enemiesFor({}),engine.ENEMIES);
  for (const route of ['moon','forge']) for (let battle=1;battle<=6;battle++) {
    const game = restore(battleBase(battle,route));
    assert.equal(game.snapshot().enemyMaxHp,engine.enemiesFor(game.snapshot())[game.snapshot().enemyId].hp);
    const before=plain(game.exportSave()); game.intent(); game.futureIntents(); engine.enemyPattern(game.snapshot().enemyId,game.snapshot());
    assert.deepEqual(plain(game.exportSave()),before,'reads do not consume RNG');
  }
});

test('512 first rewards per charm have four distinct curated choices, never a basic', () => {
  const first=fixture(['basicStrike'],{enemyHp:1}); step(first,'play',0);
  const baseline=plain(first.exportSave());
  const expected=[['ice','bolt','dark','quietComet'],['chain','shieldStrike','focus','starWait'],['guard','frostWard','mirror','renew'],['meditate','charge','light','starBookmark','spark','frostNova']];
  assert.deepEqual(plain(engine.FIRST_REWARD_POOLS),expected);
  for (const origin of ['frost','storm','mirror']) {
    const seen=expected.map(()=>new Set());
    for (let seed=1;seed<=512;seed++) {
      const saved=plain(baseline); saved.rngState=seed; saved.state.origin=origin;
      const game=restore(saved); game.openReward(); const offers=plain(game.rewardOptions());
      assert.equal(offers.length,4); assert.equal(new Set(offers).size,4);
      offers.forEach((id,i)=>{assert(expected[i].includes(id));seen[i].add(id);assert(!engine.card(id).starterOnly);});
      if (seed<=12) {roundtrip(game);denied(game,'openReward');}
    }
    seen.forEach((values,i)=>assert.deepEqual(sorted(values),sorted(expected[i])));
  }
});

test('later growth rewards sample all 50 reward cards, stay unique, and never offer starters/upgrades', () => {
  const game=restore(battleBase(2)); win(game); const base=plain(game.exportSave());
  const seen=new Set();
  for (let seed=1;seed<=1024;seed++) {
    const saved=plain(base);saved.rngState=seed;const g=restore(saved);g.openReward();
    const offers=plain(g.rewardOptions());assert.equal(new Set(offers).size,4);
    for(const id of offers){assert(!id.endsWith('+'));assert(!engine.card(id).starterOnly);seen.add(id);}
  }
  assert.deepEqual(sorted(seen),sorted(Object.keys(engine.CARDS).filter(id=>!engine.CARDS[id].starterOnly&&!['rimeMirror','frostOmen','restitch','frostCrossing','starFrostLetter','stillMirror','afterglowWard','bankedStarBlade','rimeThaw'].includes(id))));
});

test('taking or skipping a reward preserves openings, cards, RNG, and repeated-action safety', () => {
  for (let slot=-1;slot<4;slot++) {
    const game=restore(battleBase(1));win(game);step(game,'openReward');
    const offered=plain(game.rewardOptions()),picked=slot<0?null:offered[slot];
    denied(game,'chooseReward','basicStrike');step(game,'chooseReward',picked);denied(game,'chooseReward',picked);
    const before=game.snapshot();step(game,'chooseRoute','moon');step(game,'nextBattle');
    assert.equal(game.snapshot().deck.length,slot<0?10:11);
    if(picked)assert(game.snapshot().hand.includes(picked));
    assert.deepEqual(plain(game.snapshot().deck),plain(before.deck));
  }
});

test('first sanctuary allows rest/evolve/remove and rejects the relic path atomically', () => {
  for(const choice of ['rest','evolve','remove']) {
    const game=sanctuary();denied(game,'chooseSanctuary','relic');denied(game,'chooseRelic','emberCore');
    step(game,'chooseSanctuary',choice);
    if(choice==='rest')assert.equal(game.snapshot().phase,'ready');
    if(choice==='evolve'){step(game,'cancelEvolution');denied(game,'cancelEvolution');step(game,'chooseSanctuary','evolve');step(game,'evolve','basicStrike');}
    if(choice==='remove'){step(game,'cancelRemoval');denied(game,'cancelRemoval');step(game,'chooseSanctuary','remove');step(game,'removeCard','basicWard');assert.equal(game.snapshot().earlyRemoval,'basicWard');}
    denied(game,'chooseSanctuary',choice);step(game,'nextBattle');assert.equal(game.snapshot().sanctuary,null);
    assert.deepEqual(plain(game.snapshot().relics),[]);
  }
});

test('duplicate removal and evolution change exactly one physical copy, with no cancel side effects', () => {
  for(const mode of ['remove','evolve']) {
    const game=sanctuary(),original=plain(game.exportSave());
    const open=()=>step(game,'chooseSanctuary',mode);
    open();step(game,mode==='remove'?'cancelRemoval':'cancelEvolution');
    assert.deepEqual(plain(game.exportSave()),original,'cancel restores exact state and RNG');
    open();const before=game.snapshot();
    step(game,mode==='remove'?'removeCard':'evolve','basicStrike');
    const after=game.snapshot();assert.equal(count(after.deck,'basicStrike'),count(before.deck,'basicStrike')-1);
    assert.equal(count(after.deck,'basicWard'),5);
    assert.equal(after.deck.length,mode==='remove'?9:10);
    if(mode==='evolve'){assert.equal(count(after.deck,'basicStrike+'),1);assert.deepEqual(plain(after.upgrades),['basicStrike+']);}
    else assert.deepEqual(plain(after.removed),['basicStrike']);
    denied(game,mode==='remove'?'removeCard':'evolve','basicStrike');
    step(game,'nextBattle');
    if(mode==='evolve')assert(game.snapshot().hand.includes('basicStrike+'));
    assert.deepEqual(sorted(zones(game.snapshot())),sorted(game.snapshot().deck));
  }
});

test('all 108 first/late sanctuary, camp and route combinations save at every transition through completion', () => {
  let completed=0;
  for(const route of ['moon','forge'])for(const chapter of ['library','wind','causeway'])
  for(const early of ['rest','evolve','remove'])for(const late of ['rest','evolve','remove'])for(const camp of ['rest','remove']) {
    const g=engine.createGame(engine.seededRandom(55));step(g,'start');
    for(let battle=1;battle<=6;battle++) {
      win(g);step(g,'openReward');
      if(battle===6)break;
      step(g,'chooseReward',null);
      if(battle===1)step(g,'chooseRoute',route);
      else if(battle===3)step(g,'chooseChapter',chapter);
      else if(battle===5){step(g,'chooseCamp',camp);if(camp==='remove'){step(g,'cancelRemoval');step(g,'chooseCamp',camp);step(g,'removeCard','basicWard');}}
      else {const choice=battle===2?early:late;step(g,'chooseSanctuary',choice);if(choice==='evolve')step(g,'evolve','basicStrike');if(choice==='remove')step(g,'removeCard','basicWard');}
      step(g,'nextBattle');
    }
    assert.equal(g.snapshot().phase,'complete');assert.equal(g.snapshot().wins,6);
    assert.equal(g.snapshot().removed.length,Number(early==='remove')+Number(late==='remove')+Number(camp==='remove'));
    assert.equal(g.snapshot().upgrades.length,Number(early==='evolve')+Number(late==='evolve'));
    assert.equal(g.snapshot().deck.length,10-g.snapshot().removed.length);
    if(early==='remove'&&late==='remove'&&camp==='remove'){assert.equal(count(g.snapshot().deck,'basicWard'),2);assert.deepEqual(plain(g.snapshot().removed),Array(3).fill('basicWard'));}
    denied(g,'nextBattle');denied(g,'openReward');completed++;
  }
  assert.equal(completed,108);
});

test('failed payments, invalid indices, invalid choices and operations in the wrong phase are atomic', () => {
  const game=fixture(['bolt','basicStrike'],{energy:0});
  for(const index of [-1,2,1.5,NaN,Infinity,'0',null,undefined])denied(game,'play',index);
  denied(game,'play',0);
  for(const [method,arg]of [['start'],['selectOrigin','storm'],['openReward'],['chooseReward',null],['chooseRoute','moon'],['chooseChapter','wind'],['chooseSanctuary','rest'],['chooseCamp','rest'],['evolve','basicStrike'],['removeCard','basicStrike'],['cancelRemoval'],['cancelEvolution'],['chooseRelic','emberCore'],['cancelRelic'],['nextBattle']])denied(game,method,arg);
  step(game,'play',1);assert.equal(game.snapshot().energy,0);step(game,'endTurn');assert.equal(game.snapshot().energy,1);
});

test('attack classification and overkill preserve real damage; zero-cost defense never consumes focus', () => {
  assert.equal(engine.card('basicStrike').isAttack,true);
  assert.equal(engine.card('basicWard').isAttack,false);
  const ward=fixture(['basicWard'],{focus:9,energy:0});step(ward,'play',0);assert.equal(ward.snapshot().focus,9);assert.equal(ward.snapshot().spellCount,0);
  const lethal=fixture(['basicStrike','basicStrike'],{enemyHp:1,energy:0});step(lethal,'play',0);assert.equal(lethal.snapshot().stats.dealt,1);denied(lethal,'play',0);
});

test('version/ruleset confusion, broken new provenance, zones, HP and routes are rejected without live changes', () => {
  const live=fixture(['basicStrike'],{energy:0}),before=plain(live.exportSave());
  const edits=[
    x=>{x.version=3;},x=>{x.version=5;},x=>{x.format='other';},x=>{x.rngState=-1;},x=>{x.rngState=4294967296;},x=>{x.rngState=1.5;},
    x=>{delete x.state.ruleset;},x=>{x.state.ruleset='classic';},x=>{delete x.state.earlyRemoval;},x=>{x.state.earlyRemoval='basicWard';},x=>{x.state.earlyRemoval=[];},
    x=>{x.state.enemyMaxHp=48;},x=>{x.state.enemyHp=0;},x=>{x.state.hp=-1;},x=>{x.state.hp=0;},x=>{x.state.energy=6;},x=>{x.state.deck.pop();},x=>{x.state.hand.push('basicStrike');},x=>{x.state.deck[0]='missing';},
    x=>{x.state.route='forge';},x=>{x.state.phase='astrolabe';},x=>{x.state.relics=['emberCore'];},x=>{x.state.removalSource='sanctuary';},x=>{x.state.chapter2Options.library='archive';},x=>{x.state.chapter2Encounter='starDial';}
  ];
  for(const mutate of edits){const bad=plain(before);mutate(bad);assert.equal(live.restoreSave(bad),false);assert.deepEqual(plain(live.exportSave()),before);}
  for(const bad of [null,{},[],{...before,state:null},{...before,state:[]},{...before,state:{...before.state,flags:null}}]){assert.equal(live.restoreSave(bad),false);assert.deepEqual(plain(live.exportSave()),before);}
  const old=engine.createGame(engine.seededRandom(2),{ruleset:'classic'});old.start();const oldSave=plain(old.exportSave());
  for(const key of ['ruleset','earlyRemoval']){const bad=plain(oldSave);bad.state[key]=key==='ruleset'?'growth-v1':null;assert.equal(live.restoreSave(bad),false);assert.deepEqual(plain(live.exportSave()),before);}
});

test('early-removal provenance persists after first sanctuary and rejects mismatched or missing markers', () => {
  const game=sanctuary();step(game,'chooseSanctuary','remove');step(game,'removeCard','basicWard');
  for(const advance of [false,true]){
    if(advance)step(game,'nextBattle');
    const save=plain(game.exportSave());
    for(const badMarker of [null,'basicStrike','basicWard+']){const bad=plain(save);bad.state.earlyRemoval=badMarker;assert.equal(game.restoreSave(bad),false);assert.deepEqual(plain(game.exportSave()),save);}
  }
});

test('fresh defeat saves are deterministic terminal states, including repeated operations', () => {
  const game=fixture(['basicWard'],{hp:1,energy:0});step(game,'endTurn');
  assert.equal(game.snapshot().phase,'defeat');assert.equal(game.snapshot().hp,0);assert.equal(game.snapshot().wins,0);
  for(const method of ['endTurn','openReward','nextBattle','start'])denied(game,method);
  denied(game,'play',0);
});

test('36 natural seeded growth runs replay identically with restoration before every action', () => {
  for(const origin of ['frost','storm','mirror'])for(let seed=1;seed<=12;seed++){
    const game=engine.createGame(engine.seededRandom(seed));step(game,'selectOrigin',origin);
    let terminal=false;
    for(let actions=0;actions<1000;actions++){
      const s=game.snapshot();let command;
      if(s.phase==='battle'){
        const choices=s.hand.map((_,i)=>[i,game.previewCard(i)]).filter(([,c])=>c.cost<=s.energy).sort((a,b)=>(b[1].actualDamage+b[1].actualBlock*.6+b[1].actualDraw*3)-(a[1].actualDamage+a[1].actualBlock*.6+a[1].actualDraw*3));
        command=choices.length?['play',choices[0][0]]:['endTurn'];
      }else command={intro:['start'],victory:['openReward'],reward:['chooseReward',game.rewardOptions()[seed%4]],route:['chooseRoute',seed%2?'moon':'forge'],sanctuary:['chooseSanctuary','evolve'],evolve:['evolve',game.upgradeOptions()[0]],chapter:['chooseChapter',['library','wind','causeway'][seed%3]],camp:['chooseCamp',seed%2?'rest':'remove'],remove:['removeCard',game.removeOptions().find(id=>id==='basicWard')||game.removeOptions()[0]],ready:['nextBattle']}[s.phase];
      if(!command){assert(['complete','defeat'].includes(s.phase));terminal=true;break;}
      step(game,...command);
    }
    assert(terminal,`${origin}/${seed} terminates within a generous safety bound`);
  }
});

test('all historical fixture saves retain exact v3 envelopes, rewards, RNG and old encounters', () => {
  const saves=[...JSON.parse(read('tests/fixtures/astral-v48-synthetic.json')).fixtures.map(x=>x.save),...Object.values(JSON.parse(read('tests/fixtures/astral-v411-baseline.json')).saves),...Object.values(JSON.parse(read('tests/fixtures/astral-v412-baseline.json')).saves)];
  for(const saved of saves){const game=restore(saved);assert.equal(game.exportSave().version,3);assert(!Object.hasOwn(game.snapshot(),'ruleset'));if(saved.state.phase==='reward')denied(game,'openReward');if(saved.state.phase==='battle')step(game,'endTurn');}
});

test('v1/v2 migrations stay classic with exact state, RNG and deterministic next actions', () => {
  for(const old of [context.ShinkaPlanningV1,context.ShinkaPlanningV2])for(const origin of ['frost','storm','mirror'])for(const phase of ['intro','battle']){
    assert(old,'both legacy engines loaded');const source=old.createGame(old.seededRandom(77));source.selectOrigin(origin);if(phase==='battle')source.start();
    const saved=plain(source.exportSave()),game=engine.createGame(engine.seededRandom(99));assert.equal(game.restoreSave(saved),true);
    assert.equal(game.exportSave().version,3);assert.equal(game.exportSave().rngState,saved.rngState);assert(!Object.hasOwn(game.snapshot(),'ruleset'));
    assert.deepEqual(plain(game.snapshot().deck),plain(source.snapshot().deck));assert.deepEqual(plain(game.snapshot().hand),plain(source.snapshot().hand));assert.equal(game.snapshot().enemyMaxHp,48);
    assert.deepEqual(plain(game.snapshot().chapter2Options),{library:'bowWatcher',wind:'bellSpirit'});
    if(phase==='intro')step(game,'start');else step(game,'endTurn');
  }
});

test('zero-damage semantic probe still counts a hand attack and breaks a three-card chant', () => {
  // An isolated catalog probe covers the zero value explicitly without changing
  // the real catalog or using a fabricated public card ID.
  const isolated = {};
  const source = read('v4-1/planning-engine.js').replace("cost: 0, damage: 3, family: 'basic'", "cost: 0, damage: 0, family: 'basic'");
  assert.notEqual(source, read('v4-1/planning-engine.js'));
  vm.runInNewContext(source, isolated);
  const E = isolated.ShinkaV43, game = E.createGame();
  const save = fixture(['basicStrike','basicStrike','basicStrike'], {turn:2,energy:0}, {battle:4}).exportSave();
  assert.equal(game.restoreSave(plain(save)), true);
  assert.equal(E.card('basicStrike').isAttack, true);
  assert.match(E.card('basicStrike').text, /0ダメージ/);
  const hp = game.snapshot().enemyHp, dealt = game.snapshot().stats.dealt;
  for (let n=1;n<=3;n++) {
    assert.equal(game.previewCard(0).actualDamage,0);
    assert.equal(game.play(0),true);
    assert.equal(game.snapshot().spellCount,n);
    assert.equal(game.intent().perHit,4-n);
    const copy=E.createGame();assert.equal(copy.restoreSave(plain(game.exportSave())),true);
  }
  assert.equal(game.snapshot().enemyHp,hp);
  assert.equal(game.snapshot().energy,0);
  assert.equal(game.snapshot().stats.dealt,dealt);
  assert.equal(game.snapshot().interrupted,true);
});

test('a newly acquired unique reward can be evolved or removed without ghost copies in its next opening', () => {
  for (const mode of ['evolve','remove']) {
    const game=restore(battleBase(2));win(game);step(game,'openReward');
    const id=game.rewardOptions()[0];assert.equal(count(game.snapshot().deck,id),0);
    step(game,'chooseReward',id);assert.equal(count(game.snapshot().deck,id),1);
    step(game,'chooseSanctuary',mode);step(game,mode==='evolve'?'evolve':'removeCard',id);
    if(mode==='remove')assert.equal(game.snapshot().lastReward,null);
    const ui={window:{},document:{querySelector:()=>({content:{querySelector:()=>({getAttribute:()=>'/test-art.webp'})}})}};
    vm.runInNewContext(read('v4-1/journey-visual.js'),ui);
    const preview=ui.window.ShinkaJourney.ready(game.snapshot(),engine.GROWTH_ENEMIES.trial,engine.card);
    if(mode==='evolve'){
      assert(preview.includes('初手：'+engine.card(id+'+').name));
      assert(!preview.includes(engine.card(id).name+'・'),'old unevolved ghost must not be advertised');
    } else assert(!preview.includes('初手：'),'removed unique reward must not be advertised');
    step(game,'nextBattle');
    assert.equal(count(game.snapshot().deck,id),0);
    assert.equal(count(zones(game.snapshot()),id),0);
    if(mode==='evolve'){assert.equal(count(game.snapshot().deck,id+'+'),1);assert.equal(count(game.snapshot().hand,id+'+'),1);}
    else assert.equal(game.snapshot().deck.length,10);
  }
});

test('all thirteen growth QA fixtures restore and its harness keeps storage, PWA and navigation isolated', () => {
  const data=JSON.parse(read('ui-qa/growth-fixtures.json'));
  assert.equal(Object.keys(data).length,13);
  for(const [name,wrapper]of Object.entries(data)) {
    assert.equal(wrapper.version,1,name);
    const game=restore(wrapper.engine);roundtrip(game);
    assert.equal(game.exportSave().version,name.startsWith('classic')?3:4);
    if(name==='basics')assert.equal(game.snapshot().enemyMaxHp,15);
    if(name==='classicBattle')assert.equal(game.snapshot().enemyMaxHp,48);
  }
  const html=read('ui-qa/growth.html');
  assert(html.includes('sandbox="allow-scripts"'));
  assert(!html.includes('allow-same-origin'));
  assert(html.includes("Object.defineProperty(window,'localStorage'"));
  assert(html.includes('configurable:false'));
  assert(html.includes('script[src="./pwa.js"]'));
  assert(html.includes("link.removeAttribute('href')"));
  assert(html.includes("replace('<head>','<head>'+isolation)"),'shadow storage before game scripts');
  assert(!html.includes('navigator.serviceWorker.register'));
});

test('UI story rendering uses each saved ruleset for sanctuary choices and next-enemy preview', () => {
  const src=read('v4-1/planning-game.js');
  const story=src.slice(src.indexOf('  function storyContent(s) {'),src.indexOf('  function render() {'));
  assert(story.includes('ENEMIES = enemiesFor(s)'));
  assert.match(src,/const s = game\.snapshot\(\); ENEMIES = enemiesFor\(s\); const e = ENEMIES\[s\.enemyId\]/);
  const data=JSON.parse(read('ui-qa/growth-fixtures.json'));
  const fakeElement={innerHTML:'',content:{querySelector:()=>({getAttribute:()=>'/test-art.webp'})}};
  const ui={...engine, game:null, migrationRaw:null,pendingSave:null,hadStoredSave:false,
    $:()=>fakeElement,button:(id,label)=>`<button data-action="${id}">${label}</button>`,
    relic:()=>'',choiceCard:()=>'',stats:()=>'',runCode:()=>'',
    ShinkaJourney:{hp:()=>'',map:()=>'',route:()=>'',ready:(_s,e)=>`enemy-preview-hp:${e.hp}`}};
  vm.runInNewContext(story+';globalThis.renderStory=storyContent;',ui);
  for(const [name,isGrowth]of [['firstCamp',true],['classicCamp',false]]) {
    ui.game=restore(data[name].engine);const html=ui.renderStory(ui.game.snapshot());
    assert(html.includes('data-sanctuary="rest"'));assert(html.includes('data-sanctuary="evolve"'));
    assert.equal(html.includes('data-sanctuary="remove"'),isGrowth);
    assert.equal(html.includes('data-sanctuary="relic"'),!isGrowth);
  }
  ui.game=restore(data.rewardReady.engine);assert(ui.renderStory(ui.game.snapshot()).includes('enemy-preview-hp:36'));
  ui.game=restore(data.upgradedReady.engine);assert(ui.renderStory(ui.game.snapshot()).includes('enemy-preview-hp:52'));
  ui.game=restore(data.classicCamp.engine);step(ui.game,'chooseSanctuary','rest');assert(ui.renderStory(ui.game.snapshot()).includes('enemy-preview-hp:70'));
  assert(src.includes("enemyPattern(enemyId,s)"));
  assert(read('v4-1/planning.html').includes('新しい成長試遊の基本デッキから始め直します'));
});

test('coverage includes every reachable growth phase and classic-only astrolabe remains separately pinned', () => {
  assert.deepEqual(sorted(phasesSeen),sorted(['intro','battle','victory','defeat','complete','reward','route','chapter','sanctuary','evolve','camp','remove','ready']));
});
