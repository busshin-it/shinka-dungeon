import test from "node:test";
import assert from "node:assert/strict";
import {CARDS, createB1Game} from "../v4-1/underground-b1-engine.mjs";
import {selectB1EarlyGrowthOffers} from "../v4-1/underground-b1-early-growth.mjs";

function makeJourney(routeTrial=true) {
 const game=createB1Game({routeTrial,weaponTrial:true,seed:20261016,maxHp:999,testDeck:Array(12).fill("fireLarge")});
 assert.equal(game.selectStarter("flow"),true);
 if(routeTrial)assert.equal(game.selectStartingWeapon("oldClub"),true);
 return game;
}
function win(game) {
 for(let n=0;n<90 && game.snapshot().phase==="battle";n++){
  let snap=game.snapshot();
  for(let k=0;k<12&&game.snapshot().phase==="battle";k++){
   snap=game.snapshot();
   const idx=snap.hand.findIndex(id=>id==="fireLarge"&&snap.energy>=3);
   if(idx<0)break;
   const target=snap.enemies.find(e=>e.hp>0);
   assert.ok(target);
   assert.equal(game.play(idx,target.id),true);
  }
  if(game.snapshot().phase==="battle")game.endTurn();
 }
 assert.equal(game.snapshot().phase,"reward","test battle must reach reward");
}
test("early reward offer is deterministic, varied, unique, and does not mutate input",()=>{
 const cards={l:{lightning:true,kind:"attack"},g:{kind:"guard",block:5},a:{kind:"attack",weapon:true},d:{kind:"draw",draw:2},x:{kind:"attack"}};
 const shuffled=["x","d","l","a","g"];const original=[...shuffled];
 const choose=()=>selectB1EarlyGrowthOffers(shuffled,["l"],"thunderStaff",id=>cards[id],4);
 assert.deepEqual(choose(),choose());assert.deepEqual(shuffled,original);
 assert.equal(choose().length,4);assert.equal(new Set(choose()).size,4);
 assert.equal(choose()[0],"l");
 assert.ok(choose().includes("g")||choose().includes("d")||choose().includes("a"));
});
test("first three route victories offer four cards, two independent choices, and retain checkpoint progress",()=>{
 const game=makeJourney(true);
 win(game);
 let s=game.snapshot();
 assert.equal(s.rewards.length,4);
 assert.equal(s.rewardPicksRemaining,2);
 const first=s.rewards[0],second=s.rewards[1],before=s.deck.length;
 assert.equal(game.chooseReward(first),true);
 s=game.snapshot();
 assert.equal(s.phase,"reward");assert.equal(s.rewardPicksRemaining,1);
 assert.equal(s.deck.length,before+1);
 assert.ok(!s.rewards.includes(first));
 const saved=game.exportCheckpoint();
 const restored=makeJourney(true);
 assert.equal(restored.restoreCheckpoint(saved),true);
 assert.equal(restored.snapshot().rewardPicksRemaining,1);
 assert.equal(restored.chooseReward(first),false);
 assert.equal(restored.chooseReward(second),true);
 assert.equal(restored.snapshot().phase,"between");
 assert.equal(restored.snapshot().deck.length,before+2);
 assert.equal(restored.enterRouteRoom("battle"),true);
 win(restored);
 assert.equal(restored.snapshot().rewards.length,4);
 assert.equal(restored.chooseReward(null),true);
 assert.equal(restored.snapshot().phase,"between");
});
test("one early free event card is optional, costs no HP, and cannot be repeated",()=>{
 const game=makeJourney(true);
 win(game);assert.equal(game.chooseReward(null),true);
 assert.equal(game.enterRouteRoom("event"),true);
 const s=game.snapshot(),offer=s.eventBloodOffers[0];
 assert.ok(offer);
 assert.equal(game.chooseRouteEvent("study","invalid"),false);
 assert.equal(game.chooseRouteEvent("study",offer),true);
 assert.equal(game.snapshot().hp,s.hp);
 assert.equal(game.snapshot().deck.length,s.deck.length+1);
 assert.equal(game.snapshot().routeStudyUsed,true);
 assert.equal(game.enterRouteRoom("event"),true);
 assert.equal(game.chooseRouteEvent("study",game.snapshot().eventBloodOffers[0]),false);
 assert.equal(game.chooseRouteEvent("gold"),true);
});
test("the legacy 12-battle reward still offers three with one pick only",()=>{
 const game=makeJourney(false);
 win(game);
 const s=game.snapshot();
 assert.equal(s.rewards.length,3);
 assert.equal(s.rewardPicksRemaining,1);
 assert.equal(game.chooseReward(s.rewards[0]),true);
 assert.equal(game.snapshot().phase,"between");
});
