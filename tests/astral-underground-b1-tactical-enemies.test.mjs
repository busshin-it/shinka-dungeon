import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CARDS,STAGES,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");

// Reach a fixed encounter using the unmodified public 12-stage run API.
// High HP here is a test-only option; no shortcuts or production hooks.
function reachStage(stage,deck=Array(12).fill("thunderLarge")){
 const g=createB1Game({seed:20261013,maxHp:999,testDeck:deck});
 assert.equal(g.selectStarter("scatter"),true);
 for(let i=0;i<stage;i++){
  let turns=0;
  while(g.snapshot().phase==="battle"&&turns++<100){
   let plays=0;
   while(g.snapshot().phase==="battle"&&plays++<20){
    const s=g.snapshot(),target=s.enemies.find(e=>e.hp>0);
    const index=s.hand.findIndex(id=>id==="thunderLarge"&&s.energy>=3);
    if(index<0||!target)break;
    assert.equal(g.play(index,target.id),true);
   }
   if(g.snapshot().phase==="battle")assert.equal(g.endTurn(),true);
  }
  assert.ok(turns<100,"encounter took too many turns "+i);
  assert.equal(g.snapshot().phase,"reward","stage "+i);
  assert.equal(g.chooseReward(null),true);
  const after=g.snapshot();
  if(after.restAvailable)assert.equal(g.chooseRest("heal"),true);
  if(after.shopAvailable)assert.equal(g.leaveShop(),true);
  assert.equal(g.nextBattle(),true);
 }
 assert.equal(g.snapshot().stage,stage);
 assert.equal(g.snapshot().phase,"battle");
 return g;
}
const roleMap=[
 [4,"venom","venom2"],[5,"berserker","berserker2"],[6,"healer","healer2"],
 [7,"breaker","breaker2"],[8,"banner","banner3"],[9,"warder","warder3"]
];
test("six new enemy types appear in distinct encounters without affecting all 12 stages, fork or boss",()=>{
 assert.equal(STAGES.length,12);
 assert.deepEqual(STAGES[0].enemies.map(x=>x.id),["rat"]);
 assert.deepEqual(STAGES[1].enemies.map(x=>x.id),["wolf","imp"]);
 assert.deepEqual(STAGES.at(-1).enemies.map(x=>x.id),["left","boss","right"]);
 for(const [stage,role,id] of roleMap){
  assert.ok(STAGES[stage].enemies.some(e=>e.role===role&&e.id===id),role);
  assert.ok(STAGES[stage].hint.length>10);
 }
 assert.equal(Object.keys(CARDS).length,85,"card catalog includes eight more cards");
 const imgs={
  venom:"wraith.webp",berserker:"bell-spirit.webp",healer:"bell-spirit.webp",
  breaker:"bell-spirit.webp",banner:"bell-spirit.webp",warder:"bell-spirit.webp"
 };
 for(const [role,img] of Object.entries(imgs)){
  assert.ok(html.includes(role+':"'+img+'"'),role+" artwork mapping");
  const asset=readFileSync(new URL("../v4-1/assets/"+img,import.meta.url));
  assert.ok(asset.length>1000,img);
  assert.ok(css.includes(".b1-role-"+role+" .b1-actor-figure img"),role+" palette");
 }
});
test("poisoner applies visible hero poison, which ignores block, decays and resets in a later battle",()=>{
 const g=reachStage(4);
 assert.equal(g.snapshot().intents.find(x=>x.id==="venom2").kind,"poisonHero");
 assert.equal(g.endTurn(),true);
 assert.equal(g.snapshot().heroPoison,2);
 const before=g.snapshot().hp;
 assert.equal(g.endTurn(),true);
 assert.equal(g.snapshot().heroPoison,1);
 assert.ok(g.snapshot().hp<=before-2,"poison ticks through any defense");
 assert.ok(g.snapshot().log.some(s=>s.includes("毒の継続ダメージ：2")));
 let turns=0;
 while(g.snapshot().phase==="battle"&&turns++<80){
  let plays=0;
  while(g.snapshot().phase==="battle"&&plays++<8){
   const s=g.snapshot(),t=s.enemies.find(e=>e.hp>0),index=s.hand.indexOf("thunderLarge");
   if(index<0||s.energy<3||!t)break;
   assert.equal(g.play(index,t.id),true);
  }
  if(g.snapshot().phase==="battle")g.endTurn();
 }
 assert.equal(g.snapshot().phase,"reward");
 g.chooseReward(null);g.nextBattle();
 assert.equal(g.snapshot().heroPoison,0,"poison is combat-only");
});
test("berserker telegraphs a buff, heavy strike and a rest window",()=>{
 const g=reachStage(5);
 let e=g.snapshot().enemies[0];
 assert.equal(e.role,"berserker");
 assert.equal(g.snapshot().intents[0].kind,"buff");
 g.endTurn();e=g.snapshot().enemies[0];
 assert.equal(e.strength,2);
 assert.equal(g.snapshot().intents[0].kind,"attack");
 g.endTurn();
 assert.equal(g.snapshot().intents[0].kind,"rest");
});
test("healer restores a wounded ally; removing the healer removes that heal source",()=>{
 const g=reachStage(6);
 const index=g.snapshot().hand.indexOf("thunderLarge");
 assert.ok(index>=0);
 assert.equal(g.play(index,"ritual2"),true);
 const hurt=g.snapshot().enemies.find(e=>e.id==="ritual2").hp;
 g.endTurn();
 const intention=g.snapshot().intents.find(i=>i.id==="healer2");
 assert.equal(intention.kind,"healAlly");
 assert.equal(intention.allyId,"ritual2");
 g.endTurn();
 assert.equal(g.snapshot().enemies.find(e=>e.id==="ritual2").hp,Math.min(47,hurt+8));
 const h=reachStage(6);
 const k=h.snapshot().hand.indexOf("thunderLarge");
 assert.ok(k>=0);assert.equal(h.play(k,"healer2"),true);
 assert.equal(h.snapshot().enemies.find(e=>e.id==="healer2").hp,0);
 h.endTurn();h.endTurn();
 assert.equal(h.snapshot().enemies.find(e=>e.id==="ritual2").hp,47);
});
test("breaker attacks with a block-bypass warning; defense removal is logged",()=>{
 const deck=[...Array(11).fill("thunderLarge"),"guard"];
 const g=reachStage(7,deck);
 assert.equal(g.snapshot().enemies[0].role,"breaker");
 let found=false;
 for(let n=0;n<25&&!found;n++){
  const s=g.snapshot(),i=s.hand.indexOf("guard"),move=s.intents[0];
  if(i>=0&&move.blockBreak===6&&s.energy>=1){
   assert.equal(g.play(i),true);
   assert.equal(g.endTurn(),true);
   assert.ok(g.snapshot().log.some(x=>x.includes("破盾で防御5を失った")));
   found=true;
  }else g.endTurn();
 }
 assert.equal(found,true,"a defense turn eventually meets the breaking attack");
});
test("banner empowers the archer, warder protects a carapace, and their targets are displayed",()=>{
 const g=reachStage(8);
 const buff=g.snapshot().intents.find(x=>x.id==="banner3");
 assert.equal(buff.kind,"buffAlly");assert.equal(buff.allyId,"mistArcher");
 g.endTurn();
 assert.equal(g.snapshot().enemies.find(e=>e.id==="mistArcher").strength,2);
 const h=reachStage(9);
 const shield=h.snapshot().intents.find(x=>x.id==="warder3");
 assert.equal(shield.kind,"shieldAlly");assert.equal(shield.allyId,"carapace3");
 h.endTurn();
 assert.equal(h.snapshot().enemies.find(e=>e.id==="carapace3").block,17);
});
test("game UI displays ally-target intents, player poison and multiple-target buttons",()=>{
 assert.match(html,/b1EnemyConditions\(e,s\)/);
 assert.match(html,/s\.heroPoison>0/);
 assert.match(html,/move\?\.kind==="poisonHero"/);
 assert.match(html,/\["buff","buffAlly","shieldAlly","healAlly"\]/);
 assert.match(html,/b\.addEventListener\("click",\(\)=>actions\.handleTargetClick\(e\.id\)\)/);
});
