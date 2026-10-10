import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {CARDS,STARTER,createB1Game,getB1Card} from "../v4-1/underground-b1-engine.mjs";

const fire=[
 ["fireSmall","small",1,6,9,25],
 ["fireMedium","medium",2,10,14,40],
 ["fireLarge","large",3,16,22,55]
];
test("three fire spells have correct cost, power, upgraded effect and single enemy targeting",()=>{
 for(const [id,art,cost,damage,boosted,price] of fire){
  const c=CARDS[id],up=getB1Card(id+"~");
  assert.equal(c.kind,"attack");assert.equal(c.fireArt,art);assert.equal(c.cost,cost);
  assert.equal(c.damage,damage);assert.equal(up.cost,cost);assert.equal(up.damage,boosted);
  assert.equal(up.text,"敵1体に"+boosted+"ダメージ");
  const game=createB1Game({seed:17,testDeck:Array(10).fill(id)});
  assert.equal(game.startBossPractice("test"),true);
  const s=game.snapshot(),left=s.enemies.find(x=>x.id==="left"),right=s.enemies.find(x=>x.id==="right");
  const n=s.hand.indexOf(id);assert.ok(n>=0);
  assert.equal(game.play(n,"left"),true);
  const after=game.snapshot();
  assert.equal(after.enemies.find(x=>x.id==="left").hp,left.hp-damage);
  assert.equal(after.enemies.find(x=>x.id==="right").hp,right.hp);
  assert.equal(after.energy,3-cost);
  assert.ok(after.shopStock.some(item=>item.id===id&&item.price===price));
 }
});
test("all three fire spells are accessible directly as starter choices without changing classic starters",()=>{
 for(const [id] of fire){
  const game=createB1Game({seed:7});
  assert.equal(game.selectStarter(id),true);
  assert.equal(game.snapshot().phase,"battle");
  assert.equal(game.snapshot().deck.length,STARTER.length+1);
  assert.ok(game.snapshot().deck.includes(id));
  assert.equal(game.selectStarter(id),false);
 }
 const game=createB1Game();
 assert.equal(game.selectStarter("lightning"),true);
 assert.ok(game.snapshot().deck.includes("lightning"));
});
function winBattle(g){
 let turn=0;
 while(g.snapshot().phase==="battle"&&turn++<130){
  let plays=0;
  while(g.snapshot().phase==="battle"&&plays++<20){
   const s=g.snapshot(),target=s.enemies.find(x=>x.hp>0),i=s.hand.findIndex(id=>id==="lightning"&&s.energy>=2);
   if(i<0||!target)break;
   assert.equal(g.play(i,target.id),true);
  }
  if(g.snapshot().phase==="battle")g.endTurn();
 }
 assert.equal(g.snapshot().phase,"reward");
}
function reachRestAndShop(){
 const game=createB1Game({seed:17,maxHp:999,testDeck:Array(12).fill("lightning")});
 assert.equal(game.selectStarter("fireMedium"),true);
 winBattle(game);assert.equal(game.chooseReward(null),true);
 assert.equal(game.choosePath("pack"),true);assert.equal(game.nextBattle(),true);
 winBattle(game);assert.equal(game.chooseReward(null),true);
 assert.equal(game.snapshot().restAvailable,true);
 return game;
}
test("existing rest upgrades a fire spell before the third fight",()=>{
 const g=reachRestAndShop(),s=g.snapshot();
 const index=s.deck.indexOf("fireMedium");assert.ok(index>=0);
 assert.equal(g.chooseRest("upgrade",index),true);
 assert.ok(g.snapshot().deck.includes("fireMedium~"));
 assert.equal(getB1Card("fireMedium~").damage,14);
 assert.equal(g.chooseRest("upgrade",index),false);
});
test("shop permits one card removal for 30G with safe accounting and entry guards",()=>{
 const g=reachRestAndShop();
 assert.equal(g.purgeShopCard(0),false);
 assert.equal(g.chooseRest("heal"),true);assert.equal(g.nextBattle(),true);
 winBattle(g);assert.equal(g.chooseReward(null),true);
 assert.equal(g.snapshot().shopAvailable,true);
 const s=g.snapshot(),index=s.deck.indexOf("fireMedium");
 assert.equal(s.gold,60);
 assert.equal(g.purgeShopCard(-1),false);
 assert.equal(g.purgeShopCard(1000),false);
 assert.equal(g.purgeShopCard(index),true);
 const after=g.snapshot();
 assert.equal(after.gold,30);
 assert.equal(after.deck.length,s.deck.length-1);
 assert.equal(after.deck.includes("fireMedium"),false);
 assert.equal(after.shopPurged,true);
 assert.equal(g.purgeShopCard(0),false);
 assert.equal(g.buyShop("fireMedium"),false,"can't afford after purging");
 assert.equal(g.buyShop("fireSmall"),true,"remaining gold may still buy a new fire card");
 assert.equal(g.snapshot().gold,5);
 assert.equal(g.leaveShop(),true);
 assert.equal(g.purgeShopCard(0),false);
 assert.equal(g.buyShop("fireSmall"),false);
});
test("separately supplied artworks are packed in the specified small-large-medium order",()=>{
 const atlas=readFileSync(new URL("../v4-1/assets/b1-fire-spells-atlas.webp",import.meta.url));
 assert.ok(atlas.length>3000);
 assert.equal(atlas.subarray(0,4).toString("ascii"),"RIFF");
 assert.equal(atlas.subarray(8,12).toString("ascii"),"WEBP");
 assert.equal(createHash("sha256").update(atlas).digest("hex"),"1e61b3ce48421fa9f048ffea7173755c5769fb3f2bfeae39537427e34fce53b3");
 const css=readFileSync(new URL("../v4-1/underground-b1-fire.css",import.meta.url),"utf8");
 assert.match(css,/b1-fire-spells-atlas\.webp/);
 assert.match(css,/b1-fire-art--small\{background-position:0% center\}/);
 assert.match(css,/b1-fire-art--large\{background-position:50% center\}/);
 assert.match(css,/b1-fire-art--medium\{background-position:100% center\}/);
 assert.match(css,/b1-fire-trail/);
 assert.match(css,/prefers-reduced-motion/);
});
test("the playable wizard UI includes starter fire art, one-time removal and existing play controls",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 for(const id of ["fireStarterDialog","fireStarterChoices","fireStarterOpen","fireStarterClose","shopPurgeOpen","shopPurgeCards","heroPuppet","enemyPuppet","hand","restUpgradeCards"])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes("b1-fire-art--"));
 assert.ok(html.includes('href="./underground-b1-fire.css"'));
 assert.ok(html.includes('game.purgeShopCard(index)'));
 assert.ok(html.includes('game.selectStarter(id)'));
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const check=spawnSync(process.execPath,["--check","--input-type=module"],{input:inline,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
 const fx=readFileSync(new URL("../v4-1/underground-b1-feedback.mjs",import.meta.url),"utf8");
 assert.ok(fx.includes("card?.firePower"));
 assert.ok(fx.includes("b1-fire-impact"));
});
