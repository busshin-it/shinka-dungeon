import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CARDS,PHYSICAL_STARTER,STARTER,getB1Card,isB1Magic,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const IDS=["bludgeon","rapidPunch","heavyBlow","sneakHit","ironHammer","doping","adversity","rage"];
function boss(deck,maxHp=75,seed=111){
 const g=createB1Game({seed,maxHp,testDeck:deck});
 assert.equal(g.startBossPractice("test"),true);
 return g;
}
function cast(g,id,target="left"){
 const i=g.snapshot().hand.indexOf(id);
 assert.ok(i>=0,id+" not in hand");
 assert.equal(g.play(i,target),true,id+" cast");
}
function hp(g,id="left"){return g.snapshot().enemies.find(e=>e.id===id).hp;}
test("B1 physical pack has exactly eight cards, upgrades, selectable starters and merchant entries",()=>{
 assert.equal(Object.keys(CARDS).length,55);
 const g=createB1Game({seed:1});
 assert.equal(STARTER.length,9);
 for(const id of IDS){
  const card=CARDS[id],up=getB1Card(id+"~");
  assert.equal(card.weapon,true,id+" is physical");
  assert.equal(isB1Magic(id),false);
  assert.ok(card.magicArt);
  assert.ok(up);
  assert.notEqual(up.text,card.text);
  assert.ok(g.snapshot().shopStock.some(item=>item.id===id));
  const start=createB1Game({seed:11});
  assert.equal(start.selectStarter(id),true);
  assert.ok(start.snapshot().deck.includes(id));
 }
 assert.equal(getB1Card("doping~").doping,3);
 assert.equal(getB1Card("adversity~").cost,0);
 assert.equal(getB1Card("ironHammer~").damage,25);
 assert.equal(getB1Card("rage~").lowHpDamage,23);
});
test("physical-only starter is optional and truly contains no magical cards",()=>{
 const original=createB1Game({seed:19});
 assert.equal(original.snapshot().deck.length,STARTER.length);
 assert.equal(original.selectStarter("physical"),true);
 const s=original.snapshot();
 assert.equal(s.phase,"battle");
 assert.deepEqual(s.deck,PHYSICAL_STARTER);
 assert.equal(s.deck.length,9);
 assert.equal(s.deck.every(id=>!isB1Magic(id)),true);
 const legacy=createB1Game({seed:19});
 assert.equal(legacy.selectStarter("lightning"),true);
 assert.equal(legacy.snapshot().deck.length,10);
 assert.equal(legacy.snapshot().deck.includes("bolt"),true);
});
test("bludgeon, double strike and heavy blow get exact bonus only without magic remaining in hand",()=>{
 for(const [id,base,pure] of [["bludgeon",5,7],["rapidPunch",12,16],["heavyBlow",12,16]]){
  const solo=boss([id,id,id,id,id]);
  cast(solo,id);assert.equal(24-hp(solo),pure,id+" with no magic");
  const mix=boss([id,"bolt","bolt","bolt","bolt"]);
  cast(mix,id);assert.equal(24-hp(mix),base,id+" with magic");
 }
});
test("free quick strike grants a real draw only after the hand becomes magic-free",()=>{
 const a=boss(["sneakHit","sneakHit","bludgeon","bludgeon","bludgeon","bludgeon"]);
 const before=a.snapshot();
 cast(a,"sneakHit");
 const after=a.snapshot();
 assert.equal(after.energy,before.energy);
 assert.equal(after.hand.length,before.hand.length);
 assert.equal(before.enemies[0].hp-after.enemies[0].hp,4);
 const b=boss(["sneakHit","sneakHit","bolt","bolt","bolt","bolt"]);
 const count=b.snapshot().hand.length;
 cast(b,"sneakHit");
 assert.equal(b.snapshot().hand.length,count-1,"a remaining spell blocks quick draw");
});
test("iron hammer requires absolutely no magic in the entire deck and fails atomically",()=>{
 const mixed=boss(["ironHammer","bludgeon","bolt","bludgeon","bludgeon"]);
 const pre=mixed.snapshot();
 const ix=pre.hand.indexOf("ironHammer");
 assert.equal(mixed.play(ix,"left"),false);
 assert.equal(mixed.snapshot().energy,pre.energy);
 assert.deepEqual(mixed.snapshot().hand,pre.hand);
 assert.equal(hp(mixed),24);
 const pure=boss(["ironHammer","bludgeon","bludgeon","bludgeon","bludgeon"]);
 cast(pure,"ironHammer");
 assert.equal(hp(pure),4);
});
test("doping buffs physical damage, persists across turns, and vanishes on a magical cast",()=>{
 const g=boss(["doping","bludgeon","bludgeon","bludgeon","bludgeon"]);
 cast(g,"doping");assert.equal(g.snapshot().dopingBonus,2);
 cast(g,"bludgeon");assert.equal(hp(g),24-9);
 assert.equal(g.snapshot().dopingBonus,2);
 const mixed=boss(["doping","bolt","bludgeon","bludgeon","bludgeon"]);
 cast(mixed,"doping");assert.equal(mixed.snapshot().dopingBonus,2);
 cast(mixed,"bolt","right");assert.equal(mixed.snapshot().dopingBonus,0);
 cast(mixed,"bludgeon");assert.equal(hp(mixed),24-7,"no magic left in hand after using bolt");
});
test("adversity converts previous enemy-turn actual HP loss into one next attack, not each multi-hit",()=>{
 const g=boss(["adversity","rapidPunch","bludgeon","bludgeon","bludgeon"]);
 g.endTurn();
 const lost=g.snapshot().lastTurnHpLoss;
 assert.equal(lost,5,"first B1 guard strike damages hero, other enemies prepare");
 cast(g,"adversity");assert.equal(g.snapshot().nextPhysicalAttackBonus,5);
 cast(g,"rapidPunch");
 assert.equal(hp(g),24-(8*2+5),"adversity bonus applies only once to 2-hit card");
 assert.equal(g.snapshot().nextPhysicalAttackBonus,0);
 const cancel=boss(["adversity","bolt","bludgeon","bludgeon","bludgeon"]);
 cancel.endTurn();cast(cancel,"adversity");
 assert.equal(cancel.snapshot().nextPhysicalAttackBonus,5);
 cast(cancel,"bolt","right");
 assert.equal(cancel.snapshot().nextPhysicalAttackBonus,0,"magic cancels stored adversity bonus");
});
test("dragon rage changes to 20 damage at one-third or less of max HP",()=>{
 const above=boss(["rage","bludgeon","bludgeon","bludgeon","bludgeon"],75);
 cast(above,"rage");
 assert.equal(hp(above),14,"above one-third: 10 to each guard");
 assert.equal(hp(above,"boss"),135-6,"boss has 4 guard armor");
 const below=boss(["rage","bludgeon","bludgeon","bludgeon","bludgeon"],999);
 cast(below,"rage");
 assert.equal(hp(below),4,"at one-third: 20 to each guard");
 assert.equal(hp(below,"boss"),135-16,"boss armor still applies");
});
test("eight cards are visible in the UI and shop art, while battle gestures remain unchanged",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-fire.css",import.meta.url),"utf8");
 for(const id of IDS)assert.ok(html.includes('"'+id+'"'),id);
 for(const art of ["bludgeon","rapid","heavy","sneak","hammer","doping","adversity","rage"])
  assert.ok(css.includes(".b1-magic-art--physical-"+art));
 assert.ok(html.includes('game.selectStarter("physical")'));
 assert.ok(html.includes('c.requiresPureDeck&&s.deck.some'));
});
