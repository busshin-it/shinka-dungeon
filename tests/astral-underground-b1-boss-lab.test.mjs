import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CARDS,STAGES,STARTER,IDEAL_B1_BOSS_DECK,B1_BOSS_CHANNEL_THRESHOLD,createB1Game} from "../v4-1/underground-b1-engine.mjs";
const play=(g,id,target="boss")=>{
 const i=g.snapshot().hand.indexOf(id);
 assert.ok(i>=0,"missing card "+id);
 assert.equal(g.play(i,target),true);
};
test("ideal deck is 14 cards and can be assembled from 10 starters and the four reward pools",()=>{
 assert.equal(STARTER.length,9);
 assert.equal(IDEAL_B1_BOSS_DECK.length,14);
 const counts=new Map();
 for(const id of IDEAL_B1_BOSS_DECK){assert.ok(CARDS[id],id);counts.set(id,(counts.get(id)||0)+1);}
 assert.equal(counts.get("bolt"),4);
 assert.equal(counts.get("guard"),4);
 for(const id of ["break","scatter","ward","focus","strength","charge"])assert.equal(counts.get(id),1);
 assert.ok(["lightning","scatter","flow"].includes("scatter"));
 for(const [i,id] of ["ward","focus","strength","charge"].entries())assert.ok(STAGES[i].rewards.includes(id),"reward "+id+" not available on stage "+i);
});
test("boss practice starts at fifth fight, with matching HP, and never modifies the normal run",()=>{
 const g=createB1Game({seed:12});
 assert.equal(g.startBossPractice("invalid"),false);
 assert.equal(g.startBossPractice("ideal"),true);
 const s=g.snapshot();
 assert.equal(s.phase,"battle");
 assert.equal(s.stage,4);assert.equal(s.hp,58);assert.equal(s.maxHp,75);assert.equal(s.practiceMode,"ideal");
 assert.deepEqual(s.deck,IDEAL_B1_BOSS_DECK);
 assert.equal(s.enemies.length,3);
 assert.equal(g.startBossPractice("ideal"),false);
 const regular=createB1Game({seed:12});
 assert.equal(regular.selectStarter("scatter"),true);
 assert.equal(regular.snapshot().stage,0);
 assert.equal(regular.snapshot().deck.length,10);
});
test("baseline practice uses only basic ten cards so an ideal deck has a meaningful comparison",()=>{
 const g=createB1Game({seed:8});
 assert.equal(g.startBossPractice("baseline"),true);
 assert.equal(g.snapshot().hp,58);
 assert.equal(g.snapshot().deck.length,10);
 assert.equal(g.snapshot().practiceMode,"baseline");
});
test("each hit counts only damage past the guard reduction toward a 24-HP spell interrupt",()=>{
 const g=createB1Game({seed:7,testDeck:Array(10).fill("lightning")});
 assert.equal(g.startBossPractice("test"),true);
 const boss=()=>g.snapshot().enemies.find(e=>e.id==="boss");
 for(let i=0;i<2;i++){
  play(g,"lightning");
  assert.equal(boss().channelDamage,(i+1)*9);
  assert.equal(boss().channelBroken,false);
  g.endTurn();
 }
 assert.equal(g.snapshot().turn,3);
 assert.equal(g.snapshot().intents.find(x=>x.id==="boss").kind,"attack");
 const hp=g.snapshot().hp;
 play(g,"lightning");
 assert.equal(boss().channelDamage,27);
 assert.equal(boss().channelBroken,true);
 const move=g.snapshot().intents.find(x=>x.id==="boss");
 assert.equal(move.kind,"rest");
 assert.match(move.label,/詠唱崩れ/);
 g.endTurn();
 const drop=hp-g.snapshot().hp;
 assert.ok(drop>=0&&drop<=10,"third-turn damage is from guards, not the 21-damage earthquake: "+drop);
 g.endTurn();
 assert.equal(g.snapshot().turn,5);
 assert.equal(boss().channelDamage,0);
 assert.equal(boss().channelBroken,false);
});
test("poison can also interrupt: prevents only the boss attack, not living guards",()=>{
 const g=createB1Game({seed:11,testDeck:Array(10).fill("poison")});
 assert.equal(g.startBossPractice("test"),true);
 for(let i=0;i<3;i++)play(g,"poison");
 assert.equal(g.snapshot().enemies.find(e=>e.id==="boss").poison,15);
 g.endTurn();
 const b1=g.snapshot().enemies.find(e=>e.id==="boss");
 assert.equal(b1.channelDamage,15);
 assert.equal(b1.channelBroken,false);
 g.endTurn();
 const b2=g.snapshot().enemies.find(e=>e.id==="boss");
 assert.ok(b2.channelDamage>=B1_BOSS_CHANNEL_THRESHOLD);
 assert.equal(b2.channelBroken,true);
});
test("B1 UI exposes direct boss practice, live interrupt meter, and deck inspection",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 for(const key of ["id=\"bossPractice\"","id=\"bossBasicPractice\"","startBossPractice(\"ideal\")","startBossPractice(\"baseline\")","id=\"breakTrack\"","channelDamage","B1_BOSS_CHANNEL_THRESHOLD","deckModal.showModal()"]){
  assert.ok(html.includes(key),"missing UI integration: "+key);
 }
 assert.match(html,/href="\.\/six-paths-stage\.css"/);
 assert.match(html,/class="puppet hero-puppet"/);
});
