import test from "node:test";
import assert from "node:assert/strict";
import {CARDS,STAGES,B1_REWARD_EXTRA_POOLS,getB1RewardPool,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const basics=["basicAttack","basicDefense","bolt","guard","break"];
const special=["fireSmall","fireMedium","fireLarge","darkBolt","doping","dragonEgg","dragonFeed","dragonBreath"];

test("all starters can see a dragon egg in a normal victory reward pool",()=>{
 const stages=[0,2,4,6,8,10];
 for(const index of stages){
  assert.ok(getB1RewardPool(index,["basicAttack","basicDefense"]).includes("dragonEgg"),"stage "+index);
 }
 // Keeping the egg unlock in the normal pool is independent of which deck
 // was chosen at the start; the player is never locked into one archetype.
 for(const deck of [["basicAttack"],["bolt","guard"],["bludgeon"],["fireSmall"]]){
  assert.ok(getB1RewardPool(0,deck).includes("dragonEgg"));
 }
 assert.ok(!getB1RewardPool(11,["dragonEgg"]).length,"final boss has no card reward");
});
test("dragon feed and breath are gated by owning the egg, not by starter class",()=>{
 for(let stage=0;stage<STAGES.length-1;stage++){
  const withoutEgg=getB1RewardPool(stage,["basicAttack","lightning"]);
  assert.ok(!withoutEgg.includes("dragonFeed"),stage+" no dead feed");
  assert.ok(!withoutEgg.includes("dragonBreath"),stage+" no disconnected breath");
  if(stage>0){
   const withEgg=getB1RewardPool(stage,["basicAttack","dragonEgg"]);
   assert.ok(withEgg.includes("dragonFeed"),stage+" feed follows acquired egg");
   assert.ok(withEgg.includes("dragonBreath"),stage+" breath follows acquired egg");
   const upgradedEgg=getB1RewardPool(stage,["dragonEgg~"]);
   assert.ok(upgradedEgg.includes("dragonFeed")&&upgradedEgg.includes("dragonBreath"));
  }
 }
 assert.ok(!getB1RewardPool(0,["dragonEgg"]).includes("dragonFeed"));
});
test("reward variants cover all 60 non-basic cards while preserving 11 battles, stage bases, and 3 choices",()=>{
 assert.equal(Object.keys(CARDS).length,77);
 assert.equal(STAGES.length,12);
 assert.equal(B1_REWARD_EXTRA_POOLS.length,12);
 const oldPool=new Set(STAGES.flatMap(s=>s.rewards));
 assert.equal(oldPool.size,44);
 const potential=new Set(STAGES.flatMap((s,i)=>getB1RewardPool(i,["dragonEgg"])));
 assert.equal(potential.size,72);
 assert.deepEqual(Object.keys(CARDS).filter(id=>!potential.has(id)),basics);
 for(const id of special)assert.ok(potential.has(id),id+" is now an ordinary reward");
 for(const stage of STAGES.slice(0,-1))assert.equal(stage.rewards.length,9);
 for(let i=0;i<11;i++){
  const candidate=getB1RewardPool(i,["dragonEgg"]);
  assert.equal(new Set(candidate).size,candidate.length,"no repeated offer IDs");
  assert.ok(candidate.every(id=>Object.hasOwn(CARDS,id)),"all options are playable cards");
  assert.ok(candidate.length>=9,"each stage keeps variety");
 }
 assert.deepEqual(getB1RewardPool(-1,[]),[]);
 assert.deepEqual(getB1RewardPool(12,[]),[]);
});
test("reward shuffle keeps 3 slots and stage state rather than modifying battle or save behavior",()=>{
 const g=createB1Game({seed:20261013});
 const before=g.snapshot();
 assert.equal(before.phase,"starter");
 assert.equal(g.selectStarter("basic"),true);
 const battle=g.snapshot();
 assert.equal(battle.phase,"battle");
 assert.equal(battle.stage,0);
 assert.ok(!battle.deck.includes("dragonEgg"),"egg is not forcibly added");
});
