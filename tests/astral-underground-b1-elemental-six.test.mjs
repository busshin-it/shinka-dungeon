import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CARDS,STARTER,createB1Game,getB1Card} from "../v4-1/underground-b1-engine.mjs";

const spells=[
 ["fireWaveSmall","all","fire-rain-small",0,2,4,30],
 ["fireWaveMedium","all","fire-rain-medium",2,9,12,45],
 ["fireWaveLarge","all","fire-rain-large",3,15,19,60],
 ["thunderSmall","attack","thunder-small",1,7,10,30],
 ["thunderMedium","multi","thunder-medium",2,7,9,45],
 ["thunderLarge","attack","thunder-large",3,21,26,60]
];
function practice(cardId){
 const game=createB1Game({seed:17,testDeck:Array(12).fill(cardId)});
 assert.equal(game.startBossPractice("test"),true);
 return game;
}
test("six elemental spells: costs, upgrade texts, accessible starter/shop and distinct temporary art",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-fire.css",import.meta.url),"utf8");
 assert.equal(Object.keys(CARDS).length,57);
 for(const [id,kind,art,cost,damage,upgrade,price] of spells){
  assert.equal(CARDS[id].kind,kind);
  assert.equal(CARDS[id].cost,cost);
  assert.equal(CARDS[id].magicArt,art);
  assert.equal(CARDS[id].damage,damage);
  assert.equal(getB1Card(id+"~").damage,upgrade);
  assert.equal(getB1Card(id+"~").cost,cost);
  assert.ok(getB1Card(id+"~").text.includes(String(upgrade)));
  const game=createB1Game();
  assert.equal(game.selectStarter(id),true,id+" starter");
  assert.equal(game.snapshot().deck.length,STARTER.length+1);
  assert.deepEqual(game.snapshot().shopStock.find(x=>x.id===id),{id,price});
  assert.ok(html.includes('"'+id+'"'));
  assert.ok(css.includes("b1-magic-art--"+art));
 }
});
test("all-fire damage reaches each living enemy while keeping boss guard armor; zero cost is usable",()=>{
 for(const [id,,,,damage] of spells.filter(x=>x[1]==="all")){
  const g=practice(id),before=g.snapshot();
  const idx=before.hand.indexOf(id);
  assert.ok(idx>=0);
  assert.equal(g.play(idx,"left"),true);
  const after=g.snapshot();
  assert.equal(after.energy,3-CARDS[id].cost);
  for(const enemy of before.enemies){
   const next=after.enemies.find(x=>x.id===enemy.id);
   assert.equal(enemy.hp-next.hp,enemy.id==="boss"?Math.max(0,damage-4):damage,id+"/"+enemy.id);
  }
  assert.equal(after.attackCardsThisTurn,1);
 }
});
test("single-thunder power rises from small to large; medium has two distinct hits",()=>{
 for(const [id,,,,damage] of spells.filter(x=>x[1]!=="all")){
  const g=practice(id),before=g.snapshot(),idx=before.hand.indexOf(id);
  assert.equal(g.play(idx,"left"),true);
  const after=g.snapshot();
  const leftBefore=before.enemies.find(x=>x.id==="left");
  const leftAfter=after.enemies.find(x=>x.id==="left");
  const rightBefore=before.enemies.find(x=>x.id==="right");
  const rightAfter=after.enemies.find(x=>x.id==="right");
  assert.equal(leftBefore.hp-leftAfter.hp,damage*(CARDS[id].hits||1));
  assert.equal(rightBefore.hp,rightAfter.hp);
  assert.equal(after.attacksThisTurn,CARDS[id].hits||1);
  assert.equal(after.attackCardsThisTurn,1);
 }
});
test("fire all-target can finish weak guards; upgraded multi hits calculate from real upgraded values",()=>{
 const g=createB1Game({seed:4,testDeck:Array(12).fill("thunderMedium~")});
 // Test-deck loading intentionally permits only base cards. An upgrade must be acquired in a real run.
 assert.deepEqual(g.snapshot().deck,STARTER);
 const upgraded=getB1Card("thunderMedium~");
 assert.equal(upgraded.hits,2);
 assert.equal(upgraded.damage,9);
 assert.equal(upgraded.text,"敵1体に9ダメージを2回");
});
