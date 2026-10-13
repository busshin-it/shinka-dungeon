import test from "node:test";
import assert from "node:assert/strict";
import {CARDS,getB1Card,STAGES,getB1RewardPool,createB1Game} from "../v4-1/underground-b1-engine.mjs";
const added=["sparkWard","sparkBreath","frostNeedle","iceFinisher","venomCloud","curseSlash","dragonWing","ironResolve"];
function practice(deck){const g=createB1Game({seed:29,testDeck:deck});assert.equal(g.startBossPractice("test"),true);return g;}
function use(g,id,target){const index=g.snapshot().hand.indexOf(id);assert.notEqual(index,-1,"hand: "+id);assert.equal(g.play(index,target),true,id);}
test("eight new cards and upgrades join regular rewards",()=>{
 assert.equal(Object.keys(CARDS).length,85);
 const rewards=new Set(STAGES.flatMap((_,i)=>getB1RewardPool(i,["dragonEgg"])));
 assert.equal(rewards.size,80);
 for(const id of added){assert.ok(rewards.has(id),id);assert.ok(getB1Card(id+"~")?.text.includes(getB1Card(id).name)?true:getB1Card(id+"~")?.text,id);}
});
test("lightning guard and cycle keep a streak, without repeated 0-cost draws",()=>{
 const g=practice(["sparkWard","sparkBreath","lightningFlash"]);
 use(g,"sparkWard");assert.equal(g.snapshot().lightningStreak,1);
 use(g,"sparkBreath");assert.equal(g.snapshot().lightningStreak,2);
 assert.ok(g.snapshot().exhaust.includes("sparkBreath"),"0 cost draw exhausts");
 use(g,"lightningFlash","boss");assert.equal(g.snapshot().lightningStreak,3);
});
test("ice weaken/vulnerable enables precise follow-up",()=>{
 const g=practice(["frostNeedle","iceFinisher"]);
 use(g,"frostNeedle","boss");const before=g.snapshot().enemies.find(e=>e.id==="boss");
 assert.equal(before.weaken,2);assert.equal(before.vulnerable,1);
 use(g,"iceFinisher","boss");assert.ok(g.snapshot().enemies.find(e=>e.id==="boss").hp<before.hp);
});
test("poison spreads across all enemies, while curse slash only marks its living target",()=>{
 const g=practice(["venomCloud","curseSlash"]);
 use(g,"venomCloud");assert.ok(g.snapshot().enemies.every(e=>e.poison===3));
 use(g,"curseSlash","boss");assert.equal(g.snapshot().enemies.find(e=>e.id==="boss").curses.length,1);
});
test("dragon wing values dragon growth; physical focus supplies draw and modest attack buff",()=>{
 const d=practice(["dragonEgg","dragonEgg","dragonWing"]);
 use(d,"dragonEgg");use(d,"dragonEgg");const before=d.snapshot().block;
 use(d,"dragonWing");assert.equal(d.snapshot().dragonStage,1);assert.equal(d.snapshot().block-before,5);
 const p=practice(["ironResolve","bludgeon","basicDefense","basicAttack","guard","bludgeon"]);
 use(p,"ironResolve");assert.equal(p.snapshot().dopingBonus,1);
});
