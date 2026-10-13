import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CARDS,getB1Card,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const ids=["mentalCollapse","curse","deathSong","hallucination"];
function boss(deck,seed=20261011){
 const g=createB1Game({seed,maxHp:999,testDeck:deck});
 assert.equal(g.startBossPractice("test"),true);
 return g;
}
function play(g,id,target){
 const index=g.snapshot().hand.indexOf(id);
 assert.ok(index>=0,"Card drawn: "+id);
 assert.equal(g.play(index,target),true);
}
function enemy(g,id){return g.snapshot().enemies.find(x=>x.id===id);}
test("new black magic is distinct, has approved trial descriptions and upgrades",()=>{
 assert.equal(Object.keys(CARDS).length,65);
 const kinds={mentalCollapse:"confuse",curse:"curse",deathSong:"all",hallucination:"hallucinate"};
 for(const id of ids){
  assert.equal(CARDS[id].kind,kinds[id]);
  assert.equal(CARDS[id].school,"dark");
  assert.equal(typeof CARDS[id].magicArt,"string");
  assert.notEqual(getB1Card(id+"~").text,CARDS[id].text);
  const start=createB1Game({seed:17});
  assert.equal(start.selectStarter(id),true);
  assert.ok(start.snapshot().deck.includes(id));
  assert.ok(start.snapshot().shopCatalog.some(item=>item.id===id));
 }
 assert.equal(CARDS.mentalCollapse.confusionAttacks,2);
 assert.equal(getB1Card("mentalCollapse~").confusionAttacks,3);
 assert.equal(CARDS.curse.curseTurns,3);
 assert.equal(getB1Card("curse~").curseTurns,4);
 assert.equal(CARDS.deathSong.confusionBonus,6);
 assert.equal(getB1Card("deathSong~").damage,10);
 assert.equal(CARDS.hallucination.hallucinationAttacks,2);
 assert.equal(getB1Card("hallucination~").hallucinationAttacks,3);
 assert.equal(CARDS.hallucination.draw,undefined);
 assert.equal(CARDS.mentalCollapse.damage,undefined);
});
test("mental collapse randomly redirects a foe's actual attacks to the player or another enemy",()=>{
 let playerTargets=0,allyTargets=0;
 for(let seed=1;seed<=50;seed++){
  const g=boss(["mentalCollapse","bolt","bolt","bolt","bolt"],seed);
  assert.equal(g.play(0,"missing"),false);
  play(g,"mentalCollapse","left");
  assert.equal(enemy(g,"left").confusionAttacks,2);
  const before=g.snapshot();
  assert.equal(g.endTurn(),true);
  const after=g.snapshot(),nextLog=after.log.join(" ");
  assert.equal(enemy(g,"left").confusionAttacks,1);
  if(nextLog.includes("混乱した盾の小鬼・左は味方の")) {
   allyTargets++;
   assert.ok(after.hp===before.hp);
   assert.ok(after.enemies.some((e,i)=>e.hp<before.enemies[i].hp));
  } else {
   playerTargets++;
   assert.ok(nextLog.includes("混乱の矛先はあなた"));
   assert.ok(after.hp<before.hp);
  }
 }
 assert.ok(playerTargets>0,"player can still be hit");
 assert.ok(allyTargets>0,"enemy friendly fire is possible");
});
test("confusion only spends charges on attacks; a lone enemy still attacks the player",()=>{
 const g=createB1Game({seed:8,maxHp:999,testDeck:["mentalCollapse","bolt","bolt","bolt","bolt"]});
 assert.equal(g.selectStarter("lightning"),true);
 play(g,"mentalCollapse","rat");
 assert.equal(g.endTurn(),true);assert.equal(enemy(g,"rat").confusionAttacks,1);
 assert.equal(g.endTurn(),true);assert.equal(enemy(g,"rat").confusionAttacks,1); // shell buff
 assert.equal(g.endTurn(),true);assert.equal(enemy(g,"rat").confusionAttacks,0);
});
test("curse is independent of poison: each stack deals 1,2,3 then expires",()=>{
 const g=boss(["curse","curse","bolt","bolt","bolt"]);
 assert.equal(g.play(0,"missing"),false);
 play(g,"curse","left");play(g,"curse","left");
 assert.equal(enemy(g,"left").poison,0);
 assert.deepEqual(enemy(g,"left").curses.map(c=>c.next),[1,1]);
 const initial=enemy(g,"left").hp;
 for(const [turn,damage,stacks] of [[1,2,2],[2,4,2],[3,6,0]]){
  const before=enemy(g,"left").hp;
  assert.equal(g.endTurn(),true);
  assert.equal(before-enemy(g,"left").hp,damage,"turn "+turn);
  assert.equal(enemy(g,"left").curses.length,stacks);
 }
 assert.equal(initial-enemy(g,"left").hp,12);
 assert.equal(g.endTurn(),true);
 assert.equal(enemy(g,"left").hp,initial-12);
});
test("reapplying curse on a later turn starts another independent 1,2,3 sequence",()=>{
 const g=boss(["curse","bolt","bolt","bolt","bolt"]);
 play(g,"curse","left");
 assert.equal(g.endTurn(),true);
 // Force the second cast by cycling the original small deck without touching saves.
 let found=false;
 for(let i=0;i<5&&!found;i++){
  const pos=g.snapshot().hand.indexOf("curse");
  if(pos>=0){play(g,"curse","left");found=true;break;}
  g.endTurn();
 }
 assert.equal(found,true);
 assert.equal(enemy(g,"left").curses.length>=2,true);
 const phases=enemy(g,"left").curses.map(c=>c.next);
 assert.ok(new Set(phases).size>1,"reapplication keeps the original curse timer");
});
test("death song bonus applies only to confusion, not curse or conventional debuffs",()=>{
 const g=boss(["mentalCollapse","curse","deathSong","bolt","bolt"]);
 play(g,"mentalCollapse","left");
 play(g,"curse","right");
 assert.equal(g.endTurn(),true);
 const before=g.snapshot(),from=new Map(before.enemies.map(e=>[e.id,{hp:e.hp,block:e.block,vulnerable:e.vulnerable}]));
 assert.equal(enemy(g,"left").confusionAttacks,1);
 assert.equal(enemy(g,"right").curses.length,1);
 play(g,"deathSong");
 const now=g.snapshot();
 for(const e of now.enemies){
  const old=from.get(e.id),raw=(e.id==="left"?13:7)-(e.id==="boss"?4:0);
  const dealt=Math.min(old.hp,Math.max(0,raw-old.block));
  assert.equal(e.hp,old.hp-dealt,e.id+" dark song math");
 }
 assert.equal(now.attackCardsThisTurn,1);
});
test("hallucination cuts accuracy to 50% for next two attack actions, then clears",()=>{
 let misses=0,hits=0;
 for(let seed=1;seed<=70;seed++){
  const g=boss(["hallucination","bolt","bolt","bolt","bolt"],seed);
  play(g,"hallucination","left");
  assert.equal(enemy(g,"left").hallucinationAttacks,2);
  const startHp=g.snapshot().hp;
  g.endTurn();
  if(g.snapshot().hp===startHp){misses++;assert.match(g.snapshot().log.join(" " ),/幻覚で失敗/);}
  else hits++;
  assert.equal(enemy(g,"left").hallucinationAttacks,1);
  g.endTurn();assert.equal(enemy(g,"left").hallucinationAttacks,1); // guard's shield buff
  g.endTurn();assert.equal(enemy(g,"left").hallucinationAttacks,0);
 }
 assert.ok(misses>0,"some attacks miss");
 assert.ok(hits>0,"some attacks still succeed");
});
test("existing poison and vulnerability cards remain functional",()=>{
 const g=boss(["poison","fragile","bolt","bolt","bolt"]);
 play(g,"poison","left");play(g,"fragile","left");
 assert.equal(enemy(g,"left").poison,5);
 assert.equal(enemy(g,"left").vulnerable,2);
 g.endTurn();
 assert.equal(enemy(g,"left").poison,4);
});
test("UI includes status counters and targeting gestures for four new effects",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const actions=readFileSync(new URL("../v4-1/underground-b1-actions.mjs",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-fire.css",import.meta.url),"utf8");
 for(const id of ids)assert.ok(html.includes('"'+id+'"'));
 for(const kind of ["confuse","curse","hallucinate"]){
  assert.ok(actions.includes('"'+kind+'"'));
  assert.ok(html.includes(kind+':"'));
 }
 for(const art of ["mental-collapse","curse","death-song","hallucination"])assert.ok(css.includes(".b1-magic-art--"+art));
 for(const status of ["confusionAttacks","hallucinationAttacks","curses"])assert.ok(html.includes(status));
 assert.match(html,/attachB1OriginalArt\(picture,c.magicArt\)/);
});
