import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STARTER,STAGES,CARDS,IDEAL_B1_BOSS_DECK,COMBO_B1_BOSS_DECK,createB1Game} from "../v4-1/underground-b1-engine.mjs";

function take(g,id,target="boss"){
 const s=g.snapshot(),index=s.hand.indexOf(id);
 assert.ok(index>=0,"missing "+id);
 assert.equal(g.play(index,target),true);
}
test("combo deck is 14 real cards with exactly one obtainable reward from each of four stages",()=>{
 assert.equal(COMBO_B1_BOSS_DECK.length,14);
 assert.deepEqual(COMBO_B1_BOSS_DECK.slice(0,STARTER.length),STARTER);
 const counts=new Map();
 for(const id of COMBO_B1_BOSS_DECK){assert.ok(CARDS[id],id);counts.set(id,(counts.get(id)||0)+1);}
 assert.equal(counts.get("scatter"),1);
 for(const name of ["flow","chain","strength","charge"])assert.equal(counts.get(name),1);
 const options=["flow","chain","strength","charge"];
 for(let i=0;i<4;i++)assert.ok(STAGES[i].rewards.includes(options[i]),"cannot obtain "+options[i]+" after "+(i+1));
 assert.notDeepEqual(COMBO_B1_BOSS_DECK,IDEAL_B1_BOSS_DECK);
});
test("combo practice starts on boss with 58 HP and does not affect standard or stable practice",()=>{
 const g=createB1Game({seed:20261010});assert.equal(g.startBossPractice("combo"),true);
 const s=g.snapshot();
 assert.equal(s.practiceMode,"combo");assert.equal(s.stage,STAGES.length-1);
 assert.equal(s.hp,58);assert.equal(s.maxHp,75);assert.equal(s.hand.length,5);
 assert.deepEqual(s.deck,COMBO_B1_BOSS_DECK);
 assert.equal(g.startBossPractice("combo"),false);
 const stable=createB1Game({seed:20261010});stable.startBossPractice("ideal");
 assert.deepEqual(stable.snapshot().deck,IDEAL_B1_BOSS_DECK);
 const main=createB1Game({seed:20261010});main.selectStarter("scatter");
 assert.equal(main.snapshot().stage,0);
});
test("power -> area -> chain boosts damage while 0-energy charge allows the sequence",()=>{
 const five=["strength","charge","scatter","chain","flow"];
 const g=createB1Game({seed:101,testDeck:five});g.startBossPractice("test");
 take(g,"strength");assert.equal(g.snapshot().strength,2);
 assert.equal(g.snapshot().energy,2);
 take(g,"charge");assert.equal(g.snapshot().energy,3);
 take(g,"scatter");
 let s=g.snapshot();
 assert.deepEqual(s.enemies.map(e=>e.hp),[16,131,16]);
 assert.equal(s.attacksThisTurn,1);
 take(g,"chain","boss");
 s=g.snapshot();
 assert.equal(s.energy,1);
 assert.equal(s.enemies.find(e=>e.role==="boss").hp,122);
 assert.equal(s.enemies.find(e=>e.role==="boss").channelDamage,13);
 assert.equal(s.attacksThisTurn,2);
});
test("the ordering bonus is real: chain before area suffers six less damage",()=>{
 const order=["strength","charge","scatter","chain","flow"];
 const g=createB1Game({seed:101,testDeck:order});g.startBossPractice("test");
 take(g,"strength");take(g,"charge");take(g,"chain","boss");
 assert.equal(g.snapshot().enemies.find(e=>e.role==="boss").hp,132);
 take(g,"scatter");
 assert.equal(g.snapshot().enemies.find(e=>e.role==="boss").hp,128);
});
test("B1 spacing gives actors separate visual widths and distinct target hitboxes on desktop and mobile",()=>{
 const css=readFileSync(new URL("../v4-1/underground-b1-actors.css",import.meta.url),"utf8");
 for(const term of ["/* Second-pass spacing:","column-gap:clamp(22px,3.5vw,62px)","max-width:114px","max-width:150px","@media(max-width:430px)","column-gap:9px"])
  assert.ok(css.includes(term),"spacing rule missing "+term);
 assert.match(css,/\.stage\.b1-multi \.hero-puppet/);
 const page=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 assert.match(page,/id="bossComboPractice"/);
 assert.match(page,/startBossPractice\("combo"\)/);
 assert.match(page,/COMBO_B1_BOSS_DECK/);
 assert.match(page,/s\.practiceMode==="combo"/);
});
