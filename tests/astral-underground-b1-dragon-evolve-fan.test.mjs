import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createB1Game,DRAGON_STAGES,DRAGON_EVOLUTION_DAMAGE} from "../v4-1/underground-b1-engine.mjs";
import {b1HandFanPose,b1PointerIntent} from "../v4-1/underground-b1-actions.mjs";

function playId(g,id,arg){
 const s=g.snapshot(),index=s.hand.indexOf(id);
 assert.ok(index>=0,id+" is in hand");assert.equal(g.play(index,arg),true);
 return g.snapshot();
}
function feed(g){
 let before=g.snapshot(),index=before.hand.indexOf("dragonFeed");
 assert.ok(index>=0,"has feed");
 const discard=before.hand.findIndex((id,i)=>i!==index);
 assert.ok(discard>=0,"discard another card");
 assert.equal(g.play(index,discard),true);
 return g.snapshot();
}
test("evolution damage is progressive and includes full 9-stage range",()=>{
 assert.equal(DRAGON_STAGES.length,9);
 assert.deepEqual(DRAGON_EVOLUTION_DAMAGE,[0,0,2,4,6,9,13,16,20]);
 for(let i=2;i<DRAGON_STAGES.length;i++)
  assert.ok(DRAGON_EVOLUTION_DAMAGE[i]>DRAGON_EVOLUTION_DAMAGE[i-1]);
});
test("using feed immediately evolves, protects at hatch, and attacks on next evolution",()=>{
 const g=createB1Game({seed:7,testDeck:[...Array(6).fill("dragonEgg"),...Array(6).fill("dragonFeed")]});
 assert.equal(g.startBossPractice("test"),true);
 let s=playId(g,"dragonEgg");
 assert.equal(s.dragonStage,0);assert.equal(s.lastDragonEvolution,null);
 s=feed(g);
 assert.equal(s.dragonStage,1);
 assert.equal(s.block,2);
 assert.deepEqual(s.lastDragonEvolution,{stage:1,name:"孵化",power:0,targetIds:[]});
 const before=s.enemies.find(e=>e.id==="left").hp;
 s=feed(g);
 assert.equal(s.dragonStage,2);assert.equal(s.enemies.find(e=>e.id==="left").hp,before-2);
 assert.deepEqual(s.lastDragonEvolution,{stage:2,name:"幼竜",power:2,targetIds:["left"]});
});
test("turn-ending evolution attacks exactly once, with enemy actions after the evolution",()=>{
 const g=createB1Game({seed:7,testDeck:[...Array(6).fill("dragonEgg"),...Array(6).fill("dragonFeed")]});
 g.startBossPractice("test");
 playId(g,"dragonEgg");
 const before=g.snapshot().enemies.find(e=>e.id==="left").hp;
 assert.equal(g.endTurn(),true);
 const s=g.snapshot();
 assert.equal(s.dragonStage,1);
 assert.equal(s.block<=2,true,"enemy action can use hatch defense");
 assert.equal(s.enemies.find(e=>e.id==="left").hp,before);
 assert.equal(s.lastDragonEvolution?.power,0);
 // Turn two evolves automatically to stage two.
 assert.equal(g.endTurn(),true);
 const after=g.snapshot();
 assert.equal(after.dragonStage,2);
 assert.equal(after.enemies.find(e=>e.id==="left").hp,before-2);
 assert.equal(after.lastDragonEvolution?.power,2);
});
test("after victory the next battle begins without a grown dragon but retains egg cards",()=>{
 const g=createB1Game({seed:17,maxHp:999,testDeck:Array(12).fill("dragonEgg")});
 assert.equal(g.selectStarter("dragonEgg"),true);
 let loops=0;
 while(g.snapshot().phase==="battle"&&loops++<70){
  let actions=0;
  while(g.snapshot().phase==="battle"&&actions++<10){
   const s=g.snapshot(),i=s.hand.findIndex(id=>id==="dragonEgg"&&s.energy>=1);
   if(i<0)break;
   assert.equal(g.play(i),true);
  }
  if(g.snapshot().phase==="battle")g.endTurn();
 }
 assert.equal(g.snapshot().phase,"reward","dragon must eventually clear first fight");
 assert.ok(g.snapshot().dragonStage>=2);
 assert.equal(g.chooseReward(null),true);
 assert.equal(g.choosePath("pack"),true);
 assert.equal(g.nextBattle(),true);
 const s=g.snapshot();
 assert.equal(s.dragonStage,-1,"no evolved dragon is carried into a new battle");
 assert.equal(s.lastDragonEvolution,null);
 assert.ok(s.deck.includes("dragonEgg"),"egg remains in the persistent deck");
 assert.equal(s.phase,"battle");
});
test("hand fan is symmetric and larger than the previous flat hand",()=>{
 assert.deepEqual(b1HandFanPose(0,1),{angle:0,drop:0});
 assert.deepEqual(b1HandFanPose(0,5),{angle:-7,drop:6});
 assert.deepEqual(b1HandFanPose(2,5),{angle:0,drop:0});
 assert.deepEqual(b1HandFanPose(4,5),{angle:7,drop:6});
 assert.equal(b1HandFanPose(-20,5).angle,-7);
 assert.equal(b1HandFanPose(999,5).angle,7);
 assert.equal(b1PointerIntent(44,2,"touch"),"scroll");
 assert.equal(b1PointerIntent(2,-44,"touch"),"drag");
});
test("original mage battle keeps draggable overlapping hand, reduced motion, and visual evolution cue",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-hand-fan.css",import.meta.url),"utf8");
 const feedback=readFileSync(new URL("../v4-1/underground-b1-feedback.mjs",import.meta.url),"utf8");
 assert.ok(html.includes("underground-b1-hand-fan.css"));
 for(const id of ["heroPuppet","enemyPuppet","hand","endTurn","b1DragonCompanion"])
  assert.ok(html.includes('id="'+id+'"'));
 for(const key of ["justify-content:safe center","margin-inline-start","b1-picked","b1-pressing","b1-drag-source","overflow-x:auto","touch-action:pan-x","prefers-reduced-motion"])
  assert.ok(css.includes(key),key);
 assert.ok(feedback.includes("after.lastDragonEvolution"));
 assert.ok(feedback.includes("b1-dragon-rise-cue"));
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const check=spawnSync(process.execPath,["--input-type=module","--check"],{input:inline,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
});
