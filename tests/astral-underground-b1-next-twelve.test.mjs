import test from "node:test";
import assert from "node:assert/strict";
import {CARDS,getB1Card,STAGES,getB1RewardPool,createB1Game} from "../v4-1/underground-b1-engine.mjs";
const ids=["thunderEcho","thunderJudgment","unbrokenMirror","venomShield","decayRitual","dragonCovenant","iceShatter","frozenTime","bloodBlade","finalBlow","manaResonance","chaosPact"];
test("12 cards have upgrades and can all appear as rewards",()=>{
 assert.equal(Object.keys(CARDS).length,85);
 const pool=new Set(STAGES.flatMap((_,i)=>getB1RewardPool(i,["dragonEgg"])));
 assert.equal(pool.size,80);
 for(const id of ids){assert.ok(pool.has(id),id);assert.ok(getB1Card(id+"~")?.text,id);}
});
test("HP-cost cannot kill its owner",()=>{
 const g=createB1Game({seed:11,maxHp:3,testDeck:["bloodBlade"]});assert.equal(g.startBossPractice("test"),true);
 assert.equal(g.play(g.snapshot().hand.indexOf("bloodBlade"),"boss"),false);
});
test("frozen time weakens all enemies",()=>{
 const g=createB1Game({seed:11,testDeck:["frozenTime"]});assert.equal(g.startBossPractice("test"),true);
 assert.equal(g.play(g.snapshot().hand.indexOf("frozenTime")),true);
 assert.ok(g.snapshot().enemies.every(e=>e.weaken===3));
});
test("new single target debuffs and upgrades remain functional",()=>{
 const g=createB1Game({seed:14,testDeck:["decayRitual","chaosPact","iceShatter","thunderEcho"]});assert.equal(g.startBossPractice("test"),true);
 assert.equal(g.play(g.snapshot().hand.indexOf("decayRitual"),"boss"),true);
 const b=g.snapshot().enemies.find(e=>e.id==="boss");
 assert.equal(b.poison,3);assert.equal(b.curses.length,1);
 assert.equal(g.play(g.snapshot().hand.indexOf("chaosPact"),"boss"),true);
});
