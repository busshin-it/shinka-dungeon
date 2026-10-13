import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,STAGES,createB1Game,getB1Card} from "../v4-1/underground-b1-engine.mjs";
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-depth-and-catalog.css",import.meta.url),"utf8");

test("12 battles retain fork and original five encounter types, with final protected trio",()=>{
 assert.equal(STAGES.length,12);
 assert.equal(STAGES[0].enemies[0].id,"rat");
 assert.equal(STAGES[1].enemies.length,2);
 assert.equal(STAGES[2].enemies[0].id,"priest");
 assert.equal(STAGES[3].enemies[0].id,"brute");
 assert.deepEqual(STAGES.at(-1).enemies.map(e=>e.id),["left","boss","right"]);
 for(const [index,stage]of STAGES.entries()){
  assert.ok(stage.enemies.length>=1&&stage.enemies.length<=3,index+" enemy count");
  for(const enemy of stage.enemies)assert.ok(enemy.maxHp>0&&enemy.role,index+" enemy role");
  if(index<11)assert.ok(stage.rewards.length>=9,index+" broad reward pool");
  for(const id of stage.rewards)assert.ok(CARDS[id],index+": "+id);
 }
});
test("a high-HP B1 trial can obtain a card after each of eleven battles and eventually win the 12th",()=>{
 const g=createB1Game({seed:101,maxHp:999,testDeck:Array(12).fill("thunderLarge")});
 assert.equal(g.selectStarter("scatter"),true);
 let victories=0,rewards=0,rests=0,shops=0;
 for(let level=0;level<12;level++){
  let turns=0;
  while(g.snapshot().phase==="battle"&&turns++<100){
   let strikes=0;
   while(g.snapshot().phase==="battle"&&strikes++<20){
    const s=g.snapshot(),target=s.enemies.find(e=>e.hp>0);
    const index=s.hand.findIndex(id=>{const card=getB1Card(id);return card.kind==="attack"&&s.energy>=card.cost&&!(card.requiresPureDeck&&s.deck.some(k=>getB1Card(k).weapon!==true));});
    if(index<0||!target)break;
    assert.equal(g.play(index,target.id),true);
   }
   if(g.snapshot().phase==="battle")assert.equal(g.endTurn(),true);
  }
  assert.ok(turns<100,"cannot finish encounter "+level);
  if(level===11){assert.equal(g.snapshot().phase,"won");break;}
  assert.equal(g.snapshot().phase,"reward",level+" reward");victories++;
  const s=g.snapshot();
  assert.equal(s.rewards.length,3);
  assert.equal(g.chooseReward(s.rewards[0]),true);rewards++;
  const between=g.snapshot();
  if(between.restAvailable){rests++;const index=between.deck.findIndex(id=>!id.endsWith("~"));assert.ok(index>=0);assert.equal(g.chooseRest("upgrade",index),true);}
  if(between.shopAvailable){shops++;assert.equal(g.leaveShop(),true);}
  assert.equal(g.nextBattle(),true);
  assert.equal(g.snapshot().stage,level+1);
 }
 assert.equal(victories,11);
 assert.equal(rewards,11);
 assert.equal(rests,3);
 assert.equal(shops,2);
 assert.equal(g.snapshot().phase,"won");
});
test("the camp upgrades are image cards with detailed after-effects; catalog can filter missing originals",()=>{
 for(const k of ['id="b1CardCatalogOpen"','id="b1CardCatalogDialog"','id="b1CardCatalogItems"','id="b1CatalogMissing"','id="b1UpgradeListHint"','renderB1CardCatalog','b1ArtInventory','cardButton(id)','card.classList.add("b1-rest-upgrade-card"','game.chooseRest("upgrade",index)','future.text'])assert.ok(html.includes(k),k);
 assert.ok(html.includes('href="./underground-b1-depth-and-catalog.css"'));
 for(const k of [".b1-upgrade-image-choice",".b1-catalog-grid",".b1-catalog-missing",".b1-enemy-lineup:not(.b1-two)",".b1-enemy-actor.b1-boss"])assert.ok(css.includes(k),k);
 assert.ok(css.includes("width:96%")&&css.includes("max-width:185px"));
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const result=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});
 assert.equal(result.status,0,result.stderr);
});
test("inventory document includes all 55 cards and marks real original image gaps",()=>{
 const md=readFileSync(new URL("../design/b1-card-art-inventory-20261012.md",import.meta.url),"utf8");
 const rows=md.split("\n").filter(x=>/^\| `[a-zA-Z]/.test(x));
 assert.equal(rows.length,Object.keys(CARDS).length);
 for(const [id,card] of Object.entries(CARDS)){
  assert.ok(rows.some(x=>x.includes("`"+id+"`")&&x.includes(card.text)),id);
 }
 assert.ok(md.includes("原画なし"));
});
