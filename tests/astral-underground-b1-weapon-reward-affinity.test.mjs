import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,B1_WEAPONS,getB1Card} from "../v4-1/underground-b1-engine.mjs";
import {getB1RewardWeaponAffinity} from "../v4-1/underground-b1-reward-weapon-affinity.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-weapon-affinity.css",import.meta.url),"utf8");

test("only weapon-compatible reward cards receive a hint",()=>{
 assert.deepEqual(Object.keys(B1_WEAPONS),["thunderStaff","oldClub","mirrorStaff","dragonStaff"]);
 for(const [weapon,yes,no] of [
  ["thunderStaff","lightning","basicAttack"],
  ["oldClub","bludgeon","lightning"],
  ["mirrorStaff","shieldMirror","lightning"],
  ["dragonStaff","dragonEgg","dragonBreath"]
 ]){
  const a=getB1RewardWeaponAffinity(weapon,getB1Card(yes));
  assert.ok(a?.label&&a?.detail,weapon+" needs "+yes);
  assert.equal(getB1RewardWeaponAffinity(weapon,getB1Card(no)),null,weapon+" should not recommend "+no);
  assert.ok(getB1RewardWeaponAffinity(weapon,getB1Card(yes+"~")),"upgrade can have the same meaningful synergy");
 }
 assert.equal(getB1RewardWeaponAffinity(null,getB1Card("lightning")),null);
 assert.equal(getB1RewardWeaponAffinity("unknown",getB1Card("lightning")),null);
 assert.equal(getB1RewardWeaponAffinity("thunderStaff",null),null);
});
test("actual mechanism-based hints include the special compatible cards",()=>{
 assert.ok(getB1RewardWeaponAffinity("thunderStaff",getB1Card("sparkWard")),"lightning guard continues thunder chain");
 assert.ok(getB1RewardWeaponAffinity("thunderStaff",getB1Card("sparkBreath")),"lightning draw continues thunder chain");
 assert.ok(getB1RewardWeaponAffinity("oldClub",getB1Card("rapidPunch")),"physical multi is eligible");
 assert.ok(getB1RewardWeaponAffinity("mirrorStaff",getB1Card("basicDefense")),"basic defense blocks");
 assert.ok(getB1RewardWeaponAffinity("dragonStaff",getB1Card("dragonFeed")),"feeding grows dragon");
 assert.ok(getB1RewardWeaponAffinity("dragonStaff",getB1Card("shieldIncubate")),"shield can grow dragon");
 assert.equal(getB1RewardWeaponAffinity("dragonStaff",getB1Card("dragonWing")),null,"block scaling alone does not trigger the staff");
});
test("no card is changed and affinity detection is deterministic",()=>{
 const old=JSON.stringify(CARDS);
 for(const id of Object.keys(CARDS)){
  for(const weapon of Object.keys(B1_WEAPONS)){
   const card=getB1Card(id);
   const before=JSON.stringify(card);
   const a=getB1RewardWeaponAffinity(weapon,card);
   const b=getB1RewardWeaponAffinity(weapon,card);
   assert.deepEqual(a,b);
   assert.equal(JSON.stringify(card),before);
  }
 }
 assert.equal(JSON.stringify(CARDS),old);
});
test("new hint is limited to 15-floor reward visuals and accessible without affecting rewards",()=>{
 assert.match(html,/import \{getB1RewardWeaponAffinity\} from "\.\/underground-b1-reward-weapon-affinity\.mjs"/);
 assert.match(html,/const affinity=getB1RewardWeaponAffinity\(s\.weaponId,getB1Card\(id\)\)/);
 assert.ok(html.includes('btn.setAttribute("aria-label",btn.getAttribute("aria-label")+"。装備との相性："+affinity.detail)'));
 assert.match(html,/game\.chooseReward\(id\)/);
 assert.match(html,/underground-b1-reward-weapon-affinity\.css/);
 assert.match(css,/#journeyPanel\.b1-reward-open #rewardCards \.b1-reward-choice \.b1-weapon-affinity-tag/);
 assert.match(css,/@media \(orientation:landscape\) and \(max-width:1100px\) and \(max-height:620px\)/);
 assert.match(css,/pointer-events:none/);
 assert.doesNotMatch(css,/touch-action:none/);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 const check=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
});
