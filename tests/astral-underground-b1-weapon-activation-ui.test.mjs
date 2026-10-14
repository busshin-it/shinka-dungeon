import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createB1Game} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-weapon-feedback.css",import.meta.url),"utf8");
const practice=(deck,weapon)=>{const game=createB1Game({seed:79,testDeck:deck,weaponTrial:true,...(weapon?{testWeaponId:weapon}:{})});assert.equal(game.startBossPractice("test"),true);return game;};
function play(g,id,target="boss"){
 const index=g.snapshot().hand.indexOf(id);
 assert.notEqual(index,-1,"expected card "+id);
 assert.equal(g.play(index,target),true);
}
test("weapon events are separate from actual damage and require genuine activations",()=>{
 const deck=["thunderSmall","thunderSmall","thunderSmall","guard","guard"];
 const g=practice(deck,"thunderStaff");
 const plain=practice(deck,null);
 assert.equal(g.snapshot().weaponActivation,null);
 assert.equal(g.snapshot().weaponStatus.detail,"雷0/3 · 3枚目の攻撃で発動");
 play(g,"thunderSmall");play(plain,"thunderSmall");
 assert.equal(g.snapshot().weaponActivation,null);
 assert.equal(g.snapshot().weaponStatus.detail,"雷1/3 · 3枚目の攻撃で発動");
 play(g,"thunderSmall");play(plain,"thunderSmall");
 assert.equal(g.snapshot().weaponActivation,null);
 play(g,"thunderSmall");play(plain,"thunderSmall");
 const ev=g.snapshot().weaponActivation;
 assert.equal(ev.id,"thunderStaff");
 assert.equal(ev.seq,1);
 assert.match(ev.detail,/＋3/);
 assert.equal(plain.snapshot().weaponActivation,null);
 assert.equal(plain.snapshot().enemies.find(e=>e.id==="boss").hp-g.snapshot().enemies.find(e=>e.id==="boss").hp,3);
 assert.equal(g.snapshot().weaponStatus.ready,false);
});
test("club fires only once per turn, and weapon status updates",()=>{
 const g=practice(["basicAttack","basicAttack","basicDefense","basicDefense","basicDefense"],"oldClub");
 assert.equal(g.snapshot().weaponStatus.ready,true);
 play(g,"basicAttack");
 const ev=g.snapshot().weaponActivation;
 assert.equal(ev.id,"oldClub");
 assert.equal(ev.seq,1);
 assert.equal(g.snapshot().weaponStatus.ready,false);
 assert.match(g.snapshot().weaponStatus.detail,/使用済み/);
 play(g,"basicAttack");
 assert.equal(g.snapshot().weaponActivation.seq,1,"no false second activation");
});
test("mirror feedback comes from actual enemy damage reflection, not pressing guard",()=>{
 const g=practice(["guard","guard","guard","guard","guard"],"mirrorStaff");
 assert.equal(g.snapshot().weaponActivation,null);
 play(g,"guard");
 assert.equal(g.snapshot().weaponActivation,null);
 let reflected=false;
 for(let i=0;i<5;i++){
  assert.equal(g.endTurn(),true);
  const ev=g.snapshot().weaponActivation;
  if(ev?.id==="mirrorStaff"){assert.match(ev.detail,/反射[12]/);reflected=true;break;}
  if(g.snapshot().phase!=="battle")break;
  const idx=g.snapshot().hand.indexOf("guard");
  if(idx>=0)assert.equal(g.play(idx,"boss"),true);
 }
 assert.equal(reflected,true,"the mirror triggered on an actual blocked attack");
});
test("dragon staff fires on growth, not on first egg summon",()=>{
 const g=practice(["dragonEgg","dragonEgg","guard","guard","guard"],"dragonStaff");
 assert.equal(g.snapshot().weaponStatus.ready,false);
 play(g,"dragonEgg");
 assert.equal(g.snapshot().weaponActivation,null);
 assert.equal(g.snapshot().weaponStatus.ready,true);
 play(g,"dragonEgg");
 const ev=g.snapshot().weaponActivation;
 assert.equal(ev.id,"dragonStaff");
 assert.equal(ev.seq,1);
 assert.match(ev.detail,/防御＋3/);
});
test("unarmed and legacy tests do not add weapon events to combat",()=>{
 const g=practice(["basicAttack","basicAttack","basicDefense","basicDefense","basicDefense"],null);
 play(g,"basicAttack");
 assert.equal(g.snapshot().weaponStatus,null);
 assert.equal(g.snapshot().weaponActivation,null);
});
test("HUD is accessible, shows readiness, and flashes only from weapon event sequence",()=>{
 assert.match(html,/id="b1WeaponIndicator"[^>]*role="status" aria-live="polite"/);
 assert.match(html,/id="b1WeaponToast"[^>]*role="status" aria-live="polite"/);
 assert.match(html,/const info=s\.weaponStatus/);
 assert.match(html,/weaponHud\.dataset\.ready=String\(Boolean\(info\?\.ready\)\)/);
 assert.match(html,/function showWeaponCue\(state\)/);
 assert.match(html,/event\.seq<=lastWeaponCue/);
 assert.match(html,/showWeaponCue\(s\)/);
 assert.match(html,/setTimeout\(\(\)=>\{toast\.hidden=true/);
 assert.match(html,/\.\/underground-b1-weapon-feedback\.css/);
 assert.match(css,/\.b1-weapon-indicator\[data-ready="true"\]/);
 assert.match(css,/@keyframes b1WeaponCuePop/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(css,/pointer-events:none/);
});
