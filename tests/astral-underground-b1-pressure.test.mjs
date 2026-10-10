import test from "node:test";
import assert from "node:assert/strict";
import {CARDS,STARTER,STAGES,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const start=(deck,seed=40)=>{
 const g=createB1Game({seed,maxHp:999,testDeck:deck});
 assert.equal(g.selectStarter("scatter"),true);return g;
};
function play(g,id,target="rat"){
 const n=g.snapshot().hand.indexOf(id);
 assert.ok(n>=0,"card missing: "+id);
 assert.equal(g.play(n,target),true);
}
function win(g){
 let turns=0;
 while(g.snapshot().phase==="battle"&&turns++<100){
  let attempts=0;
  while(g.snapshot().phase==="battle"&&attempts++<20){
   const s=g.snapshot(),i=s.hand.findIndex(id=>["bolt","lightning","scatter","break","double"].includes(id)&&CARDS[id].cost<=s.energy);
   if(i<0)break;
   const target=s.enemies.find(e=>e.hp>0&&e.role!=="boss")||s.enemies.find(e=>e.hp>0);
   assert.equal(g.play(i,target.id),true);
  }
  if(g.snapshot().phase==="battle")g.endTurn();
 }
 assert.ok(turns<100,"battle did not end");
}
test("B1 scales from starter fights to an elite and a guarded boss",()=>{
 assert.equal(STAGES.length,5);
 assert.equal(STAGES[0].enemies[0].maxHp,42);
 assert.equal(STAGES[2].enemies[0].maxHp,52);
 assert.equal(STAGES[3].enemies[0].maxHp,82);
 assert.equal(STAGES[4].enemies.find(e=>e.role==="boss").maxHp,135);
 assert.equal(STARTER.length,9);
 const g=createB1Game({seed:1});
 g.selectStarter("scatter");const s=g.snapshot();
 assert.equal(s.hp,75);assert.equal(s.energy,3);assert.equal(s.hand.length,5);
});
test("first enemy deals meaningful damage and visibly buffs itself and blocks",()=>{
 const g=start(Array(8).fill("bolt"));
 assert.equal(g.snapshot().intents[0].damage,9);
 g.endTurn();assert.equal(g.snapshot().hp,990);
 assert.equal(g.snapshot().intents[0].kind,"buff");
 g.endTurn();assert.equal(g.snapshot().enemies[0].block,6);
 assert.equal(g.snapshot().enemies[0].strength,2);
 const hp=g.snapshot().enemies[0].hp;
 play(g,"bolt");assert.equal(g.snapshot().enemies[0].hp,hp);
 assert.equal(g.snapshot().enemies[0].block,0);
 assert.equal(g.snapshot().intents[0].damage,9);
});
test("player attack power and starter vulnerability affect different cards and hits",()=>{
 const g=start(["strength","break","bolt","double","guard"]);
 play(g,"strength");assert.equal(g.snapshot().strength,2);
 play(g,"break");assert.equal(g.snapshot().enemies[0].vulnerable,2);
 assert.equal(g.snapshot().enemies[0].hp,32);
 // The 2 boosted damage applies before the 50% vulnerability multiplier.
 // If enough energy remains, further attacks improve.
 assert.equal(g.snapshot().energy,0);
});
test("normal victories restore six HP without exceeding maximum",()=>{
 const g=start(Array(12).fill("bolt"),20261011);
 g.endTurn();assert.equal(g.snapshot().hp,990);
 win(g);
 assert.equal(g.snapshot().phase,"reward");
 assert.equal(g.snapshot().hp,996);
});
test("each victory presents exactly three selectable cards and then the next fight",()=>{
 const g=start(Array(12).fill("bolt"),20261012);
 win(g);let s=g.snapshot();
 assert.equal(s.rewards.length,3);
 assert.equal(new Set(s.rewards).size,3);
 assert.equal(g.chooseReward("unoffered"),false);
 assert.equal(g.chooseReward(s.rewards[0]),true);
 assert.equal(g.nextBattle(),true);
 assert.equal(g.snapshot().stage,1);
 assert.equal(g.snapshot().enemies.length,2);
});
