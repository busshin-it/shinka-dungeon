import test from "node:test";
import assert from "node:assert/strict";
import {createB1Game,getB1Card} from "../v4-1/underground-b1-engine.mjs";
function clearBattle(g){
 let turns=0;
 while(g.snapshot().phase==="battle"&&turns++<65){
  let tries=0;
  while(g.snapshot().phase==="battle"&&tries++<15){
   const s=g.snapshot(),target=s.enemies.find(e=>e.hp>0);
   const index=s.hand.findIndex(id=>id.replace(/~$/,"")==="lightning"&&s.energy>=getB1Card(id).cost);
   if(index<0||!target)break;
   assert.equal(g.play(index,target.id),true);
  }
  if(g.snapshot().phase==="battle")assert.equal(g.endTurn(),true);
 }
 assert.ok(turns<65);
 assert.equal(g.snapshot().phase,"reward");
}
function restGame(){
 const g=createB1Game({seed:17,maxHp:999,testDeck:Array(12).fill("lightning")});
 assert.equal(g.selectStarter("scatter"),true);
 clearBattle(g);assert.equal(g.chooseReward(null),true);
 assert.equal(g.choosePath("pack"),true);assert.equal(g.nextBattle(),true);
 clearBattle(g);assert.equal(g.chooseReward(null),true);
 assert.equal(g.snapshot().restAvailable,true);
 return g;
}
test("rest is offered only after second encounter, once, not at the fork",()=>{
 const g=restGame();
 assert.equal(g.chooseRest("upgrade",-1),false);
 assert.equal(g.chooseRest("heal"),true);
 assert.equal(g.snapshot().restAvailable,false);
 assert.equal(g.chooseRest("heal"),false);
 assert.equal(g.nextBattle(),true);
 assert.equal(g.snapshot().stage,2);
 assert.equal(g.snapshot().restChoice,"heal");
});
test("upgrade changes one instance, carries into future combat and retains other copies",()=>{
 const g=restGame(), before=g.snapshot().deck;
 const value=getB1Card("lightning").damage;
 assert.equal(g.chooseRest("upgrade",0),true);
 const after=g.snapshot().deck;
 assert.equal(after.length,before.length);
 assert.equal(after.filter(x=>x==="lightning~").length,1);
 assert.equal(after.filter(x=>x==="lightning").length,before.filter(x=>x==="lightning").length-1);
 assert.ok(getB1Card("lightning~").damage>value);
 assert.equal(g.chooseRest("upgrade",1),false);
 assert.equal(g.nextBattle(),true);
 assert.ok([...g.snapshot().hand,...g.snapshot().draw].includes("lightning~"));
});
test("invalid rest operations are rejected before eligibility",()=>{
 const g=createB1Game({seed:11});
 assert.equal(g.chooseRest("heal"),false);
 assert.equal(g.chooseRest("upgrade",0),false);
 assert.equal(g.startBossPractice("baseline"),true);
 assert.equal(g.chooseRest("heal"),false);
});
test("rest is connected in B1-only UI",async()=>{
 const {readFileSync}=await import("node:fs");
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 for(const term of ['id="restSite"','id="restHeal"','id="restUpgrade"','game.chooseRest("heal")','game.chooseRest("upgrade",index)','getB1Card(id)'])assert.ok(html.includes(term),term);
});
