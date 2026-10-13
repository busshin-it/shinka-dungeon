import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,STAGES,STARTER,createB1Game,getB1Card} from "../v4-1/underground-b1-engine.mjs";

const cards=[
 ["shadowEcho","影の反響",1,4,7,35,"shadow"],
 ["blizzard","吹雪",2,5,7,45,"blizzard"],
 ["thunderSurge","雷の奔流",2,4,6,50,"surge"],
 ["guideThrust","導魔突き",1,5,8,35,"guide"],
 ["spellblade","魔装斬",1,7,10,35,"spellblade"]
];
function practice(ids){
 const deck=ids.flatMap(id=>Array(4).fill(id)).slice(0,30);
 for(let seed=1;seed<=100;seed++){
  const g=createB1Game({seed,testDeck:deck});
  assert.equal(g.startBossPractice("test"),true);
  const hand=g.snapshot().hand;
  if(ids.every(id=>hand.includes(id)))return g;
 }
 throw Error("No deterministic 5-card hand with "+ids.join(", "));
}
function play(g,id,target="left"){
 const index=g.snapshot().hand.indexOf(id);
 assert.ok(index>=0,id+" in hand");
 assert.equal(g.play(index,target),true);
 return g.snapshot();
}
function hp(g,id="left"){return g.snapshot().enemies.find(x=>x.id===id).hp}
test("all five new cards have playable stats, upgrade previews, and shop availability",()=>{
 for(const [id,name,cost,damage,upgrade,price,art] of cards){
  const c=CARDS[id],up=getB1Card(id+"~");
  assert.equal(c.name,name);assert.equal(c.cost,cost);assert.equal(c.damage,damage);
  assert.equal(c.magicArt,art);assert.equal(up.damage,upgrade);assert.equal(up.cost,cost);
  assert.ok(up.text.includes(String(upgrade)+"ダメージ"),id+" upgraded text");
  const g=createB1Game({seed:2});
  assert.equal(g.selectStarter(id),true);
  assert.equal(g.snapshot().deck.length,STARTER.length+1);
  assert.ok(g.snapshot().deck.includes(id));
  const shop=g.snapshot().shopCatalog.find(x=>x.id===id);
  assert.deepEqual(shop,{id,price});
 }
 assert.equal(Object.keys(CARDS).length,77);
});
test("shadow echo draws two only after a prior dark spell, not merely by being dark itself",()=>{
 const noDark=practice(["shadowEcho","bolt"]);
 const pre=noDark.snapshot().hand.length;
 play(noDark,"shadowEcho");assert.equal(noDark.snapshot().hand.length,pre-1);
 assert.equal(noDark.snapshot().darkCastsThisTurn,1);
 const g=practice(["darkBolt","shadowEcho"]);
 play(g,"darkBolt");
 const before=g.snapshot().hand.length, enemyHp=hp(g);
 const after=play(g,"shadowEcho");
 assert.equal(after.hand.length,before+1,"echo used one card and drew two");
 assert.equal(hp(g),enemyHp-4);
 assert.equal(after.darkCastsThisTurn,2);
 assert.equal(after.lastSynergy?.title,"闇魔法連携");
});
test("blizzard damages all surviving enemies and gives each one weakness",()=>{
 const g=practice(["blizzard"]);
 const before=g.snapshot().enemies.map(e=>({id:e.id,hp:e.hp}));
 const after=play(g,"blizzard");
 for(const e of before){
  const a=after.enemies.find(x=>x.id===e.id);
  assert.equal(a.hp,e.hp-(e.id==="boss"?Math.max(0,5-4):5));
  assert.equal(a.weaken,1);
 }
 assert.equal(after.attackCardsThisTurn,1);
});
test("thunder surge scales with prior ATTACK CARDS, not the number of multihit strikes",()=>{
 const g=practice(["double","thunderSurge"]);
 play(g,"double");const before=hp(g);
 const after=play(g,"thunderSurge");
 assert.equal(before-hp(g),9,"base4 + one attack card * 3 + consecutive lightning * 2");
 assert.equal(after.attackCardsThisTurn,2);
 assert.equal(after.lastSynergy?.title,"雷連鎖");
 const plain=practice(["thunderSurge"]);
 const pre=hp(plain);
 play(plain,"thunderSurge");
 assert.equal(pre-hp(plain),4,"no previous attacks, no bonus");
});
test("guide thrust empowers the NEXT MAGIC attack but not a second weapon card",()=>{
 const g=practice(["guideThrust","bolt"]);
 play(g,"guideThrust");const h=hp(g);
 const s=play(g,"bolt");
 assert.equal(h-hp(g),10,"6 normal + 4 guided magic");
 assert.equal(s.pendingMagicAttackBonus,0);
 const j=practice(["guideThrust","spellblade","bolt"]);
 play(j,"guideThrust");const t=hp(j);
 play(j,"spellblade");
 assert.equal(t-hp(j),7,"weapon does not use magic charge");
 assert.equal(j.snapshot().pendingMagicAttackBonus,4);
});
test("spellblade gives +4 defense if any earlier spell was cast; weapon alone does not count",()=>{
 const g=practice(["spellblade"]);
 play(g,"spellblade");
 assert.equal(g.snapshot().block,0,"first card is not a combo");
 const k=practice(["bolt","spellblade"]);
 play(k,"bolt");const pre=k.snapshot().block;
 const after=play(k,"spellblade");
 assert.equal(after.block-pre,4);
 assert.equal(after.lastSynergy?.title,"魔装斬連携");
 const j=practice(["guideThrust","spellblade"]);
 play(j,"guideThrust");play(j,"spellblade");
 assert.equal(j.snapshot().block,0,"weapon alone does not enable spellblade guard");
});
test("new combo counters reset per battle turn, do not silently persist",()=>{
 const g=practice(["darkBolt","guideThrust"]);
 play(g,"darkBolt");play(g,"guideThrust");
 assert.equal(g.snapshot().darkCastsThisTurn,1);
 assert.equal(g.snapshot().pendingMagicAttackBonus,4);
 assert.equal(g.endTurn(),true);
 const s=g.snapshot();assert.equal(s.darkCastsThisTurn,0);
 assert.equal(s.spellsThisTurn,0);assert.equal(s.pendingMagicAttackBonus,0);
 assert.equal(s.attackCardsThisTurn,0);
});
test("new cards are reachable in staged rewards and starter selection",()=>{
 assert.ok(STAGES[0].rewards.includes("shadowEcho"));
 assert.ok(STAGES[0].rewards.includes("guideThrust"));
 assert.ok(STAGES[1].rewards.includes("blizzard"));
 assert.ok(STAGES[2].rewards.includes("spellblade"));
 assert.ok(STAGES[3].rewards.includes("thunderSurge"));
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-fire.css",import.meta.url),"utf8");
 for(const [id,,,,, ,art] of cards){
  assert.ok(html.includes('"'+id+'"'),id+" starter option");
  assert.ok(css.includes("b1-magic-art--"+art),id+" temporary art");
 }
 for(const id of ["heroPuppet","enemyPuppet","hand","endTurn"])
  assert.ok(html.includes('id="'+id+'"'));
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 const check=spawnSync(process.execPath,["--check","--input-type=module"],{input:inline,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
});
