// Bounded analysis only. Does not change production code, decks, localStorage, or saves.
// Run: node tools/astral-noa-balance.mjs --seeds=12 --reward-seeds=512 > design/noa-balance-results.json
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const startedAt = new Date().toISOString();
const source = fs.readFileSync(new URL('../v4-1/planning-engine.js', import.meta.url), 'utf8');
const argument = (key, fallback) => Number(process.argv.find(a => a.startsWith(`--${key}=`))?.split('=')[1] ?? fallback);
const sampleSeeds = argument('seeds', 12), rewardSeeds = argument('reward-seeds', 512);
const beamWidth = argument('beam', 10), maxCards = 10, maxTurns = 60;
for (const [name,value,max] of [['seeds',sampleSeeds,256],['reward-seeds',rewardSeeds,4096],['beam',beamWidth,64]]) assert(Number.isInteger(value) && value >= 1 && value <= max, `Invalid ${name}`);
const origins = ['frost', 'storm', 'mirror'], newIds = ['starRelay', 'quietComet', 'mirrorLance', 'starBookmark'];
const plain = x => JSON.parse(JSON.stringify(x));
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
function load({ weak = false, old = false } = {}) {
  let code = source;
  if (old) for (const id of newIds) code = code.replace(new RegExp(`^    ${id}:.*\\n`, 'm'), '');
  if (weak) {
    code = code.replace("    guard: {", "    faintWard: { name: 'かすかな光（比較用）', cost: 1, block: 5, family: 'guard', art: 'guard' },\n    guard: {");
    code = code.replace("if (c.block) c.block += c.base === 'emberVeil' ? 2 : 3;", "if (c.block) c.block += c.base === 'faintWard' ? 6 : c.base === 'emberVeil' ? 2 : 3;");
    code = code.replaceAll("deck: ['ice','guard'", "deck: ['ice','faintWard'");
    // Prototype-only card never joins rewards, including after battle 2.
    code = code.replace('Object.keys(CARDS).filter(id => !offers.includes(id)', "Object.keys(CARDS).filter(id => id !== 'faintWard' && !offers.includes(id)");
  }
  // Analysis clones avoid repeatedly validating known internally generated states.
  // Fabricated fixtures are explicitly labeled; no external/user save is loaded here.
  code = code.replace('return { snapshot, selectOrigin,', 'return { __analysisRestore(save) { s = JSON.parse(JSON.stringify(save.state)); rng = seededRandom(save.rngState); }, snapshot, selectOrigin,');
  const context = {}; vm.runInNewContext(code, context); return context.ShinkaV43;
}
const E = load(), W = load({ weak: true }), O = load({ old: true });
assert.equal(Object.keys(E.CARDS).length, 38); assert.equal(Object.keys(O.CARDS).length, 34);
for (const origin of origins) {
  assert.equal(E.ORIGINS[origin].deck.length, 10); assert.equal(W.ORIGINS[origin].deck.length, 10);
  assert.equal(W.ORIGINS[origin].deck.filter(x => x === 'faintWard').length, 1);
  assert.deepEqual(plain(W.ORIGINS[origin].deck).map(x => x === 'faintWard' ? 'guard' : x), plain(E.ORIGINS[origin].deck));
}
assert.equal(W.card('faintWard+').block, 11);
const clone = (engine, save) => { const g = engine.createGame(engine.seededRandom(1)); g.__analysisRestore(save); return g; };
let expandedNodes = 0;
function terminalValue(before, after) {
  // An entire turn's actual enemy response, plus transparent residual-resource heuristics.
  const dealt = after.stats.dealt - before.stats.dealt;
  const taken = after.stats.taken - before.stats.taken;
  const heal = after.stats.healed - before.stats.healed;
  return dealt - taken * 2.0 + heal * 1.6 + after.energy * 2.0 + after.block * .65 + after.focus * .65 + after.weaken * .65
    + (after.phase === 'victory' ? 1000 : after.phase === 'defeat' ? -10000 : 0);
}
function stateKey(s) {
  return JSON.stringify([s.phase,s.hp,s.enemyHp,s.energy,s.block,s.focus,s.weaken,s.reflect,s.pendingBlock,s.pendingFocus,s.turnLastAttack,s.usedExhaustThisTurn,s.turnDamage,s.spellCount,s.interrupted,s.flags,s.hand,s.draw,s.discard,s.exhaust]);
}
function planTurn(engine, game) {
  const before = game.snapshot();
  let beam = [{ save: game.exportSave(), plays: [] }], best = null;
  for (let depth = 0; depth <= maxCards && beam.length; depth++) {
    const next = [], seen = new Set();
    for (const node of beam) {
      const g = clone(engine, node.save), s = g.snapshot();
      const ended = clone(engine, node.save); if (s.phase === 'battle') ended.endTurn();
      const endState = ended.snapshot(), value = terminalValue(before, endState);
      if (!best || value > best.value + 1e-9 || (Math.abs(value - best.value) < 1e-9 && node.plays.length < best.plays.length)) best = { value, plays: node.plays };
      if (depth === maxCards || s.phase !== 'battle') continue;
      const used = new Set();
      for (let i = 0; i < s.hand.length; i++) {
        if (used.has(s.hand[i]) || g.previewCard(i).cost > s.energy) continue;
        used.add(s.hand[i]);
        const child = clone(engine, node.save); child.play(i); expandedNodes++;
        const childState = child.snapshot(), key = stateKey(childState); if (seen.has(key)) continue; seen.add(key);
        const probe = clone(engine, child.exportSave()); if (childState.phase === 'battle') probe.endTurn();
        // Extra potential prevents pruning focus/energy/draw setup before its payoff.
        const remaining = childState.hand.filter(id => engine.card(id).isAttack).length;
        const rank = terminalValue(before, probe.snapshot()) + (remaining ? childState.focus * .8 : 0) + Math.min(childState.hand.length, 7) * .1;
        next.push({ save: child.exportSave(), plays: [...node.plays, i], rank });
      }
    }
    beam = next.sort((a,b) => b.rank-a.rank).slice(0, beamWidth);
  }
  for (const i of best.plays) assert.equal(game.play(i), true);
  if (game.snapshot().phase === 'battle') game.endTurn();
}
function fight(engine, game) {
  const initial = game.snapshot(), turns = [];
  for (let n = 0; n < maxTurns && game.snapshot().phase === 'battle'; n++) {
    const before = game.snapshot(); planTurn(engine, game); const after = game.snapshot();
    turns.push({ turn: before.turn, hpLoss: after.stats.taken-before.stats.taken });
  }
  const s = game.snapshot();
  return { battle: initial.battle, enemy: initial.enemyId, result: s.phase, win: s.phase === 'victory', startHp: initial.hp, endHp: s.hp,
    damageTaken: s.stats.taken-initial.stats.taken, damageDealt: s.stats.dealt-initial.stats.dealt, turns: s.turn-initial.turn+1,
    exposedTurns: turns.filter(t=>t.hpLoss>0).length, maxTurnHpLoss: Math.max(0,...turns.map(t=>t.hpLoss)) };
}
function progress(engine, origin, seed, weakMode) {
  const g = engine.createGame(engine.seededRandom(seed)); g.selectOrigin(origin); g.start();
  const battles = [], decisionBranches = [];
  for (let b = 1; b <= 3; b++) {
    const result = fight(engine, g); battles.push(result); if (!result.win || b === 3) break;
    g.openReward(); g.chooseReward(null); // Controlled no-addition comparison: exactly one starter differs.
    if (b === 1) { g.chooseRoute('moon'); g.nextBattle(); }
    else {
      const save = g.exportSave();
      for (const choice of ['rest', ...g.upgradeOptions().map(id=>`evolve:${id}`)]) {
        const branch = clone(engine, save);
        if (choice === 'rest') branch.chooseSanctuary('rest');
        else { branch.chooseSanctuary('evolve'); branch.evolve(choice.slice(7)); }
        branch.nextBattle(); const battle = fight(engine, branch);
        decisionBranches.push({ choice, ...battle });
      }
      // Main paired line is always rest; branch results remain an independent matched comparison.
      g.chooseSanctuary('rest'); g.nextBattle();
    }
  }
  return { origin, seed, prototype: weakMode, battles, decisionBranches };
}
const mean = xs => xs.length ? +(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(3) : null;
function summarizePaired(normal, weak) {
  return [1,2,3].map(b=>{
    const pairs = normal.map((n,i)=>[n.battles.find(x=>x.battle===b),weak[i].battles.find(x=>x.battle===b)]).filter(p=>p.every(Boolean));
    return { battle:b, pairedAttempts:pairs.length, currentWins:pairs.filter(p=>p[0].win).length, prototypeWins:pairs.filter(p=>p[1].win).length,
      currentMeanDamage:mean(pairs.map(p=>p[0].damageTaken)), prototypeMeanDamage:mean(pairs.map(p=>p[1].damageTaken)),
      meanPairedDamageDelta:mean(pairs.map(p=>p[1].damageTaken-p[0].damageTaken)),
      meanPairedEndHpDelta:mean(pairs.map(p=>p[1].endHp-p[0].endHp)),
      currentMeanTurns:mean(pairs.map(p=>p[0].turns)), prototypeMeanTurns:mean(pairs.map(p=>p[1].turns)),
      currentMeanExposedTurns:mean(pairs.map(p=>p[0].exposedTurns)), prototypeMeanExposedTurns:mean(pairs.map(p=>p[1].exposedTurns)),
      prototypeMoreDamage:pairs.filter(p=>p[1].damageTaken>p[0].damageTaken).length, prototypeLessDamage:pairs.filter(p=>p[1].damageTaken<p[0].damageTaken).length };
  });
}
function branchSummary(rows) {
  const byChoice = {};
  for (const row of rows) for (const branch of row.decisionBranches) {
    (byChoice[branch.choice] ??= []).push(branch);
  }
  return Object.fromEntries(Object.entries(byChoice).map(([choice,bs])=>[choice,{ attempts:bs.length,wins:bs.filter(x=>x.win).length,meanEndHp:mean(bs.map(x=>x.endHp)),meanDamage:mean(bs.map(x=>x.damageTaken)),meanTurns:mean(bs.map(x=>x.turns)) }]));
}
function fixture(engine, changes, seed=7) {
  const g=engine.createGame(engine.seededRandom(seed)); g.start(); const save=g.exportSave();
  Object.assign(save.state,changes); g.__analysisRestore(save); return g;
}
function scenario(changes, plays, endTurns=1) {
  const g=fixture(E,{ origin:'frost', hp:60,enemyHp:60,enemyMaxHp:76,enemyId:'bowWatcher',battle:4,turn:1,energy:5,flags:{},...changes });
  const before=g.snapshot(), previews=[];
  for(const id of plays){const i=g.snapshot().hand.indexOf(id);assert(i>=0);previews.push(g.previewCard(i));assert(g.play(i));}
  const afterPlay=g.snapshot(), intentBeforeEnd=g.intent();
  for(let t=0;t<endTurns&&g.snapshot().phase==='battle';t++)g.endTurn();
  const after=g.snapshot();
  return { plays, previews:previews.map(c=>({id:c.id,damage:c.actualDamage,block:c.actualBlock,nextBlock:c.actualNextBlock,consumeReflect:c.actualConsumedReflect,recycleTarget:c.recycleTargetId})),
    damageDealt:after.stats.dealt-before.stats.dealt, damageTaken:after.stats.taken-before.stats.taken,
    immediateEnemyDamage:before.enemyHp-afterPlay.enemyHp, reflected:after.stats.reflected-before.stats.reflected,
    afterPlayBlock:afterPlay.block,afterPlayReflect:afterPlay.reflect,pendingBlock:afterPlay.pendingBlock,
    enemyHp:after.enemyHp,hp:after.hp,turn:after.turn,block:after.block,energy:after.energy,hand:after.hand,
    intentBeforeEnd:{type:intentBeforeEnd.type,hpLoss:intentBeforeEnd.hpLoss,broken:intentBeforeEnd.broken},pendingBlockAfter:after.pendingBlock };
}
function scriptedReplay(useBookmark, playWeakAttackLast = false) {
 const g=fixture(E,{origin:'frost',hp:60,enemyHp:60,enemyMaxHp:76,enemyId:'bowWatcher',battle:4,turn:1,energy:4,flags:{},
   hand:['bolt',...(playWeakAttackLast?['spark']:[]),'starBookmark'],draw:['light','focus','guard','ice','charge','meditate'],discard:[],exhaust:[]});
 const play=id=>{const index=g.snapshot().hand.indexOf(id);assert(index>=0);assert(g.play(index));};
 play('bolt');if(playWeakAttackLast)play('spark');if(useBookmark)play('starBookmark');g.endTurn();
 const nextHand=g.snapshot().hand;const repeated=useBookmark?(playWeakAttackLast?'spark':'bolt'):null;if(repeated)play(repeated);g.endTurn();
 const s=g.snapshot();return {useBookmark,playWeakAttackLast,nextHand,replayed:repeated,damageDealt:s.stats.dealt,damageTaken:s.stats.taken,endingEnergy:s.energy};
}
function directScenarios(){
 const clean={hand:[],draw:['light','focus','spark','guard','ice','charge','meditate','bolt','starWait','mirror'],discard:[],exhaust:[]};
 const comet={...clean,hand:['quietComet'],energy:2};
 const relay={...clean,hand:['guard','starRelay'],energy:1};
 const lance={...clean,enemyId:'archive',enemyMaxHp:68,enemyHp:60,turn:1,hand:['mirrorLance'],reflect:5,energy:1};
 const bookmark={...clean,hand:['bolt','starBookmark'],energy:4};
 const cases={
   quietCometRecover:scenario({...comet,turn:1},['quietComet']), quietCometHeavy:scenario({...comet,turn:2},['quietComet']),
   boltRecover:scenario({...comet,hand:['bolt'],turn:1},['bolt']),boltHeavy:scenario({...comet,hand:['bolt'],turn:2},['bolt']),
   starRelayRestThenHeavy:scenario({...relay,turn:1},['guard','starRelay'],2),guardRestThenHeavy:scenario({...relay,turn:1},['guard'],2),
   starRelayDuringHeavy:scenario({...relay,turn:2},['guard','starRelay']),guardDuringHeavy:scenario({...relay,turn:2},['guard']),
   mirrorLanceTriple:scenario(lance,['mirrorLance']),holdReflectionTriple:scenario(lance,[]),
   mirrorLanceRecover:scenario({...lance,turn:3},['mirrorLance']),holdReflectionRecover:scenario({...lance,turn:3},[]),
   mirrorLanceBreak:scenario({...lance,enemyId:'bowWatcher',enemyMaxHp:76,turn:2},['mirrorLance']),holdReflectionHeavy:scenario({...lance,enemyId:'bowWatcher',enemyMaxHp:76,turn:2},[]),
   bookmarkHeavyReplay:scenario(bookmark,['bolt','starBookmark']),withoutBookmarkHeavyReplay:scenario(bookmark,['bolt']),
   bookmarkWrongOrder:scenario({...bookmark,hand:['bolt','spark','starBookmark']},['bolt','spark','starBookmark']),
   bookmarkTwoTurnReplay:scriptedReplay(true),noBookmarkTwoTurnReplay:scriptedReplay(false),bookmarkTwoTurnWrongOrder:scriptedReplay(true,true)
 };
 assert.equal(cases.quietCometRecover.immediateEnemyDamage,20);assert.equal(cases.quietCometHeavy.immediateEnemyDamage,10);
 assert.equal(cases.starRelayRestThenHeavy.damageTaken,10);assert.equal(cases.guardRestThenHeavy.damageTaken,18);
 assert.equal(cases.starRelayDuringHeavy.damageTaken,18);assert.equal(cases.guardDuringHeavy.damageTaken,10);
 assert.equal(cases.mirrorLanceTriple.damageDealt,14);assert.equal(cases.holdReflectionTriple.damageDealt,15);
 assert.equal(cases.mirrorLanceBreak.damageTaken,8);assert.equal(cases.holdReflectionHeavy.damageTaken,18);
 assert.equal(cases.bookmarkHeavyReplay.hand[0],'bolt');assert(!cases.withoutBookmarkHeavyReplay.hand.includes('bolt'));
 assert.equal(cases.bookmarkWrongOrder.hand[0],'spark');
 assert.equal(cases.bookmarkTwoTurnReplay.damageDealt,28);assert.equal(cases.bookmarkTwoTurnReplay.damageTaken,8);
 assert.equal(cases.noBookmarkTwoTurnReplay.damageDealt,14);assert.equal(cases.noBookmarkTwoTurnReplay.damageTaken,18);
 return cases;
}
function rewardSampling(){
 const result={samplesPerBattle:rewardSeeds*origins.length,battles:[]};
 for(let battle=1;battle<=5;battle++){
  const row={battle,oldCounts:{},newCounts:{},newCardOffers:0,duplicateOffers:0,protectedSlotMismatches:0,newCardProtectedSlots:0};
  for(const origin of origins)for(let seed=1;seed<=rewardSeeds;seed++){
   const offers=[];
   for(const engine of [O,E]){const g=fixture(engine,{phase:'victory',origin,battle,enemyHp:0},seed);g.openReward();offers.push(plain(g.rewardOptions()));}
   for(const [i,label]of ['oldCounts','newCounts'].entries())for(const id of offers[i])row[label][id]=(row[label][id]||0)+1;
   row.newCardOffers+=offers[1].filter(id=>newIds.includes(id)).length;
   row.duplicateOffers+=Number(new Set(offers[1]).size!==4);
   row.protectedSlotMismatches+=Number(offers[0].slice(0,2).join()!==offers[1].slice(0,2).join());
   row.newCardProtectedSlots+=offers[1].slice(0,2).filter(id=>newIds.includes(id)).length;
  }
  assert.equal(row.duplicateOffers,0);assert.equal(row.protectedSlotMismatches,0);assert.equal(row.newCardProtectedSlots,0);
  if(battle===1){assert.equal(row.newCounts.starRelay||0,0);assert.equal(row.newCounts.mirrorLance||0,0);}
  row.newShareOfGeneralSlots=+(row.newCardOffers/(rewardSeeds*origins.length*2)).toFixed(4);result.battles.push(row);
 }
 return result;
}
function laterBranchFixtures(engine,label){
 const rows=[];
 // Controlled later sanctuaries: not survivor-selected, not claimed to be reachable runs.
 // 12-card decks = origin 10 + bolt + frostWard. Weak/common guard remains exactly once.
 for(const origin of origins)for(let seed=1;seed<=Math.min(sampleSeeds,4);seed++)for(const hp of [20,50])for(const stage of [4,5]){
  const deck=[...engine.ORIGINS[origin].deck,'bolt','frostWard'];
  const g=fixture(engine,{origin,deck,hand:[],draw:[...deck],discard:[],exhaust:[],phase:stage===4?'sanctuary':'camp',battle:stage,hp,
    enemyId:stage===4?'bowWatcher':'elite',enemyHp:0,route:'moon',route2:'library',chapter2Encounter:'bowWatcher',insight:true,wins:stage,
    rewards:['bolt','frostWard'],history:[],stats:{played:{},dealt:0,taken:0,healed:0,energyGained:0,blocked:0,reflected:0,interrupts:0,relics:0}},seed);
  const ward=label==='weak'?'faintWard':'guard';
  const choices=['rest',`remove:${ward}`,'remove:focus',...(stage===4?[`evolve:${ward}`,'evolve:bolt']:[])];
  const branches=[];
  for(const choice of choices){const b=clone(engine,g.exportSave());const [action,id]=choice.split(':');
    if(stage===4)b.chooseSanctuary(action);else b.chooseCamp(action);
    if(action==='remove')assert(b.removeCard(id));if(action==='evolve')assert(b.evolve(id));assert(b.nextBattle());branches.push({choice,...fight(engine,b)});
  }
  rows.push({prototype:label,origin,seed,hp,stage,branches});
 }
 return rows;
}
const report={
 schemaVersion:1,startedAt,command:`node tools/astral-noa-balance.mjs --seeds=${sampleSeeds} --reward-seeds=${rewardSeeds} --beam=${beamWidth} > design/noa-balance-results.json`,
 sourceSha256:hash(source),harnessSha256:hash(fs.readFileSync(new URL(import.meta.url),'utf8')),nodeVersion:process.version,productionSource:'v4-1/planning-engine.js',
 scope:'Non-shipping, in-memory counterfactuals. Production starter decks and saves unchanged.',
 philosophy:['Situational strengths and weaknesses, not universally superior cards.','Visible enemy intent should change the correct play.','Skipping and removing cards are choices; evolving the weak starter is a competing investment.'],
 policy:{name:'bounded full-turn beam with actual enemy response',beamWidth,maxCards,maxTurns,horizon:'Current player turn and one enemy response; no search into future turns.',
 score:'damage dealt - 2 * damage taken + 1.6 * healing + 2 * carried energy + 0.65 * next-turn block/focus/weakness; victory +1000, defeat -10000',
 bounds:'Heuristic, not optimal. Simulates deterministic draws inside a turn; therefore has oracle knowledge of immediate draw results. Does not value all future card-order effects. Branch comparisons run this same policy over one entire following battle; no rest-only assumption in branch analysis.'},
 assumptions:['Same seeds 1..N and all three origins in paired samples.','Early comparison skips all rewards and always takes moon/rest, isolating the one-card starter change. It does not model reward selection or a natural acquisition meta.','All ten-card starters replace exactly one common guard (8/11 block) with VM-only faintWard (5/11 block). Guard remains a normal reward.','Battle-2 sanctuary compares rest against every available single-card evolution from the identical save. It evaluates only battle 3, not whole-run optimality.','Later branches use explicit synthetic 12-card deck states, HP 20/50, library route, seeds 1..min(N,4), no relics. They compare rest/removal/evolution at battle 4 and rest/removal at battle 5. These are controlled opportunity-cost tests, not naturally observed run frequencies.','Rewards use identical post-victory RNG state and origin across old 34/new 38 pool sampling; fixed first two slots are checked. Weak prototype is excluded from rewards.','Direct fixtures isolate card mechanics; extra cards in fixture draw are deliberate and fixtures do not claim save-valid runs.','Damage taken is stats.taken, not HP delta; healing cannot hide damage. Later-battle paired attempts are survivor-conditioned and counts are shown.','Removal changes both deck density and shuffle length/order. Paired seeds hold the random stream fixed but do not eliminate draw-order variation; individual seed examples are illustrative, not causal estimates of density alone.','Automated outcomes do not measure enjoyment, discoverability, or optimal human play.'],
 directScenarios:directScenarios(),rewardSampling:rewardSampling()
};
console.error('Direct scenarios and reward gates passed. Running paired battles and sanctuary continuations.');
const current=[],weak=[];
for(const origin of origins)for(let seed=1;seed<=sampleSeeds;seed++){
 current.push(progress(E,origin,seed,'current'));weak.push(progress(W,origin,seed,'weak'));
 if(seed===sampleSeeds)console.error(`Early paired samples finished: ${origin}; ${JSON.stringify(summarizePaired(current.filter(r=>r.origin===origin),weak.filter(r=>r.origin===origin)))}`);
}
report.earlyBattles={pairedSummary:summarizePaired(current,weak),byOrigin:Object.fromEntries(origins.map(origin=>[origin,summarizePaired(current.filter(r=>r.origin===origin),weak.filter(r=>r.origin===origin))])),
 afterBattle2Branches:{current:branchSummary(current),weak:branchSummary(weak)},raw:{current,weak}};
report.laterBranchFixtures=[...laterBranchFixtures(E,'current'),...laterBranchFixtures(W,'weak')];
report.laterBranchSummary={};
for(const label of ['current','weak'])for(const stage of [4,5])for(const hp of [20,50]){
 const rows=report.laterBranchFixtures.filter(r=>r.prototype===label&&r.stage===stage&&r.hp===hp);
 const summary=branchSummary(rows.map(r=>({...r,decisionBranches:r.branches})));
 const rankings=rows.map(r=>{const sorted=[...r.branches].sort((a,b)=>Number(b.win)-Number(a.win)||b.endHp-a.endHp||a.turns-b.turns);return {origin:r.origin,seed:r.seed,best:sorted[0].choice,bestEndHp:sorted[0].endHp,bestWin:sorted[0].win};});
 report.laterBranchSummary[`${label}:afterBattle${stage}:hp${hp}`]={summary,rankings};
}
report.branchInterpretation='The best-next-battle rankings are retrospective and oracle-conditioned. Rest/evolve/remove are truly simulated branches, not action names scored by a fixed formula; these rankings are not a deployable long-horizon policy.';
report.finishedAt=new Date().toISOString();report.wallSeconds=+((Date.now()-Date.parse(startedAt))/1000).toFixed(3);report.expandedNodes=expandedNodes;
assert.equal(hash(fs.readFileSync(new URL('../v4-1/planning-engine.js',import.meta.url),'utf8')),report.sourceSha256,'Engine changed during this run: rerun report against final source.');
console.log(JSON.stringify(report,null,2));
