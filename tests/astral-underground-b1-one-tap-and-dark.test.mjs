import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,createB1Game,getB1Card,STARTER} from "../v4-1/underground-b1-engine.mjs";
import {needsB1Target,b1PointerIntent} from "../v4-1/underground-b1-actions.mjs";
const actions=readFileSync(new URL("../v4-1/underground-b1-actions.mjs",import.meta.url),"utf8");
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const dragon=readFileSync(new URL("../v4-1/underground-b1-dragon-visuals.css",import.meta.url),"utf8");
const magic=readFileSync(new URL("../v4-1/underground-b1-fire.css",import.meta.url),"utf8");
const spells=[
 ["darkBolt","闇弾",1,5,8,35,"dark"],
 ["abyssBolt","奈落弾",2,12,16,45,"abyss"],
 ["iceSpear","氷槍",2,10,13,40,"ice"],
 ["arcaneLance","魔力槍",1,8,11,35,"arcane"]
];
test("four B1 trial spells have distinct effects, costs, shop prices and upgrades",()=>{
 for(const [id,name,cost,damage,upgrade,price,art] of spells){
  const c=CARDS[id],plus=getB1Card(id+"~");
  assert.equal(c.name,name);assert.equal(c.kind,"attack");assert.equal(c.cost,cost);
  assert.equal(c.damage,damage);assert.equal(c.magicArt,art);
  assert.equal(plus.damage,upgrade);assert.equal(plus.cost,cost);
  const game=createB1Game({seed:17,testDeck:Array(12).fill(id)});
  assert.equal(game.startBossPractice("test"),true);
  const s=game.snapshot(),i=s.hand.indexOf(id),left=s.enemies.find(e=>e.id==="left");
  assert.ok(i>=0);
  assert.equal(needsB1Target(c.kind),true);
  assert.equal(game.play(i,"left"),true);
  const after=game.snapshot();
  assert.equal(after.enemies.find(e=>e.id==="left").hp,left.hp-damage);
  assert.equal(after.energy,3-cost);
  assert.ok(after.shopStock.some(item=>item.id===id&&item.price===price));
  if(id==="darkBolt"){
   assert.equal(c.draw,1);
   assert.equal(after.hand.length,s.hand.length,"1 played + 1 drawn");
  }
  if(id==="iceSpear")assert.equal(after.enemies.find(e=>e.id==="left").weaken,2);
 }
});
test("new cards are obtainable at the start while legacy starters and deck remain available",()=>{
 for(const [id] of spells){
  const game=createB1Game({seed:5});
  assert.equal(game.selectStarter(id),true);
  const s=game.snapshot();
  assert.equal(s.phase,"battle");
  assert.equal(s.deck.length,STARTER.length+1);
  assert.ok(s.deck.includes(id));
  assert.equal(game.selectStarter(id),false);
 }
 for(const id of ["lightning","scatter","flow","dragonEgg","fireSmall","fireMedium","fireLarge"]){
  const game=createB1Game({seed:5});
  assert.equal(game.selectStarter(id),true,id);
 }
});
test("first click only lifts; second on same card cancels; enemy click casts targeted spells",()=>{
 const start=actions.indexOf("function handleCardClick(index){");
 const end=actions.indexOf("function pointerTarget(",start);
 assert.ok(start>0&&end>start);
 const segment=actions.slice(start,end);
 assert.match(segment,/if\(picked===index\)cancel\(\);else select\(index\)/);
 assert.doesNotMatch(segment,/if\(picked===index\)fire\(/);
 assert.match(segment,/stage\.addEventListener\("click"/);
 assert.match(segment,/if\(!info\|\|needsB1Target\(info\.card\.kind\)/);
 assert.match(segment,/if\(picked!==null\)fire\(picked,id,rect\(picked\)\)/);
 assert.match(actions,/item\.pointerType!=="mouse"/);
 assert.match(actions,/suppressUntil=performance\.now\(\)\+240/);
 assert.equal(b1PointerIntent(40,3,"touch"),"scroll");
 assert.equal(b1PointerIntent(2,-40,"touch"),"drag");
 assert.ok(actions.includes("preview.hidden=false"));
 assert.ok(actions.includes('button.addEventListener("click",()=>handleCardClick(index))'));
});
test("dragon artwork fits by cropping a correctly-proportioned sprite tile",()=>{
 assert.match(dragon,/container-type:size/);
 assert.match(dragon,/aspect-ratio:3\s*\/\s*4/);
 assert.match(dragon,/width:max\(100cqw,75cqh\)/);
 assert.match(dragon,/background-position:inherit/);
 assert.match(dragon,/b1-dragon-evolution-hd\.avif/);
 assert.match(dragon,/\.b1-dragon-portrait::before/);
 assert.match(dragon,/\.b1-dragon-card-sprite::before/);
 assert.match(html,/portrait\.style\.backgroundPosition=dragonVisual\.position/);
});
test("new B1 cards have art slots in hand, starters and shop; old wizard screen stays",()=>{
 for(const term of ["darkBolt","abyssBolt","iceSpear","arcaneLance","b1-magic-card-art","game.selectStarter(id)"])
  assert.ok(html.includes(term),term);
 for(const style of ["b1-magic-art--dark","b1-magic-art--abyss","b1-magic-art--ice","b1-magic-art--arcane"])
  assert.ok(magic.includes(style),style);
 for(const id of ["heroPuppet","enemyPuppet","hand","enemyLineup","endTurn"])
  assert.ok(html.includes('id="'+id+'"'));
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 let p=spawnSync(process.execPath,["--check","--input-type=module"],{input:inline,encoding:"utf8"});
 assert.equal(p.status,0,p.stderr);
 p=spawnSync(process.execPath,["--check",new URL("../v4-1/underground-b1-actions.mjs",import.meta.url).pathname],{encoding:"utf8"});
 assert.equal(p.status,0,p.stderr);
});
