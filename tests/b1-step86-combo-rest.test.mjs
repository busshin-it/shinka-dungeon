import test from "node:test";
import assert from "node:assert/strict";
import {createB1Game} from "../v4-1/underground-b1-engine.mjs";
import {getB1JourneyComboTone} from "../v4-1/underground-b1-journey-combo.mjs";

function journey(cards) {
 const game=createB1Game({seed:20261016,routeTrial:true,weaponTrial:true,maxHp:999,testDeck:cards});
 assert.equal(game.selectStarter("flow"),true);
 assert.equal(game.selectStartingWeapon("oldClub"),true);
 return game;
}
function win(game){
 for(let t=0;t<90&&game.snapshot().phase==="battle";t++){
  for(let k=0;k<15&&game.snapshot().phase==="battle";k++){
   const s=game.snapshot(),index=s.hand.findIndex(id=>id==="fireLarge"&&s.energy>=3);
   if(index<0)break;
   const target=s.enemies.find(e=>e.hp>0);
   assert.ok(target);
   assert.equal(game.play(index,target.id),true);
  }
  if(game.snapshot().phase==="battle")game.endTurn();
 }
 assert.equal(game.snapshot().phase,"reward");
}
test("battle combo pulse classification requires an actual engine synergy event",()=>{
 assert.equal(getB1JourneyComboTone(null),null);
 assert.equal(getB1JourneyComboTone({title:"毒炎連携",detail:"毒の敵へ：威力＋6"}),"poison");
 assert.equal(getB1JourneyComboTone({title:"霜砕き連携",detail:"弱体追撃：威力＋7"}),"frost");
 assert.equal(getB1JourneyComboTone({title:"雷連鎖",detail:"連続使用"}),"thunder");
 assert.equal(getB1JourneyComboTone({title:"返響の盾連携",detail:"ドロー"}),"arcane");
 assert.equal(getB1JourneyComboTone({title:"毒炎連携"}),null);
 assert.equal(getB1JourneyComboTone({title:"不明",detail:"なし"}),null);
});
test("poison followed by flame reports a real engine combo, not a predicted hit",()=>{
 const game=journey(["poison","flare","poison","flare","poison","flare","poison","flare","poison","flare"]);
 let s=game.snapshot();const target=s.enemies[0].id;
 const first=s.hand.findIndex(x=>x==="poison");assert.ok(first>=0);
 assert.equal(game.play(first,target),true);
 s=game.snapshot();
 const next=s.hand.findIndex(x=>x==="flare");assert.ok(next>=0);
 assert.equal(game.play(next,target),true);
 assert.equal(game.snapshot().lastSynergy.title,"毒炎連携");
 assert.equal(getB1JourneyComboTone(game.snapshot().lastSynergy),"poison");
});
test("rest optionally trims one basic card, consumes the rest and preserves checkpoint",()=>{
 const game=journey(["basicAttack","basicDefense",...Array(10).fill("fireLarge")]);
 win(game);
 assert.equal(game.chooseReward(null),true);
 assert.equal(game.enterRouteRoom("rest"),true);
 const before=game.snapshot(),index=before.deck.indexOf("basicAttack");
 assert.ok(index>=0);
 assert.equal(game.chooseRest("refine",-1),false);
 assert.equal(game.chooseRest("refine",before.deck.indexOf("fireLarge")),false);
 assert.equal(game.snapshot().deck.length,before.deck.length);
 assert.equal(game.chooseRest("refine",index),true);
 const after=game.snapshot();
 assert.equal(after.restUsed,true);
 assert.equal(after.restChoice,"refine");
 assert.equal(after.deck.length,before.deck.length-1);
 assert.equal(after.deck.filter(x=>x==="basicAttack").length,before.deck.filter(x=>x==="basicAttack").length-1);
 assert.equal(after.hp,before.hp);
 assert.equal(game.chooseRest("refine",0),false);
 assert.equal(game.chooseRest("heal"),false);
 const save=game.exportCheckpoint();
 const restored=journey(["basicAttack","basicDefense",...Array(10).fill("fireLarge")]);
 assert.equal(restored.restoreCheckpoint(save),true);
 assert.equal(restored.snapshot().deck.length,after.deck.length);
 assert.equal(restored.snapshot().restChoice,"refine");
});
test("legacy 12-battle mode cannot access free rest trimming",()=>{
 const game=createB1Game({seed:5,routeTrial:false,weaponTrial:true});
 assert.equal(game.selectStarter("basic"),true);
 assert.equal(game.chooseRest("refine",0),false);
});
