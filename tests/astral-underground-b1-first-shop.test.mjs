import test from "node:test";
import assert from "node:assert/strict";
import {createB1Game} from "../v4-1/underground-b1-engine.mjs";
function clear(g){let n=0;while(g.snapshot().phase==="battle"&&n++<80){let x=0;while(g.snapshot().phase==="battle"&&x++<20){const s=g.snapshot(),t=s.enemies.find(e=>e.hp>0),i=s.hand.findIndex(k=>k==="lightning"&&s.energy>=2);if(i<0||!t)break;assert.equal(g.play(i,t.id),true);}if(g.snapshot().phase==="battle")g.endTurn();}assert.equal(g.snapshot().phase,"reward");}
function reachShop(){const g=createB1Game({seed:17,maxHp:999,testDeck:Array(12).fill("lightning")});g.selectStarter("scatter");clear(g);g.chooseReward(null);g.choosePath("pack");g.nextBattle();clear(g);g.chooseReward(null);g.chooseRest("heal");g.nextBattle();clear(g);g.chooseReward(null);assert.equal(g.snapshot().shopAvailable,true);return g;}
test("gold earned on victory and first shop has three stable, distinct offers",()=>{
 const g=reachShop(),s=g.snapshot();
 assert.equal(s.gold,60);
 assert.equal(s.shopStock.length,3);
 assert.equal(new Set(s.shopStock.map(x=>x.id)).size,3);
 assert.deepEqual(g.snapshot().shopStock,s.shopStock,"shop does not reroll on render/snapshot");
});

test("only offered cards can be purchased; price, deck, rebuy and leave rules remain",()=>{
 const g=reachShop(),start=g.snapshot(),old=start.deck.length;
 const available=start.shopStock.find(item=>item.price<=start.gold);
 assert.ok(available);
 const notOffered=["ward","chain","frostBreak","echoGuard","lingeringPoison","fireSmall","fireMedium","fireLarge","fireWaveSmall","fireWaveMedium","fireWaveLarge","thunderSmall","thunderMedium","thunderLarge","darkBolt","abyssBolt","iceSpear","arcaneLance","mentalCollapse","curse","deathSong","hallucination","shadowEcho","blizzard","thunderSurge","guideThrust","spellblade","bludgeon","rapidPunch","heavyBlow","sneakHit","ironHammer","doping","adversity","rage"].find(id=>!start.shopStock.some(item=>item.id===id));
 assert.ok(notOffered);assert.equal(g.buyShop(notOffered),false);
 assert.equal(g.buyShop(available.id),true);
 assert.equal(g.snapshot().gold,start.gold-available.price);
 assert.equal(g.snapshot().deck.length,old+1);
 assert.equal(g.buyShop(available.id),false);
 assert.equal(g.buyShop("fake"),false);
 assert.deepEqual(g.snapshot().shopStock,start.shopStock);
 assert.equal(g.leaveShop(),true);assert.equal(g.buyShop(notOffered),false);
 assert.equal(g.nextBattle(),true);assert.equal(g.snapshot().stage,3);
});
test("shop can be left without purchase and practice cannot shop",()=>{const g=reachShop();assert.equal(g.leaveShop(),true);assert.equal(g.snapshot().gold,60);const p=createB1Game();p.startBossPractice("combo");assert.equal(p.buyShop("ward"),false);});
