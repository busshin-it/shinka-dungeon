import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {b1PointerIntent,b1IsBattleDrop} from "../v4-1/underground-b1-actions.mjs";
const css=readFileSync(new URL("../v4-1/underground-b1-overlay-hand.css",import.meta.url),"utf8");
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const action=readFileSync(new URL("../v4-1/underground-b1-actions.mjs",import.meta.url),"utf8");

test("hand has no opaque background slab; wizard stage fills the B1 play area",()=>{
 assert.match(html,/href="\.\/underground-b1-overlay-hand\.css"/);
 const i=html.indexOf("underground-b1-overlay-hand.css"),j=html.indexOf("underground-b1-hand-fan.css");
 assert.ok(i>j,"the B1 transparent overlay is loaded after the existing hand styles");
 for(const rule of [
  "position:relative;","display:block;","position:absolute;","inset:0;",
  "background:none;","background:transparent;","pointer-events:none;",
  "pointer-events:auto;","overflow-x:auto;","touch-action:pan-x",
  "scrollbar-width:none;","justify-content:safe center",
 ])assert.ok(css.includes(rule),rule);
 assert.match(css,/#playScreen > \.table\{[\s\S]*?bottom:0/);
 assert.match(css,/#playScreen > \.stage\{[\s\S]*?height:100%/);
 assert.match(css,/#playScreen #hand\.hand\{[\s\S]*?background:transparent/);
 assert.match(css,/#playScreen > \.stage #battleLog\{/);
 assert.match(css,/journeyPanel:not\(\[hidden\]\)/,"reward overlays hide controls");
});
test("landscape PWA and portrait retain a tappable, scrollable hand without sacrificing controls",()=>{
 assert.match(css,/@media \(orientation:landscape\) and \(max-width:1100px\) and \(max-height:620px\)/);
 assert.match(css,/@media \(orientation:portrait\) and \(max-width:900px\)/);
 assert.match(css,/\.pilot-mode\[data-b1-mobile\] #playScreen > \.table\{/);
 assert.match(css,/grid-template-rows:34px 9px minmax\(0,1fr\)/);
 assert.match(css,/#endTurn/);
 for(const id of ["hand","enemyLineup","heroPuppet","enemyPuppet","endTurn","deckButton"])
  assert.ok(html.includes('id="'+id+'"'),id);
});
test("upward diagonal touch casts instead of being mistaken for horizontal scrolling",()=>{
 for(const [dx,dy] of [[25,-18],[60,-34],[2,-30],[10,-65]]){
  assert.equal(b1PointerIntent(dx,dy,"touch"),"drag",dx+","+dy);
 }
 for(const [dx,dy] of [[40,4],[-45,12],[60,-4]]){
  assert.equal(b1PointerIntent(dx,dy,"touch"),"scroll",dx+","+dy);
 }
 assert.equal(b1PointerIntent(4,3,"touch"),"wait");
 assert.equal(b1PointerIntent(52,0,"mouse"),"drag");
});
test("releasing in the battle stage casts; releasing back over the cards does not",()=>{
 const stage={left:0,top:0,right:1000,bottom:550};
 const hand={left:200,top:405,right:800,bottom:548};
 assert.equal(b1IsBattleDrop(500,300,stage,hand),true);
 assert.equal(b1IsBattleDrop(500,480,stage,hand),false);
 assert.equal(b1IsBattleDrop(500,404,stage,hand),false);
 assert.equal(b1IsBattleDrop(1200,210,stage,hand),false);
 assert.equal(b1IsBattleDrop(500,100,stage,{left:0,top:0,right:100,bottom:130}),true,"old synthetic test viewport");
 assert.match(action,/cleanup\(item\.targeted\?!target:!inside\)/);
 assert.match(action,/if\(inside&&target\)fire\(item\.index,target,item\.rect\)/);
 assert.match(action,/else if\(inside\)fire\(item\.index,null,item\.rect\)/);
 assert.match(action,/pointerTarget\(e\.clientX,e\.clientY\)/);
 assert.match(action,/b1-drop-target/);
 assert.match(action,/if\(enemy\.disabled\)continue/);
});
test("existing battle controls remain functional; no engine or core CSS changed",()=>{
 const check=spawnSync(process.execPath,["--check",new URL("../v4-1/underground-b1-actions.mjs",import.meta.url).pathname],{encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const result=spawnSync(process.execPath,["--check","--input-type=module"],{input:inline,encoding:"utf8"});
 assert.equal(result.status,0,result.stderr);
 assert.match(action,/if\(picked===index\)cancel\(\);else select\(index\)/);
 assert.match(action,/hand\.addEventListener\("pointerdown"/);
 assert.match(action,/window\.addEventListener\("pointerup"/);
 assert.match(action,/window\.addEventListener\("pointercancel"/);
});
