import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {classicSixEncounters,CLASSIC_ENCOUNTER_IDS,longTwelveEncounters,TWELVE_ENCOUNTER_IDS,EXTRA_SIX} from "../v4-1/six-paths-enemy-bridge.mjs";
import { createPilotGame, CARDS, STARTER_DECK } from "../v4-1/six-paths-pilot.mjs";

const attack = (perHit,hits=1,damageType="physical") => ({kind:"attack",label:"試験攻撃",perHit,hits,damageType});
const rest = () => ({kind:"rest",label:"準備",heal:0});
const pilot = (deck,intents=[attack(8)],overrides={}) => createPilotGame({
  deck,intents,hp:30,enemy:{maxHp:100,physicalResist:0,magicResist:0},...overrides
});
function play(g,id) {
  const index=g.snapshot().hand.indexOf(id);
  assert(index>=0,"hand must contain "+id);
  assert.equal(g.play(index),true,"must play "+id);
}
test("text-only pilot defines a small set across six tactical directions",()=>{
  for(const id of STARTER_DECK) assert(CARDS[id],id);
  assert(Object.keys(CARDS).length>=10);
  const html=fs.readFileSync(new URL("../v4-1/six-paths-pilot.html",import.meta.url),"utf8");
  assert.match(html,/six-paths-pilot\.mjs/);
  assert.match(html,/id="hand"/);
  assert.doesNotMatch(html,/<img\b/i);
});
test("non-attacking turns retain mirror protection, ice weakness and poison but expire ordinary guard",()=>{
  const g=pilot(["mirror","guard","poison","frost","bolt"],[rest(),attack(6,2)],{initialEnergy:4});
  play(g,"mirror");play(g,"guard");play(g,"poison");play(g,"frost");
  let s=g.snapshot();
  assert.equal(s.mirrorGuard,6);
  assert.equal(s.guard,5);
  assert.equal(s.poison,2);
  assert.equal(s.weaken,3);
  g.endTurn();s=g.snapshot();
  assert.equal(s.guard,0);
  assert.equal(s.mirrorGuard,6);
  assert.equal(s.mirrorReady,true);
  assert.equal(s.weaken,3);
  assert.equal(s.poison,2);
  assert.equal(s.enemyHp,100);
  g.endTurn();s=g.snapshot();
  // 2x6 - 3 weakness = 9; mirror blocks 6, player takes 3.
  assert.equal(s.hp,27);
  assert.equal(s.enemyHp,92); // mirror reflection 6, then poison 2
  assert.equal(s.mirrorGuard,0);
  assert.equal(s.mirrorReady,false);
  assert.equal(s.weaken,0);
  assert.equal(s.poison,2);
});
test("multiple mirror cards add defense but reflect only once and discard unused defense",()=>{
  const g=pilot(["mirror","mirror","guard","poison","strike"],[attack(4,2)],{initialEnergy:4});
  play(g,"mirror");play(g,"mirror");play(g,"guard");play(g,"poison");
  g.endTurn();
  const s=g.snapshot();
  assert.equal(s.hp,30);
  assert.equal(s.enemyHp,90); // actual block 8 -> reflection 8 + poison 2, not 16
  assert.equal(s.mirrorGuard,0);
  assert.equal(s.guard,0);
  assert.equal(s.mirrorReady,false);
});
test("player reaches HP zero: loss happens before mirror reflection and poison",()=>{
  const g=pilot(["mirror","poison","bolt","guard","strike"],[attack(10)],{hp:3});
  play(g,"mirror");play(g,"poison");
  g.endTurn();
  const s=g.snapshot();
  assert.equal(s.phase,"defeat");
  assert.equal(s.hp,0);
  assert.equal(s.enemyHp,100);
  assert.equal(s.mirrorReady,false);
});
test("ice weakness stacks, applies to one whole multi-hit action and expires after attacking",()=>{
  const g=pilot(["frost","frost","bolt","strike","guard"],[rest(),attack(5,3)]);
  play(g,"frost");play(g,"frost");
  assert.equal(g.snapshot().weaken,6);
  g.endTurn();
  assert.equal(g.snapshot().weaken,6);
  g.endTurn();
  assert.equal(g.snapshot().hp,21); // 15 total - 6 once, not each hit
  assert.equal(g.snapshot().weaken,0);
});
test("poison ticks once after all hits, never on enemy rest, and never decreases",()=>{
  const g=pilot(["poison","poison","bolt","guard","strike"],[rest(),attack(1,3),attack(2)]);
  play(g,"poison");play(g,"poison");
  g.endTurn();assert.equal(g.snapshot().enemyHp,100);
  g.endTurn();assert.equal(g.snapshot().enemyHp,96);
  assert.equal(g.snapshot().poison,4);
  g.endTurn();assert.equal(g.snapshot().enemyHp,92);
});
test("pure-physical consecutive weapons grow from the second card, nonweapon breaks streak",()=>{
  const g=pilot(["strike","strike","guard","strike","lunge"],[rest()]);
  play(g,"strike");assert.equal(g.snapshot().enemyHp,96);
  play(g,"strike");assert.equal(g.snapshot().enemyHp,90); // bonus 2
  play(g,"guard");
  play(g,"strike");assert.equal(g.snapshot().enemyHp,86); // reset by guard
  play(g,"lunge");assert.equal(g.snapshot().enemyHp,77); // bonus 2 again
});
test("using a spell suppresses the pure-weapon bonus for the rest of that turn",()=>{
  const g=pilot(["strike","bolt","strike","strike","guard"],[rest()]);
  play(g,"strike");play(g,"bolt");play(g,"strike");play(g,"strike");
  assert.equal(g.snapshot().enemyHp,82); // 4+6+4+4
  assert.equal(g.snapshot().usedSpell,true);
});
test("enemy physical and magic resistance use half-up rounding",()=>{
  const g=pilot(["strike","bolt","guard","poison","heal"],[rest()],{enemy:{maxHp:100,physicalResist:25,magicResist:30}});
  play(g,"strike");assert.equal(g.snapshot().enemyHp,97); // 4 * .75 = 3
  play(g,"bolt");assert.equal(g.snapshot().enemyHp,93); // 6 * .7 = 4.2 -> 4
});
test("wolf triggers only once per turn, even after swapping summons",()=>{
  const g=pilot(["wolf","strike","strike","stone","lunge"],[rest()]);
  play(g,"wolf");
  assert.equal(g.snapshot().beast,"wolf");
  assert.equal(g.snapshot().maxEnergy,4);
  play(g,"strike");assert.equal(g.snapshot().enemyHp,93); // 4+3 wolf
  play(g,"strike");assert.equal(g.snapshot().enemyHp,87); // 4+2 chain; no wolf again
  play(g,"stone");
  assert.equal(g.snapshot().beast,"stone");
  assert.equal(g.snapshot().beastReacted,true); // swap does not reset shared limit
  g.endTurn();
  assert.equal(g.snapshot().beastReacted,false);
});
test("stone reacts once to guarding, mirror bonus is retained until the next enemy attack",()=>{
  const g=pilot(["stone","mirror","guard","strike","bolt"],[rest(),attack(7)]);
  play(g,"stone");play(g,"mirror");
  assert.equal(g.snapshot().mirrorGuard,10); // mirror6 + stone4
  play(g,"guard");assert.equal(g.snapshot().guard,5); // no extra reaction
  g.endTurn();
  assert.equal(g.snapshot().mirrorGuard,10);
  g.endTurn();
  assert.equal(g.snapshot().enemyHp,93); // reflect actual blocked7
});
test("sacrifice requires active beast, consumes it, and is independent of reaction count",()=>{
  const g=pilot(["sacrifice","wolf","strike","guard","bolt"],[rest()]);
  const before=g.snapshot();
  assert.equal(g.canPlay("sacrifice"),false);
  assert.equal(g.play(0),false);
  assert.deepEqual(g.snapshot(),before);
  play(g,"wolf");play(g,"strike");assert.equal(g.snapshot().beastReacted,true);
  play(g,"sacrifice");
  assert.equal(g.snapshot().beast,null);
  assert.equal(g.snapshot().beastReacted,true);
  assert.equal(g.snapshot().enemyHp,81); // wolf attack7 + sacrifice12
});
test("burst spends current guards for high spell damage; no lingering mirror reflection",()=>{
  const g=pilot(["mirror","guard","burst","strike","poison"],[attack(8)],{initialEnergy:4});
  play(g,"mirror");play(g,"guard");
  play(g,"burst");
  const s=g.snapshot();
  assert.equal(s.enemyHp,85);
  assert.equal(s.guard,0);
  assert.equal(s.mirrorGuard,0);
  assert.equal(s.mirrorReady,false);
});
test("wolf energy cap is effective when carrying unspent mana between turns",()=>{
  const g=pilot(["wolf","guard","mirror","strike","bolt"],[rest(),rest()]);
  play(g,"wolf");
  g.endTurn();assert.equal(g.snapshot().energy,4);
  g.endTurn();assert.equal(g.snapshot().energy,4);
});

test("release app stays untouched while README links to standalone effects playtest",()=>{
  const html=fs.readFileSync(new URL("../v4-1/planning.html",import.meta.url),"utf8");
  const pilot=fs.readFileSync(new URL("../v4-1/six-paths-pilot.html",import.meta.url),"utf8");
  const readme=fs.readFileSync(new URL("../README.md",import.meta.url),"utf8");
  assert.doesNotMatch(html,/href="\.\/six-paths-pilot\.html"/);
  assert.match(html,/<script src="\.\/planning-engine\.js"><\/script>/);
  assert.match(html,/<script src="\.\/planning-game\.js"><\/script>/);
  assert.match(readme,/\]\(v4-1\/six-paths-pilot\.html\)/);
  assert.match(pilot,/<a href="\.\/planning\.html">従来のゲームへ<\/a>/);
  assert.doesNotMatch(pilot,/shinka-planning-v5|sessionStorage|planning-game\.js/);
  assert.match(pilot,/localStorage\.setItem\(SAVE_KEY/);
});

test("opt-in three-battle journey offers four deterministic choices or skip after victory",()=>{
  const g=pilot(["bolt","strike","burst","guard","heal"],[rest()],{
    journey:true,battles:3,initialEnergy:5,enemy:{maxHp:1,physicalResist:0,magicResist:0}
  });
  assert.equal(g.snapshot().maxBattles,3);
  assert.equal(g.rewardOptions().length,0);
  assert.equal(g.openReward(),false);
  play(g,"bolt");
  assert.equal(g.snapshot().phase,"victory");
  assert.equal(g.endTurn(),false);
  assert.equal(g.openReward(),true);
  assert.equal(g.snapshot().phase,"reward");
  const offers=g.rewardOptions();
  assert.equal(offers.length,4);
  assert.equal(new Set(offers).size,4);
  assert.deepEqual(g.rewardOptions(),offers);
  assert.equal(g.chooseReward("not-a-card"),false);
  assert.equal(g.snapshot().phase,"reward");
  const choice=offers[0];
  assert.equal(g.chooseReward(choice),true);
  assert.equal(g.snapshot().phase,"ready");
  assert.equal(g.snapshot().deck.length,6);
  assert.equal(g.rewardOptions().length,0);
  assert.equal(g.nextBattle(),true);
  let s=g.snapshot();
  assert.equal(s.battle,2);
  assert.equal(s.enemyMaxHp,11);
  assert.equal(s.phase,"battle");
  assert.equal(s.hand[0],choice,"chosen card is guaranteed in the next opening hand");
  assert.equal(s.weaken,0);
  assert.equal(s.poison,0);
  assert.equal(s.mirrorGuard,0);
  assert.equal(s.beast,null);
});
test("reward skip preserves deck but recovers hp, and invalid transitions do not mutate state",()=>{
  const options={journey:true,battles:3,initialEnergy:5,enemy:{maxHp:1,physicalResist:0,magicResist:0}};
  const g=pilot(["bolt","strike","burst","guard","heal"],[rest()],options);
  play(g,"bolt");
  g.openReward();
  const before=g.snapshot(),save=g.exportSave();
  assert.equal(g.nextBattle(),false);
  assert.equal(g.chooseReward("missing"),false);
  assert.deepEqual(g.snapshot(),before);
  assert.deepEqual(g.exportSave(),save);
  assert.equal(g.chooseReward(null),true);
  assert.equal(g.snapshot().deck.length,5);
  assert.equal(g.snapshot().lastReward,null);
  assert.equal(g.snapshot().hp,g.snapshot().maxHp);
  assert.equal(g.nextBattle(),true);
  assert.equal(g.snapshot().deck.length,5);
});
test("pilot journey saves round trip across battle, reward, ready and next battle",()=>{
  const options={journey:true,battles:3,enemy:{maxHp:1,physicalResist:0,magicResist:0},initialEnergy:5};
  const deck=["bolt","strike","burst","guard","heal"];
  const g=pilot(deck,[rest()],options);
  const restore=()=>{const c=pilot(deck,[rest()],options);assert.equal(c.restoreSave(g.exportSave()),true);assert.deepEqual(c.exportSave(),g.exportSave());return c;};
  let c=restore();
  assert.equal(c.snapshot().phase,"battle");
  play(g,"bolt");
  restore();
  g.openReward();
  restore();
  g.chooseReward(g.rewardOptions()[0]);
  restore();
  g.nextBattle();
  restore();
});
test("journey rejects foreign, malformed and inconsistent save without state mutation",()=>{
  const g=pilot(["bolt","strike","burst","guard","heal"],[rest()],{
    journey:true,battles:3,enemy:{maxHp:1,physicalResist:0,magicResist:0}
  });
  const original=g.exportSave();
  const invalid=[];
  invalid.push({...original,version:5});
  invalid.push({...original,mode:"legacy-planning"});
  invalid.push({...original,battles:2});
  for(const patch of [
    {battle:8}, {hp:-1}, {phase:"custom"}, {energy:999},
    {deck:["bolt"]},{hand:["stone","wolf"]},{mirrorReady:"yes"},
    {enemyMaxHp:999},{rewardOffers:["mirror"]},{log:["<x>".repeat(1000)]}
  ])invalid.push({...original,state:{...original.state,...patch}});
  for(const candidate of invalid){
    assert.equal(g.restoreSave(candidate),false,JSON.stringify(candidate).slice(0,110));
    assert.deepEqual(g.exportSave(),original);
  }
  const legacy=pilot(["bolt","strike","burst","guard","heal"],[rest()]);
  assert.equal(legacy.restoreSave(original),false);
  assert.equal(legacy.exportSave(),null);
});
test("pilot browser flow wires four-option rewards, next fight and namespaced autosave",()=>{
  const html=fs.readFileSync(new URL("../v4-1/six-paths-pilot.html",import.meta.url),"utf8");
  assert.match(html,/createPilotGame\(\{journey:true,battles:3\}\)/);
  assert.match(html,/shinka-six-paths-journey-v1/);
  assert.match(html,/id="journeyPanel"/);
  assert.match(html,/id="rewardCards"/);
  assert.match(html,/game\.rewardOptions\(\)/);
  assert.match(html,/game\.chooseReward\(id\)/);
  assert.match(html,/game\.chooseReward\(null\)/);
  assert.match(html,/game\.nextBattle\(\)/);
  assert.match(html,/game\.exportSave\(\)/);
  assert.match(html,/game\.restoreSave\(/);
  assert.doesNotMatch(html,/shinka-planning-v5|shinka-astral-planning-save-v1/);
  assert.match(html,/classicSixEncounters\(globalThis\.ShinkaV43\)/);
});

test("three encounters can finish using rewards, with a complete state and deterministic saved replay",()=>{
  const options={journey:true,battles:3,initialEnergy:5,enemy:{maxHp:1,physicalResist:0,magicResist:0}};
  const deck=["bolt","strike","burst","guard","heal"];
  const g=pilot(deck,[rest()],options);
  play(g,"bolt");
  assert.equal(g.snapshot().phase,"victory");
  g.openReward();
  assert(g.rewardOptions().includes("bolt"));
  assert(g.chooseReward("bolt"));
  assert(g.nextBattle());
  assert.equal(g.snapshot().enemyMaxHp,11);
  play(g,"burst");
  assert.equal(g.snapshot().phase,"victory");
  g.openReward();
  assert(g.rewardOptions().includes("mirror"));
  g.chooseReward("mirror");
  assert(g.nextBattle());
  assert.equal(g.snapshot().enemyMaxHp,21);
  play(g,"burst"); // 15
  play(g,"bolt");  // +6
  assert.equal(g.snapshot().phase,"victory");
  assert.equal(g.openReward(),true);
  assert.equal(g.snapshot().phase,"complete");
  assert.equal(g.openReward(),false);
  assert.equal(g.nextBattle(),false);
  const saved=g.exportSave();
  assert.deepEqual([...saved.state.hand,...saved.state.draw,...saved.state.discard].sort(),[...saved.state.deck].sort(),"deck zones must match on completion");
  const restored=pilot(deck,[rest()],options);
  assert.equal(restored.restoreSave(saved),true);
  assert.deepEqual(restored.exportSave(),g.exportSave());
});

const getClassicEnemies = () => {
  const ctx={};
  vm.runInNewContext(fs.readFileSync(new URL("../v4-1/planning-engine.js",import.meta.url),"utf8"),ctx);
  return classicSixEncounters(ctx.ShinkaV43);
};
test("integrated opt-in mode reuses canonical six-encounter HP, names and action order",()=>{
  const encounters=getClassicEnemies();
  assert.deepEqual([...CLASSIC_ENCOUNTER_IDS],["skeleton","wraith","trial","archive","elite","moth"]);
  assert.deepEqual(encounters.map(e=>e.enemy.maxHp),[15,36,52,68,82,112]);
  assert.deepEqual(encounters.map(e=>e.enemy.physicalResist),[0,0,0,0,0,0]);
  assert.equal(encounters[0].enemy.name,"蒼鎧の門番");
  assert.equal(encounters[1].intents[0].hits,2);
  assert.equal(encounters[2].intents[1].threshold,10);
  assert.equal(encounters[4].intents[1].threshold,13);
  assert.equal(encounters[5].intents[1].threshold,14);
  assert.equal(encounters[5].intents[2].heal,6);
  assert(encounters.every(row=>row.intents.every(move=>move.kind==="rest"||move.damageType==="untyped")));
  const pilot=createPilotGame({journey:true,battles:6,encounters,encounterSetId:"canonical-enemies-v1",initialEnergy:5,
    deck:["burst","bolt","guard","strike","heal"]});
  let s=pilot.snapshot();
  assert.equal(s.enemy.maxHp,15);
  assert.equal(s.enemy.name,"蒼鎧の門番");
  assert.equal(s.nextIntent.perHit,4);
  assert.equal(pilot.exportSave().encounterSetId,"canonical-enemies-v1");
  assert.equal(pilot.play(0),true); // burst 15, defeats stage 1
  assert.equal(pilot.snapshot().phase,"victory");
  pilot.openReward();
  pilot.chooseReward(null);
  assert(pilot.nextBattle());
  s=pilot.snapshot();
  assert.equal(s.battle,2);
  assert.equal(s.enemyHp,36);
  assert.equal(s.enemy.name,"鏡の亡霊");
  assert.equal(s.nextIntent.hits,2);
});
test("legacy encounter condition rules use attack damage, best single hit, attack count and current energy",()=>{
  for(const [intent, actions, expected] of [
    [{kind:"attack",label:"合計詠唱",perHit:14,hits:1,threshold:10,reduction:8},["bolt","bolt"],6],
    [{kind:"attack",label:"一撃詠唱",perHit:18,hits:1,singleThreshold:12,reduction:10},["burst"],8],
    [{kind:"attack",label:"手数詠唱",perHit:12,hits:1,attackCountThreshold:3,stepReduction:2},["strike","strike","strike"],6],
    [{kind:"attack",label:"魔力貯蔵",perHit:14,hits:1,manaCondition:"bank",manaReduction:8},[],6]
  ]){
    const deck=[...actions, ...Array(5-actions.length).fill("guard")];
    const g=createPilotGame({deck,intents:[intent],initialEnergy:5,enemy:{maxHp:100,physicalResist:0,magicResist:0}});
    if(intent.manaCondition==="bank")assert.equal(g.snapshot().nextIntent.perHit,expected);
    else {for(const id of actions)play(g,id);assert.equal(g.snapshot().nextIntent.perHit,expected);}
  }
  const spent=createPilotGame({deck:["burst","guard","guard","bolt","strike"],initialEnergy:3,
    intents:[{kind:"attack",label:"魔力貯蔵",perHit:14,hits:1,manaCondition:"bank",manaReduction:8}]});
  assert.equal(spent.snapshot().nextIntent.perHit,6);
  play(spent,"burst");
  assert.equal(spent.snapshot().energy,1);
  assert.equal(spent.snapshot().nextIntent.perHit,14);
});
test("six-encounter mode and three-fight pilot do not accept each other's saves",()=>{
  const encounters=getClassicEnemies();
  const six=createPilotGame({journey:true,battles:6,encounters,encounterSetId:"canonical-enemies-v1"});
  const three=createPilotGame({journey:true,battles:3});
  const otherSix=createPilotGame({journey:true,battles:6,encounters,encounterSetId:"other-roster"});
  assert.equal(six.restoreSave(three.exportSave()),false);
  assert.equal(three.restoreSave(six.exportSave()),false);
  assert.equal(otherSix.restoreSave(six.exportSave()),false);
  const clone=createPilotGame({journey:true,battles:6,encounters,encounterSetId:"canonical-enemies-v1"});
  assert.equal(clone.restoreSave(six.exportSave()),true);
  assert.deepEqual(clone.exportSave(),six.exportSave());
});
test("experimental browser mode is selected only by a query parameter and uses a distinct save key",()=>{
  const html=fs.readFileSync(new URL("../v4-1/six-paths-pilot.html",import.meta.url),"utf8");
  assert.match(html,/mode=legacy-enemies/);
  assert.match(html,/src="\.\/planning-engine\.js"/);
  assert.match(html,/import \{ classicSixEncounters \}/);
  assert.match(html,/shinka-six-paths-legacy-enemies-v1/);
  assert.match(html,/shinka-six-paths-journey-v1/);
  assert.match(html,/encounterSetId:"canonical-enemies-v1"/);
  assert.doesNotMatch(html,/shinka-astral-planning-save-v1/);
});

test("twelve-battle mode inserts six distinct experimental enemies before existing milestones",()=>{
  const ctx={};
  vm.runInNewContext(fs.readFileSync(new URL("../v4-1/planning-engine.js",import.meta.url),"utf8"),ctx);
  const six=classicSixEncounters(ctx.ShinkaV43);
  const twelve=longTwelveEncounters(ctx.ShinkaV43);
  assert.equal(twelve.length,12);
  assert.equal(EXTRA_SIX.length,6);
  assert.equal(new Set(twelve.map(x=>x.id)).size,12);
  assert.deepEqual(twelve.map(x=>x.id), [...TWELVE_ENCOUNTER_IDS]);
  assert.deepEqual(twelve.filter((_,i)=>[0,2,4,6,8,11].includes(i)).map(x=>x.id),
    six.map(x=>x.id),"canonical old enemy order remains intact");
  assert.deepEqual(twelve.map(x=>x.enemy.maxHp),[15,23,36,32,52,43,68,57,82,70,85,112]);
  assert(twelve.every(x=>x.intents.length>=2));
  assert.equal(twelve[9].enemy.magicResist,25);
  assert.equal(twelve[10].enemy.physicalResist,25);
  assert.equal(twelve[8].intents[1].singleThreshold,13);
});
test("twelve battles create eleven card-reward windows and persistent deck growth",()=>{
  const ctx={};
  vm.runInNewContext(fs.readFileSync(new URL("../v4-1/planning-engine.js",import.meta.url),"utf8"),ctx);
  const twelve=longTwelveEncounters(ctx.ShinkaV43);
  const easy=twelve.map(x=>({...x,enemy:{...x.enemy,maxHp:1,physicalResist:0,magicResist:0}}));
  const deck=["bolt","strike","guard","mirror","poison","frost","heal","strike","guard","bolt"];
  const config={journey:true,battles:12,hp:60,deck,encounters:easy,encounterSetId:"long-twelve-easy-test"};
  const g=createPilotGame(config);
  assert.equal(g.snapshot().maxBattles,12);
  let picks=0;
  for(let battle=1;battle<=12;battle++){
    const state=g.snapshot();
    assert.equal(state.battle,battle);
    assert.equal(state.phase,"battle");
    const index=state.hand.indexOf("bolt");
    assert(index>=0,"stage "+battle+" should draw an attack");
    assert.equal(g.play(index),true);
    assert.equal(g.snapshot().phase,"victory");
    if(battle<12){
      assert.equal(g.openReward(),true);
      const offers=g.rewardOptions();
      assert.equal(offers.length,4);
      assert.equal(new Set(offers).size,4);
      const id=offers[0];
      assert.equal(g.chooseReward(id),true);
      picks++;
      assert.equal(g.snapshot().deck.length,deck.length+picks);
      assert.equal(g.nextBattle(),true);
      if(battle===6){
        const clone=createPilotGame(config);
        assert.equal(clone.restoreSave(g.exportSave()),true);
        assert.deepEqual(clone.exportSave(),g.exportSave());
      }
    }else{
      assert.equal(g.openReward(),true);
      assert.equal(g.snapshot().phase,"complete");
      assert.equal(g.openReward(),false);
      assert.equal(g.nextBattle(),false);
    }
  }
  assert.equal(picks,11);
  assert.equal(g.snapshot().deck.length,21);
  const save=g.exportSave();
  assert.equal(save.encounterSetId,"long-twelve-easy-test");
  const clone=createPilotGame(config);
  assert.equal(clone.restoreSave(save),true);
  assert.deepEqual(clone.exportSave(),save);
});
test("twelve mode stores separately and cannot restore six/three battle saves",()=>{
  const ctx={};
  vm.runInNewContext(fs.readFileSync(new URL("../v4-1/planning-engine.js",import.meta.url),"utf8"),ctx);
  const twelve=longTwelveEncounters(ctx.ShinkaV43);
  const six=classicSixEncounters(ctx.ShinkaV43);
  const long=createPilotGame({journey:true,battles:12,hp:60,encounters:twelve,encounterSetId:"long-twelve-enemies-v1"});
  const short=createPilotGame({journey:true,battles:6,hp:60,encounters:six,encounterSetId:"canonical-enemies-v1"});
  const three=createPilotGame({journey:true,battles:3});
  const longSave=long.exportSave();
  assert.equal(short.restoreSave(longSave),false);
  assert.equal(three.restoreSave(longSave),false);
  assert.equal(long.restoreSave(short.exportSave()),false);
  assert.equal(long.restoreSave(three.exportSave()),false);
  const wrong=createPilotGame({journey:true,battles:12,hp:60,encounters:twelve,encounterSetId:"other-twelve"});
  assert.equal(wrong.restoreSave(longSave),false);
  const correct=createPilotGame({journey:true,battles:12,hp:60,encounters:twelve,encounterSetId:"long-twelve-enemies-v1"});
  assert.equal(correct.restoreSave(longSave),true);
  assert.deepEqual(correct.exportSave(),longSave);
  assert.throws(()=>createPilotGame({journey:true,battles:13}));
});
test("browser enables 12-fight mode with its own save key and shows reward growth",()=>{
  const html=fs.readFileSync(new URL("../v4-1/six-paths-pilot.html",import.meta.url),"utf8");
  assert.match(html,/mode=long-journey/);
  assert.match(html,/longTwelveEncounters\(globalThis\.ShinkaV43\)/);
  assert.match(html,/shinka-six-paths-long-journey-v1/);
  assert.match(html,/battles:12,hp:60/);
  assert.match(html,/long-twelve-enemies-v1/);
  assert.match(html,/stat\("獲得札"/);
  assert.match(html,/modeIsIntegrated \? "shinka-six-paths-legacy-enemies-v1"/);
  assert.doesNotMatch(html,/shinka-astral-planning-save-v1/);
});
