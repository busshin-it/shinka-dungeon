import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {B1_WEAPONS,getB1WeaponOffers,createB1Game,STAGES,CARDS} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");

function practice(deck,weapon=null){
 const opts={seed:79,weaponTrial:true,testDeck:deck};
 if(weapon)opts.testWeaponId=weapon;
 const g=createB1Game(opts);
 assert.equal(g.startBossPractice("test"),true);
 assert.equal(g.snapshot().weaponId,weapon);
 return g;
}
function use(g,id,target="boss"){
 const i=g.snapshot().hand.indexOf(id);
 assert.ok(i>=0,id+" in hand");
 assert.equal(g.play(i,target),true,id);
}
function reachFourthReward(weaponTrial){
 const g=createB1Game({seed:21,maxHp:999,testDeck:Array(12).fill("thunderLarge"),weaponTrial,tacticalEncounters:true});
 assert.equal(g.selectStarter("scatter"),true);
 for(let stage=0;stage<=3;stage++){
  let turns=0;
  while(g.snapshot().phase==="battle"&&turns++<90){
   const s=g.snapshot(),idx=s.hand.indexOf("thunderLarge"),target=s.enemies.find(e=>e.hp>0);
   if(idx>=0&&s.energy>=3&&target)assert.equal(g.play(idx,target.id),true);
   else assert.equal(g.endTurn(),true);
  }
  assert.ok(turns<90,"finish stage "+stage);
  assert.equal(g.snapshot().phase,"reward");
  assert.equal(g.chooseReward(null),true);
  if(stage<3){
   const between=g.snapshot();
   if(between.restAvailable)assert.equal(g.chooseRest("heal"),true);
   if(between.shopAvailable)assert.equal(g.leaveShop(),true);
   assert.equal(g.nextBattle(),true);
  }
 }
 assert.equal(g.snapshot().stage,3);
 return g;
}

test("four passive weapons are NOT cards; offers are deterministic without using gameplay RNG",()=>{
 assert.equal(Object.keys(B1_WEAPONS).length,4);
 assert.equal(Object.keys(CARDS).length,85);
 assert.equal(STAGES.length,12);
 for(const seed of [1,2,3,21,23,64]){
  const offers=getB1WeaponOffers(seed);
  assert.equal(offers.length,3);
  assert.equal(new Set(offers).size,3);
  assert.ok(offers.every(id=>Object.hasOwn(B1_WEAPONS,id)));
  assert.deepEqual(offers,getB1WeaponOffers(seed));
 }
});
test("weapon altar appears once after fourth fight and cannot be bypassed",()=>{
 const g=reachFourthReward(true),s=g.snapshot();
 assert.equal(s.weaponPending,true);
 assert.deepEqual(s.weaponOffered,getB1WeaponOffers(21));
 assert.equal(g.nextBattle(),false,"must choose or explicitly skip");
 assert.equal(g.chooseWeapon("invalid"),false);
 assert.equal(g.chooseWeapon(s.weaponOffered[0]),true);
 assert.equal(g.snapshot().weaponPending,false);
 assert.equal(g.snapshot().weaponId,s.weaponOffered[0]);
 assert.equal(g.chooseWeapon(s.weaponOffered[1]),false,"one permanent weapon only");
 assert.equal(g.nextBattle(),true);
 assert.equal(g.snapshot().weaponId,s.weaponOffered[0],"weapon survives rooms");
});
test("weapon altar can be skipped; old journeys never see it",()=>{
 const g=reachFourthReward(true);
 assert.equal(g.chooseWeapon(null),true);
 assert.equal(g.nextBattle(),true);
 assert.equal(g.snapshot().weaponId,null);
 const legacy=reachFourthReward(false);
 assert.equal(legacy.snapshot().weaponPending,false);
 assert.equal(legacy.chooseWeapon(null),false);
 assert.equal(legacy.nextBattle(),true);
});
test("thunder staff adds exactly 3 only to the third consecutive lightning attack",()=>{
 const deck=["thunderSmall","thunderSmall","thunderSmall","guard","guard"];
 const a=practice(deck,"thunderStaff"),b=practice(deck);
 for(let k=0;k<3;k++){
  use(a,"thunderSmall");use(b,"thunderSmall");
  const hurtA=135-a.snapshot().enemies.find(e=>e.id==="boss").hp;
  const hurtB=135-b.snapshot().enemies.find(e=>e.id==="boss").hp;
  assert.equal(hurtA-hurtB,k===2?3:0);
 }
});
test("club increases the first physical hit and never double-applies to a combo",()=>{
 const deck=["basicAttack","basicAttack","basicDefense","basicDefense","basicDefense"];
 const a=practice(deck,"oldClub"),b=practice(deck);
 use(a,"basicAttack");use(b,"basicAttack");
 assert.equal(b.snapshot().enemies.find(e=>e.id==="boss").hp-a.snapshot().enemies.find(e=>e.id==="boss").hp,3);
 use(a,"basicAttack");use(b,"basicAttack");
 assert.equal(b.snapshot().enemies.find(e=>e.id==="boss").hp-a.snapshot().enemies.find(e=>e.id==="boss").hp,3);
});
test("moon mirror reflects only once in a turn where the player actually blocks",()=>{
 const deck=Array(5).fill("guard");
 const a=practice(deck,"mirrorStaff"),b=practice(deck);
 for(let t=0;t<5;t++){
  use(a,"guard");use(b,"guard");
  assert.equal(a.endTurn(),true);
  assert.equal(b.endTurn(),true);
  const hits=a.snapshot().log.filter(x=>x.includes("月鏡の杖："));
  if(hits.length){
   assert.equal(hits.length,1);
   const leftA=a.snapshot().enemies.find(e=>e.id==="left"),leftB=b.snapshot().enemies.find(e=>e.id==="left");
   assert.ok(leftA.hp<=leftB.hp);
   return;
  }
 }
 assert.fail("expected a blocked attack from a boss guard");
});
test("dragon-bone staff adds 3 block per actual growth, not for initial egg",()=>{
 const deck=["dragonEgg","dragonEgg","guard","guard","guard"];
 const a=practice(deck,"dragonStaff"),b=practice(deck);
 use(a,"dragonEgg");use(b,"dragonEgg");
 assert.equal(a.snapshot().block,b.snapshot().block);
 use(a,"dragonEgg");use(b,"dragonEgg");
 assert.equal(a.snapshot().dragonStage,1);
 assert.equal(a.snapshot().block-b.snapshot().block,3);
});
test("browser exposes accessible 3-choice weapon altar and passive status",()=>{
 assert.match(html,/B1_WEAPONS,createB1Game/);
 assert.match(html,/id="weaponSite"/);
 assert.match(html,/id="weaponChoices"[^>]*aria-label="武器を選ぶ"/);
 assert.match(html,/id="skipWeapon"/);
 assert.match(html,/s\.weaponPending/);
 assert.match(html,/game\.chooseWeapon\(id\)/);
 assert.match(html,/game\.chooseWeapon\(null\)/);
 assert.match(html,/s\.weapon\.name/);
 assert.match(css,/#weaponChoices\.b1-weapon-choices\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(html,/weaponTrial:true/);
});
