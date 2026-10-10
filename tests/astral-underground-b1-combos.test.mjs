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
test("zero-cost energy card is exhausted and grants one extra energy",()=>{
 const g=begin(["charge","charge","charge"]);
 use(g,"charge");assert.equal(g.snapshot().energy,4);
 assert.equal(g.snapshot().exhaust.length,1);
});
test("draw cards draw during the turn, and block+draw grants both effects",()=>{
 const g=begin(Array(7).fill("flow"));
 const before=g.snapshot().hand.length;
 use(g,"flow");assert.equal(g.snapshot().hand.length,before+1);
 const h=begin(Array(7).fill("ward"));
 use(h,"ward");assert.equal(h.snapshot().block,7);
 assert.equal(h.snapshot().hand.length,5);
});
test("attacks combo with chain magic, not with healing or cards merely played",()=>{
 const g=begin(["bolt","chain"]);
 use(g,"bolt");assert.equal(g.snapshot().enemies[0].hp,36);
 use(g,"chain");assert.equal(g.snapshot().enemies[0].hp,25);
});
test("vulnerability boosts attack damage by fifty percent",()=>{
 const g=begin(["fragile","bolt"]);
 use(g,"fragile");assert.equal(g.snapshot().enemies[0].vulnerable,2);
 use(g,"bolt");assert.equal(g.snapshot().enemies[0].hp,33);
});
test("poison fires even when enemies prepare, and loses one stack per round",()=>{
 const g=begin(["poison","guard"]);
 use(g,"poison");assert.equal(g.snapshot().enemies[0].poison,5);
 g.endTurn();assert.equal(g.snapshot().enemies[0].hp,37);
 assert.equal(g.snapshot().enemies[0].poison,4);
 g.endTurn();assert.equal(g.snapshot().enemies[0].hp,33);
 assert.equal(g.snapshot().enemies[0].poison,3);
});
test("weak reduces enemy attack, retains a second turn, then expires",()=>{
 const g=begin(["frost","guard"]);use(g,"frost");
 assert.equal(g.snapshot().enemies[0].weaken,2);
 g.endTurn();assert.equal(g.snapshot().hp,993);
 assert.equal(g.snapshot().enemies[0].weaken,1);
 g.endTurn();assert.equal(g.snapshot().enemies[0].weaken,0);
});
test("persistent power increases next turn draw by one",()=>{
 const g=begin(Array(8).fill("focus"));
 use(g,"focus");assert.equal(g.snapshot().powerDraw,1);
 assert.deepEqual(g.snapshot().powers,["focus"]);
 g.endTurn();assert.equal(g.snapshot().hand.length,6);
});
test("healing cards exhaust but remain in the permanent deck",()=>{
 const g=begin(Array(4).fill("heal"));const size=g.snapshot().deck.length;
 use(g,"heal");assert.equal(g.snapshot().exhaust.includes("heal"),true);
 assert.equal(g.snapshot().discard.includes("heal"),false);
 assert.equal(g.snapshot().deck.length,size);
});
test("multihit is distinct from one heavy attack",()=>{
 const g=begin(["double"]);
 use(g,"double");assert.equal(g.snapshot().enemies[0].hp,34);
 assert.equal(g.snapshot().attacksThisTurn,2);
});
