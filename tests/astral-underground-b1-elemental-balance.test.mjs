import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CARDS,createB1Game,getB1Card} from "../v4-1/underground-b1-engine.mjs";

// Fixed-seed multi-actor practice is a repeatable *combat rule* check, not
// a claim about human fun, victory rate, or real Android frame rendering.
const boss=(id)=>{
 const g=createB1Game({seed:17,testDeck:Array(12).fill(id)});
 assert.equal(g.startBossPractice("test"),true);
 return g;
};
function cast(g,id,target="boss"){
 const before=g.snapshot(),idx=before.hand.indexOf(id);
 assert.ok(idx>=0,id+" must be in the hand");
 assert.equal(g.play(idx,target),true);
 const after=g.snapshot();
 return {before,after};
}
function change(before,after,id){
 return before.enemies.find(e=>e.id===id).hp-after.enemies.find(e=>e.id===id).hp;
}
test("multi-actor guard pressure makes small, medium and large all-fire distinct",()=>{
 const outcomes=[];
 for(const id of ["fireWaveSmall","fireWaveMedium","fireWaveLarge"]){
  const {before,after}=cast(boss(id),id,"left");
  outcomes.push({
   cost:CARDS[id].cost,
   left:change(before,after,"left"),
   boss:change(before,after,"boss"),
   right:change(before,after,"right")
  });
 }
 assert.deepEqual(outcomes,[
  {cost:0,left:2,boss:0,right:2},
  {cost:2,left:9,boss:5,right:9},
  {cost:3,left:15,boss:11,right:15}
 ]);
 // A zero-cost spell is weak against protected bosses, but can help soften two guards.
 assert.ok(outcomes[0].left+outcomes[0].right>0);
 assert.equal(outcomes[0].boss,0);
});
test("guard reduction applies twice to middle thunder and once to single-strike thunder",()=>{
 const outcomes=[];
 for(const id of ["thunderSmall","thunderMedium","thunderLarge"]){
  const {before,after}=cast(boss(id),id,"boss");
  outcomes.push({id,cost:CARDS[id].cost,damage:change(before,after,"boss"),attackCards:after.attackCardsThisTurn,hits:after.attacksThisTurn});
 }
 assert.deepEqual(outcomes,[
  {id:"thunderSmall",cost:1,damage:3,attackCards:1,hits:1},
  {id:"thunderMedium",cost:2,damage:6,attackCards:1,hits:2},
  {id:"thunderLarge",cost:3,damage:17,attackCards:1,hits:1}
 ]);
 const medium=getB1Card("thunderMedium~");
 assert.equal(medium.hits,2);assert.equal(medium.damage,9);
});
test("expensive spells cannot be used after their energy is spent; old starter unchanged",()=>{
 const game=boss("fireWaveLarge");
 assert.equal(game.snapshot().energy,3);
 cast(game,"fireWaveLarge","left");
 const before=game.snapshot();
 assert.equal(before.energy,0);
 assert.equal(game.play(before.hand.indexOf("fireWaveLarge"),"left"),false);
 assert.deepEqual(game.snapshot(),before);
});
test("all six art filenames map to optional B1 DOM images and preserve CSS fallbacks",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-fire.css",import.meta.url),"utf8");
 for(const name of ["fire-aoe-small.webp","fire-aoe-medium.webp","fire-aoe-large.webp",
                     "thunder-single-small.webp","thunder-single-medium.webp","thunder-single-large.webp"]){
  assert.ok(html.includes('"'+name+'"'),name+" must be mapped");
 }
 assert.match(html,/unavailableB1Art/);
 assert.match(html,/img\.addEventListener\("error"/);
 assert.match(html,/attachB1OriginalArt\(picture,c\.magicArt\)/);
 assert.match(html,/attachB1OriginalArt\(thumb,card\.magicArt\)/);
 assert.match(css,/\.b1-original-elemental-img/);
 assert.match(css,/object-fit:cover/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/b1-magic-art--fire-rain-small/);
 assert.match(css,/b1-magic-art--thunder-large/);
 // The B1 handset can still be dragged on the first touch, and the art cannot
 // steal pointer events from the card. These are source checks, not device QA.
 const hand=readFileSync(new URL("../v4-1/underground-b1-overlay-hand.css",import.meta.url),"utf8");
 assert.match(hand,/touch-action:none/);
 assert.match(hand,/clamp\(129px,14\.25vw,158px\)/);
});
