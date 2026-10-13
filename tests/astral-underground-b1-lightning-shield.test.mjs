import test from "node:test";
import assert from "node:assert/strict";
import {CARDS,getB1Card,STAGES,getB1RewardPool,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const ids=["lightningFlash","lightningFork","lightningSweep","lightningRelay",
 "shieldMoss","shieldMirror","shieldSpore","shieldIncubate"];
test("eight new cards have coherent upgraded versions and all can appear in normal rewards",()=>{
 assert.equal(Object.keys(CARDS).length,65);
 const available=new Set(STAGES.flatMap((stage,i)=>getB1RewardPool(i,["dragonEgg"])));
 assert.equal(available.size,60); // the original 5 starter basics remain starter-only
 for(const id of ids){
  const card=getB1Card(id),upgrade=getB1Card(id+"~");
  assert.ok(card&&upgrade,id);
  assert.ok(available.has(id),id+" reward");
  assert.ok(card.magicArt,id+" should reuse an existing illustrated asset");
  assert.ok(card.cost<=1,id+" follows low-cost design");
  assert.ok(upgrade.text&&!upgrade.text.includes("（damage＋"),id+" readable upgraded description");
 }
 assert.equal(new Set(ids).size,8);
});
test("consecutive lightning plays escalate +2 each and cap at +8, resetting at turn end",()=>{
 const game=createB1Game({seed:81,testDeck:Array(5).fill("lightningFlash")});
 assert.equal(game.startBossPractice("test"),true);
 const attacks=[];
 for(let i=0;i<5;i++){
  const before=game.snapshot().enemies.find(e=>e.id==="boss").hp;
  assert.equal(game.play(0,"boss"),true);
  const state=game.snapshot();
  attacks.push(before-state.enemies.find(e=>e.id==="boss").hp);
  assert.equal(state.lightningStreak,i+1);
 }
 assert.deepEqual(attacks,[0,0,2,4,6],"boss guardians reduce damage by 4 each attack");
 assert.equal(game.endTurn(),true);
 assert.equal(game.snapshot().lightningStreak,0);
});
test("playing non-thunder card breaks chain without disabling ordinary play",()=>{
 const game=createB1Game({seed:5,testDeck:["lightningFlash","lightningFlash","shieldMoss","lightningFlash","lightningRelay"]});
 assert.equal(game.startBossPractice("test"),true);
 const play=id=>{const idx=game.snapshot().hand.indexOf(id);assert.ok(idx>=0,id);assert.equal(game.play(idx,id==="lightningFlash"?"boss":undefined),true);};
 play("lightningFlash");play("lightningFlash");
 assert.equal(game.snapshot().lightningStreak,2);
 play("shieldMoss");
 assert.equal(game.snapshot().lightningStreak,0);
 play("lightningFlash");
 assert.equal(game.snapshot().lightningStreak,1);
 play("lightningRelay");
 assert.equal(game.snapshot().lightningStreak,2,"non-damaging lightning draw preserves the chain");
});
test("reflect shield returns damage to the actual enemy only after blocking",()=>{
 const game=createB1Game({seed:9,testDeck:Array(5).fill("shieldMirror")});
 assert.equal(game.startBossPractice("test"),true);
 for(let i=0;i<3;i++){
  assert.equal(game.play(0),true);
  assert.ok(game.snapshot().reflectDamage>=3);
  assert.equal(game.endTurn(),true);
  assert.equal(game.snapshot().reflectDamage,0);
 }
 assert.ok(game.snapshot().enemies.some(e=>e.hp<e.maxHp),"enemy damage is reflected rather than only described");
});
test("poison/curse shields reward defense, and dragon shield grows the dragon only at 10 block",()=>{
 const curse=createB1Game({seed:31,testDeck:["poison","shieldSpore","shieldMoss","shieldMoss","shieldMoss"]});
 assert.equal(curse.startBossPractice("test"),true);
 const poisonIndex=curse.snapshot().hand.indexOf("poison");
 assert.equal(curse.play(poisonIndex,"left"),true);
 const shieldIndex=curse.snapshot().hand.indexOf("shieldSpore");
 assert.equal(curse.play(shieldIndex),true);
 assert.equal(curse.snapshot().block,7);
 const dragon=createB1Game({seed:3,testDeck:["dragonEgg","shieldMoss","shieldIncubate","shieldIncubate","lightningFlash"]});
 assert.equal(dragon.startBossPractice("test"),true);
 const use=id=>{const index=dragon.snapshot().hand.indexOf(id);assert.ok(index>=0,id);assert.equal(dragon.play(index,id==="lightningFlash"?"boss":undefined),true);};
 use("dragonEgg");use("shieldMoss");use("shieldIncubate");
 assert.equal(dragon.snapshot().dragonStage,0,"below 10 block cannot grow dragon");
 use("shieldIncubate");
 assert.ok(dragon.snapshot().dragonStage>=1,"reaching 10+ block grows the dragon");
});
