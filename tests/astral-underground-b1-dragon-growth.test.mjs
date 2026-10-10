import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,DRAGON_STAGES,createB1Game,getB1Card} from "../v4-1/underground-b1-engine.mjs";
function start(deck, starter="flow"){
 const g=createB1Game({seed:28,maxHp:999,testDeck:deck});
 assert.equal(g.selectStarter(starter),true);return g;
}
function play(g,id,arg){
 const s=g.snapshot(),i=s.hand.indexOf(id);assert.ok(i>=0,id+" should be in hand");
 assert.equal(g.play(i,arg),true);return g.snapshot();
}
test("nine sequential dragon stages and art-backed cards exist",()=>{
 assert.deepEqual(DRAGON_STAGES,["卵","孵化","幼竜","成長期","小型竜","中型竜","大型竜","巨竜","神龍"]);
 for(const id of ["dragonEgg","dragonFeed","dragonBreath"]){
   assert.ok(CARDS[id]?.art?.endsWith(".webp"));
   assert.ok(getB1Card(id+"~"));
 }
 assert.equal(getB1Card("dragonFeed~").dragonGrowth,2);
});
test("dragon starter gives the 3-card kit, leaving old starters intact",()=>{
 const old=start(["bolt","guard"],"lightning");
 assert.equal(old.snapshot().deck.length,3);
 assert.equal(old.snapshot().dragonStage,-1);
 const standard=createB1Game();assert.equal(standard.selectStarter("dragonEgg"),true);
 assert.equal(standard.snapshot().deck.length,12);
 for(const id of ["dragonEgg","dragonFeed","dragonBreath"])assert.ok(standard.snapshot().deck.includes(id));
});
test("summon, selected discard for feed, no accidental discard or premature growth",()=>{
 const g=start(["dragonEgg","dragonFeed","dragonBreath","guard"]);
 let s=g.snapshot();let idx=s.hand.indexOf("dragonFeed");
 assert.equal(g.play(idx,null),false);assert.deepEqual(g.snapshot(),s);
 s=play(g,"dragonEgg");assert.equal(s.dragonStage,0);
 idx=s.hand.indexOf("dragonFeed");
 assert.equal(g.play(idx,idx),false);
 assert.equal(g.play(idx,999),false);
 const discardIdx=s.hand.indexOf("guard"),original=s.deck.length;
 assert.equal(g.play(idx,discardIdx),true);
 s=g.snapshot();
 assert.equal(s.dragonStage,1);
 assert.equal(s.deck.length,original);
 assert.ok(s.discard.includes("guard"));
 assert.ok(s.exhaust.includes("dragonFeed"));
 assert.equal(s.hand.includes("guard"),false);
});
test("dragon breath costs one and damages all live enemies in boss practice",()=>{
 const g=createB1Game({seed:6,maxHp:999,testDeck:["dragonEgg","dragonBreath"]});
 assert.equal(g.startBossPractice("test"),true);
 const before=g.snapshot();
 assert.equal(before.dragonStage,-1);
 assert.equal(g.play(before.hand.indexOf("dragonBreath")),true);
 const after=g.snapshot();
 assert.equal(after.energy,before.energy-1);
 for(const e of after.enemies){
   assert.equal(e.hp,before.enemies.find(x=>x.id===e.id).hp-(e.role==="boss"?0:4));
 }
});
test("dragon evolves per end turn, persists after victory and caps at Divine Dragon",()=>{
 const g=start(["dragonEgg","guard","guard"]);
 play(g,"dragonEgg");
 let s=g.snapshot();
 assert.equal(s.dragonStage,0);
 let turns=0;
 while(s.dragonStage<8&&turns++<60){
   if(s.phase==="battle")assert.equal(g.endTurn(),true);
   else if(s.phase==="reward")assert.equal(g.chooseReward(null),true);
   else if(s.phase==="between"){
     if(s.stage===0)g.choosePath("pack");
     if(s.restAvailable)g.chooseRest("heal");
     if(s.shopAvailable)g.leaveShop();
     assert.equal(g.nextBattle(),true);
   }else break;
   s=g.snapshot();
 }
 assert.equal(s.dragonStage,8);
 assert.equal(s.dragonName,"神龍");
 for(let i=0;i<3&&g.snapshot().phase==="battle";i++)g.endTurn();
 assert.equal(g.snapshot().dragonStage,8);
});
test("B1 page uses the same mage stage with three art URLs and a proper feeding selector",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 assert.ok(html.includes('id="heroPuppet"'));
 assert.ok(html.includes('id="dragonHud"'));
 assert.ok(html.includes('showDragonFeedChoice('));
 assert.ok(html.includes('for(const id of ["lightning","scatter","flow","dragonEgg"])'));
 for(const path of ["b1-dragon-egg.webp","b1-dragon-feed.webp","b1-dragon-breath.webp"]){
   assert.ok(CARDS[Object.keys(CARDS).find(id=>CARDS[id].art===path)]);
 }
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const syntax=spawnSync(process.execPath,["--check","--input-type=module"],{input:inline,encoding:"utf8"});
 assert.equal(syntax.status,0,syntax.stderr);
});
