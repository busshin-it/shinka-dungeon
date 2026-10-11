import test from "node:test";
import assert from "node:assert/strict";
import {CARDS,getB1Card,createB1Game} from "../v4-1/underground-b1-engine.mjs";
import {readFileSync} from "node:fs";

const ids=["mentalCollapse","curse","deathSong","hallucination"];
function boss(deck){
 const g=createB1Game({seed:20261011,maxHp:999,testDeck:deck});
 assert.equal(g.startBossPractice("test"),true);
 return g;
}
function use(g,id,target){
 const index=g.snapshot().hand.indexOf(id);
 assert.ok(index>=0,"card was drawn: "+id);
 assert.equal(g.play(index,target),true);
}
test("four dark cards are separate B1 cards with upgrades and usable starters/merchant entries",()=>{
 assert.equal(Object.keys(CARDS).length,47);
 const expected=[
  ["mentalCollapse",2,"attack","mental-collapse"],["curse",1,"poison","curse"],
  ["deathSong",3,"all","death-song"],["hallucination",1,"fragile","hallucination"]
 ];
 const s=createB1Game({seed:4}).snapshot();
 for(const [id,cost,kind,art] of expected){
  assert.equal(CARDS[id].cost,cost);
  assert.equal(CARDS[id].kind,kind);
  assert.equal(CARDS[id].school,"dark");
  assert.equal(CARDS[id].magicArt,art);
  assert.equal(s.shopStock.some(x=>x.id===id),true);
  assert.notEqual(getB1Card(id+"~").text,CARDS[id].text);
  const newGame=createB1Game({seed:4});
  assert.equal(newGame.selectStarter(id),true);
  assert.equal(newGame.snapshot().deck.includes(id),true);
 }
 assert.equal(getB1Card("mentalCollapse~").damage,11);
 assert.equal(getB1Card("curse~").poison,4);
 assert.equal(getB1Card("curse~").vulnerable,2);
 assert.equal(getB1Card("deathSong~").damage,10);
 assert.equal(getB1Card("hallucination~").weaken,3);
 assert.equal(getB1Card("hallucination~").draw,1);
});
test("curse marks the target, then mental collapse exploits it and inflicts weakness",()=>{
 const g=boss(["curse","mentalCollapse","bolt","bolt","bolt"]);
 assert.equal(g.play(g.snapshot().hand.indexOf("curse"),"no-such-enemy"),false);
 const before=g.snapshot();
 use(g,"curse","left");
 let s=g.snapshot();
 const left=s.enemies.find(x=>x.id==="left");
 assert.equal(left.poison,3);
 assert.equal(left.vulnerable,1);
 assert.equal(left.hp,before.enemies.find(x=>x.id==="left").hp);
 assert.equal(s.darkCastsThisTurn,1);
 use(g,"mentalCollapse","left");
 s=g.snapshot();
 assert.equal(s.enemies.find(x=>x.id==="left").hp,2); // floor((8 + 7) * 1.5) = 22
 assert.equal(s.enemies.find(x=>x.id==="left").weaken,1);
 assert.equal(s.darkCastsThisTurn,2);
 assert.equal(s.lastSynergy.title,"精神崩壊連携");
 assert.equal(s.energy,0);
});
test("unmarked mental collapse does baseline damage and may not double trigger an affliction bonus",()=>{
 const g=boss(["mentalCollapse","bolt","bolt","bolt","bolt"]);
 use(g,"mentalCollapse","left");
 let s=g.snapshot();
 assert.equal(s.enemies.find(x=>x.id==="left").hp,24-8);
 assert.equal(s.enemies.find(x=>x.id==="left").weaken,1);
 assert.equal(s.lastSynergy,null);
});
test("death song damages all targets and adds conditional damage per afflicted enemy",()=>{
 const g=boss(["curse","hallucination","deathSong","bolt","bolt"]);
 use(g,"curse","left");
 use(g,"hallucination","right");
 assert.equal(g.snapshot().enemies.find(x=>x.id==="right").weaken,2);
 assert.equal(g.snapshot().darkCastsThisTurn,2);
 assert.equal(g.endTurn(),true);
 const before=g.snapshot();
 assert.equal(before.enemies.find(x=>x.id==="left").poison,2);
 assert.equal(before.enemies.find(x=>x.id==="right").weaken,1);
 const initial=new Map(before.enemies.map(e=>[e.id,{hp:e.hp,block:e.block,vulnerable:e.vulnerable}]));
 use(g,"deathSong");
 const s=g.snapshot();
 for(const e of s.enemies){
  const old=initial.get(e.id);
  const base=e.id==="boss"?7:13;
  const boosted=old.vulnerable>0?Math.floor(base*1.5):base;
  const raw=Math.max(0,boosted-(e.id==="boss"?4:0));
  const dealt=Math.min(old.hp,Math.max(0,raw-old.block));
  assert.equal(e.hp,old.hp-dealt,e.id+" receives its own conditional damage");
 }
 assert.equal(s.attackCardsThisTurn,1);
});
test("hallucination weakens, draws and doesn't corrupt vulnerability while older fragile still works",()=>{
 const g=boss(["hallucination","fragile","bolt","bolt","bolt"]);
 use(g,"hallucination","left");
 const s=g.snapshot();
 assert.equal(s.enemies.find(x=>x.id==="left").weaken,2);
 assert.equal(s.enemies.find(x=>x.id==="left").vulnerable,0);
 assert.equal(Number.isNaN(s.enemies.find(x=>x.id==="left").vulnerable),false);
 assert.equal(s.darkCastsThisTurn,1);
 use(g,"fragile","left");
 assert.equal(g.snapshot().enemies.find(x=>x.id==="left").vulnerable,2);
});
test("black magic art and selection share existing UI, keeping gesture handlers untouched",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-fire.css",import.meta.url),"utf8");
 for(const id of ids)assert.match(html,new RegExp('"'+id+'"'));
 for(const art of ["mental-collapse","curse","death-song","hallucination"])assert.ok(css.includes(".b1-magic-art--"+art));
 assert.ok(html.includes('attachB1OriginalArt(picture,c.magicArt)'));
});
