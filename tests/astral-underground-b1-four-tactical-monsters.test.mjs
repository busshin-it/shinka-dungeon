import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {B1_TACTICAL_ENCOUNTERS,STAGES,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");

function reach(stage,enabled=true){
 const g=createB1Game({seed:20261014,maxHp:999,testDeck:Array(12).fill("thunderLarge"),tacticalEncounters:enabled});
 assert.equal(g.selectStarter("scatter"),true);
 for(let i=0;i<stage;i++){
  let turns=0;
  while(g.snapshot().phase==="battle"&&turns++<130){
   const state=g.snapshot(),target=state.enemies.find(e=>e.hp>0);
   const index=state.hand.indexOf("thunderLarge");
   if(index>=0&&state.energy>=3&&target)assert.equal(g.play(index,target.id),true);
   else assert.equal(g.endTurn(),true);
  }
  assert.ok(turns<130,"battle ended in bounded time: "+i);
  assert.equal(g.snapshot().phase,"reward","reward after battle "+i);
  assert.equal(g.chooseReward(null),true);
  const s=g.snapshot();
  if(s.restAvailable)assert.equal(g.chooseRest("heal"),true);
  if(s.shopAvailable)assert.equal(g.leaveShop(),true);
  assert.equal(g.nextBattle(),true);
 }
 assert.equal(g.snapshot().stage,stage);
 assert.equal(g.snapshot().phase,"battle");
 return g;
}

test("four tactical encounters are real monsters in four existing slots, without expanding twelve fights",()=>{
 assert.equal(STAGES.length,12);
 assert.deepEqual(Object.keys(B1_TACTICAL_ENCOUNTERS),["3","5","7","9"]);
 const roles=["ramp","needle","bulwark","ancient"];
 for(const [index,room] of Object.entries(B1_TACTICAL_ENCOUNTERS)){
  assert.equal(typeof room.name,"string");
  assert.ok(room.hint.length>18,index);
  assert.ok(room.enemies.length<=3);
  for(const enemy of room.enemies){
   assert.ok(roles.includes(enemy.role));
   assert.ok(enemy.maxHp>0);
  }
 }
 assert.match(html,/createB1Game\(\{seed:Date\.now\(\),tacticalEncounters:true\}\)/);
 for(const role of roles){
  assert.match(html,new RegExp(role+':"(?:bell-spirit|wraith)\\.webp"'));
  assert.ok(css.includes(".b1-role-"+role+" .b1-actor-figure img"),role);
 }
 assert.equal(STAGES[3].enemies[0].id,"brute","original fixed encounters remain available");
 assert.equal(STAGES[5].enemies[0].role,"berserker");
 assert.deepEqual(STAGES.at(-1).enemies.map(e=>e.id),["left","boss","right"]);
});
test("rapidly escalating enemy previews both strength and next attack honestly",()=>{
 const g=reach(3);
 const first=g.snapshot();
 assert.equal(first.stageName,B1_TACTICAL_ENCOUNTERS[3].name);
 assert.equal(first.enemies[0].role,"ramp");
 assert.equal(first.intents[0].kind,"buff");
 assert.equal(g.endTurn(),true);
 let s=g.snapshot();
 assert.equal(s.enemies[0].strength,3);
 assert.equal(s.intents[0].damage,11);
 const hpBefore=s.hp;
 assert.equal(g.endTurn(),true);
 s=g.snapshot();
 assert.equal(hpBefore-s.hp,11);
 assert.equal(s.enemies[0].strength,5);
 assert.equal(s.intents[0].hits,2);
});
test("three needle monsters perform three separately blocked/reflected attack actions",()=>{
 const g=reach(5);
 const s=g.snapshot();
 assert.deepEqual(s.enemies.map(e=>e.role),["needle","needle","needle"]);
 assert.equal(s.intents.filter(x=>x.kind==="attack").length,3);
 const hp=s.hp;
 assert.equal(g.endTurn(),true);
 assert.equal(hp-g.snapshot().hp,12,"3 monsters × 4 damage on first turn");
 assert.ok(g.snapshot().intents.every(x=>x.damage===5));
});
test("bulwark telegraphs high armor, but does not become invulnerable",()=>{
 const g=reach(7);
 assert.equal(g.snapshot().enemies[0].role,"bulwark");
 assert.equal(g.snapshot().intents[0].blockGain,16);
 assert.equal(g.endTurn(),true);
 assert.equal(g.snapshot().enemies[0].block,16);
 assert.equal(g.snapshot().intents[0].kind,"attack");
 const before=g.snapshot().enemies[0].hp;
 const index=g.snapshot().hand.indexOf("thunderLarge");
 assert.ok(index>=0);
 assert.equal(g.play(index,"bulwarkBeast"),true);
 assert.ok(g.snapshot().enemies[0].hp<=before,"block absorbs damage without extra HP");
});
test("regenerator heals up to max HP and grows stronger only after its visible healing action",()=>{
 const g=reach(9);
 assert.equal(g.snapshot().enemies[0].role,"ancient");
 assert.equal(g.snapshot().intents[0].blockGain,10);
 assert.equal(g.endTurn(),true);
 const index=g.snapshot().hand.indexOf("thunderLarge");
 assert.ok(index>=0);
 assert.equal(g.play(index,"ancientCrystal"),true);
 assert.ok(g.snapshot().enemies[0].hp<g.snapshot().enemies[0].maxHp);
 assert.equal(g.endTurn(),true);
 const before=g.snapshot().enemies[0];
 assert.equal(g.snapshot().intents[0].kind,"healSelf");
 assert.equal(g.endTurn(),true);
 const after=g.snapshot().enemies[0];
 assert.equal(after.hp,Math.min(before.maxHp,before.hp+8));
 assert.equal(after.strength,before.strength+2);
});
test("legacy encounters remain unchanged when tactical mode was not requested",()=>{
 const g=reach(5,false);
 assert.equal(g.snapshot().enemies[0].role,"berserker");
 assert.equal(g.snapshot().stageName,STAGES[5].name);
 const h=reach(9,false);
 assert.equal(h.snapshot().enemies.find(e=>e.id==="warder3").role,"warder");
});
