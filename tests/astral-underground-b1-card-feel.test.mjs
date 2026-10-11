import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {b1HandFanPose,b1PointerIntent,needsB1Target} from "../v4-1/underground-b1-actions.mjs";

const js=readFileSync(new URL("../v4-1/underground-b1-actions.mjs",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-hand-fan.css",import.meta.url),"utf8");
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
test("hand keeps its symmetric fan, mobile swipe and attack targeting",()=>{
 assert.deepEqual(b1HandFanPose(0,5),{angle:-7,drop:6});
 assert.deepEqual(b1HandFanPose(2,5),{angle:0,drop:0});
 assert.deepEqual(b1HandFanPose(4,5),{angle:7,drop:6});
 assert.equal(b1PointerIntent(42,3,"touch"),"scroll");
 assert.equal(b1PointerIntent(4,-37,"touch"),"drag");
 for(const kind of ["attack","multi","poison","fragile"])assert.equal(needsB1Target(kind),true);
});
test("large card preview is outside scrolling hand and never intercepts touches",()=>{
 assert.match(js,/const preview=document\.createElement\("div"\)/);
 assert.match(js,/document\.body\.append\(preview\)/);
 assert.match(js,/preview\.replaceChildren\(copy\)/);
 assert.match(js,/copy\.removeAttribute\?\.\("data-b1-hand"\)/);
 assert.match(js,/preview\.setAttribute\("aria-hidden","true"\)/);
 assert.match(css,/\.b1-card-preview\{[\s\S]*?position:fixed;z-index:140;pointer-events:none/);
 assert.match(css,/\.b1-card-preview\[hidden\]\{display:none!important\}/);
 assert.match(css,/\.b1-card-preview .*?\.pilot-card\.b1-art-card/s);
 assert.match(css,/\.b1-card-preview .*?\.pilot-card \.desc/s);
 assert.match(js,/window\.innerHeight<450/);
 assert.match(js,/button\.addEventListener\("focus"/);
 assert.match(js,/button\.addEventListener\("pointerenter"/);
 assert.match(js,/button\.addEventListener\("blur"/);
 assert.match(js,/hand\.addEventListener\("scroll"/);
});
test("drag has bounded follow, released/cancelled card returns and respects reduced motion",()=>{
 assert.match(js,/window\.requestAnimationFrame\(glideGhost\)/);
 assert.match(js,/ghostX\+=\(desiredX-ghostX\)\*\.44/);
 assert.match(js,/window\.cancelAnimationFrame\?\.\(ghostFrame\)/);
 assert.match(js,/window\.matchMedia\?\.\("\(prefers-reduced-motion: reduce\)"\)/);
 assert.match(js,/cleanup\(item\.targeted\?!target:!inside\)/);
 assert.match(js,/if\(intent==="scroll"\)/);
 assert.match(js,/if\(e\.key==="Escape"\)/);
 assert.match(css,/b1TargetPulse/);
 assert.match(css,/prefers-reduced-motion/);
});
test("battle HTML still contains wizard, enemies and cast UI",()=>{
 for(const id of ["heroPuppet","enemyPuppet","hand","endTurn","enemyLineup","b1DragonCompanion"]){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 const check=spawnSync(process.execPath,["--check",new URL("../v4-1/underground-b1-actions.mjs",import.meta.url).pathname],{encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const result=spawnSync(process.execPath,["--check","--input-type=module"],{input:inline,encoding:"utf8"});
 assert.equal(result.status,0,result.stderr);
});
