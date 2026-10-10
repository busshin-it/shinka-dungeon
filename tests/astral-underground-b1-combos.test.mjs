import test from "node:test";
import assert from "node:assert/strict";
import {CARDS,STARTER,createB1Game} from "../v4-1/underground-b1-engine.mjs";
const begin=(cards,seed=23)=>{const g=createB1Game({seed,maxHp:999,testDeck:cards});assert.equal(g.selectStarter("lightning"),true);return g;};
const use=(g,id,target="rat")=>{const i=g.snapshot().hand.indexOf(id);assert.ok(i>=0,"missing "+id);assert.equal(g.play(i,target),true);};
test("B1 uses a ten-card starter and a five-card, three-energy turn",()=>{
 const g=createB1Game({seed:24});assert.equal(STARTER.length,9);
 assert.equal(g.selectStarter("lightning"),true);
 const s=g.snapshot();assert.equal(s.deck.length,10);assert.equal(s.hand.length,5);assert.equal(s.energy,3);
});
test("draw, temporary energy and guard+draw use shared deck/discard logic",()=>{
 const g=begin(["flow","ward","charge","bolt"]);
 const energy=g.snapshot().energy;
 use(g,"charge");assert.equal(g.snapshot().energy,energy+1);
 assert.equal(g.snapshot().exhaust.includes("charge"),true);
 const before=g.snapshot().hand.length;
 use(g,"flow");assert.ok(g.snapshot().hand.length>=before);
 use(g,"ward");assert.equal(g.snapshot().block,7);
 assert.ok(g.snapshot().hand.length>0);
});
test("attacks combo with chain magic, not with healing or cards merely played",()=>{
 const g=begin(["bolt","chain"]);
 use(g,"bolt");assert.equal(g.snapshot().enemies[0].hp,11);
 use(g,"chain");assert.equal(g.snapshot().phase,"reward");
});
test("vulnerability boosts attack damage by fifty percent",()=>{
 const g=begin(["fragile","bolt"]);
 use(g,"fragile");assert.equal(g.snapshot().enemies[0].vulnerable,2);
 use(g,"bolt");assert.equal(g.snapshot().enemies[0].hp,8);
});
test("poison fires even when enemies prepare, and loses one stack per round",()=>{
 const g=begin(["poison","guard"]);
 use(g,"poison");assert.equal(g.snapshot().enemies[0].poison,5);
 g.endTurn();assert.equal(g.snapshot().enemies[0].hp,12);
 assert.equal(g.snapshot().enemies[0].poison,4);
 g.endTurn();assert.equal(g.snapshot().enemies[0].hp,8);
 assert.equal(g.snapshot().enemies[0].poison,3);
});
test("weak reduces enemy attack, retains a second turn, then expires",()=>{
 const g=begin(["frost","guard"]);use(g,"frost");
 assert.equal(g.snapshot().enemies[0].weaken,2);
 g.endTurn();assert.equal(g.snapshot().hp,996);
 assert.equal(g.snapshot().enemies[0].weaken,1);
 g.endTurn();assert.equal(g.snapshot().enemies[0].weaken,0);
});
test("power is persistent, and heal exhausts for this combat",()=>{
 const g=begin(["focus","heal","guard","guard","bolt","guard"]);
 use(g,"focus");assert.equal(g.snapshot().powerDraw,1);
 assert.deepEqual(g.snapshot().powers,["focus"]);
 use(g,"heal");assert.equal(g.snapshot().exhaust.includes("heal"),true);
 assert.equal(g.snapshot().discard.includes("heal"),false);
 g.endTurn();assert.equal(g.snapshot().hand.length,6);
});
test("multihit is distinct from one heavy attack",()=>{
 const g=begin(["double"]);
 use(g,"double");assert.equal(g.snapshot().enemies[0].hp,9);
 assert.equal(g.snapshot().attacksThisTurn,2);
});
