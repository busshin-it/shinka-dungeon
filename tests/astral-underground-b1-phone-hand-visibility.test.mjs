import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-phone-hand-visibility.css",import.meta.url),"utf8");

test("phone landscape owns the final visible battle layout",()=>{
 const links=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\.\/([^"]+)"/g)].map(x=>x[1]);
 assert.equal(links.at(-1),"underground-b1-phone-hand-visibility.css","new CSS must override later reward CSS");
 assert.match(css,/@media \(orientation:landscape\) and \(max-width:1100px\) and \(max-height:620px\)/);
 assert.match(css,/body\.pilot-mode\[data-b1-mobile\] \.pilot-game > \.masthead,/);
 assert.match(css,/body\.pilot-mode\[data-b1-mobile\] \.pilot-game > \.journey\{display:none\}/);
 assert.match(css,/grid-template-rows:minmax\(0,1fr\)/);
 assert.match(css,/body\.pilot-mode\[data-b1-mobile\] #playScreen\{/);
 assert.match(css,/--b1-hand-dock:clamp\(190px,54dvh,232px\)/);
 assert.match(css,/grid-template-rows:34px 9px minmax\(0,1fr\)/);
 assert.match(css,/overflow-x:auto;overflow-y:hidden/);
 // Unlike the original 155px override, the hand has enough space for names/effects.
 for(const height of [306,345,360,390,440,560,620]){
  const dock=Math.max(190,Math.min(height*.54,232));
  assert.ok(dock-34-9-12>=129,"usable height at "+height);
  assert.ok(height-dock>=105,"arena remains usable at "+height);
 }
});
test("hidden header actions remain accessible from a compact battle menu",()=>{
 assert.match(html,/id="b1MobileQuickMenu"/);
 assert.match(html,/summary aria-label="設定・更新メニュー"/);
 for(const id of ["b1MobileCatalog","b1MobileRestart","b1CardCatalogOpen","restart"]){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(html,/el\("b1MobileCatalog"\)\.addEventListener\("click",\(\)=>\{el\("b1MobileQuickMenu"\)\.open=false;el\("b1CardCatalogOpen"\)\.click\(\);\}\)/);
 assert.match(html,/el\("b1MobileRestart"\)\.addEventListener\("click",\(\)=>\{el\("b1MobileQuickMenu"\)\.open=false;el\("restart"\)\.click\(\);\}\)/);
 assert.match(css,/:not\(\[open\]\) > \.b1-mobile-quick-panel\{display:none\}/);
 assert.match(css,/pointer-events:auto/);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const check=spawnSync(process.execPath,["--check","--input-type=module"],{input:script,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
});
test("tiny landscape still scrolls; mobile change is presentation only",()=>{
 assert.match(css,/@media \(orientation:landscape\) and \(max-width:1100px\) and \(max-height:305px\)/);
 assert.match(css,/height:auto;min-height:360px;max-height:none;overflow:visible/);
 assert.doesNotMatch(css,/touch-action\s*:\s*none|\.play\(|\.endTurn\(|localStorage|serviceWorker/);
});

test("cards show both their artwork and readable labels at short landscape heights",()=>{
 assert.match(css,/--b1-hand-art-share:54%/);
 assert.match(css,/--b1-defense-art-share:54%/);
 assert.match(css,/\.pilot-card-copy strong\{/);
 assert.match(css,/\.pilot-card-copy \.desc\{/);
 assert.match(css,/bottom:max\(7px,env\(safe-area-inset-bottom\)\)/);
 for(const height of [345,360,390,440,600]){
  const dock=Math.max(190,Math.min(height*.54,232));
  const usable=dock-34-9-12;
  assert.ok(usable>=132,"compact card height should fit at "+height);
  assert.ok(usable*.51>=65,"name and effect should have room at "+height);
 }
});
test("rest-upgrade landscape uses the complete height with two comparison columns where wide enough",()=>{
 assert.match(css,/#journeyPanel\.b1-upgrade-open #restUpgradeCards\.b1-rest-upgrades/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media \(orientation:landscape\) and \(min-width:740px\)/);
 assert.match(css,/\.b1-evolution-choice\{\s*min-height:205px;height:auto/);
 assert.match(css,/grid-template-columns:clamp\(78px,9vw,110px\) minmax\(0,1fr\)/);
 assert.match(css,/grid-template-rows:auto minmax\(0,1fr\)/);
 assert.match(css,/overflow-y:auto;overflow-x:hidden/);
 assert.match(css,/touch-action:pan-y/);
 assert.match(css,/#restBack\{/);
});

test("phone card shrink preserves readable name/effect and swipe gestures",()=>{
 assert.match(css,/--b1-defense-art-share:49%/);
 assert.match(css,/flex:0 0 clamp\(153px,17\.5vw,184px\)/);
 assert.match(css,/margin-inline-start:-22px/);
 assert.match(css,/\.pilot-card-copy strong\{/);
 assert.match(css,/\.pilot-card-copy \.desc\{/);
 assert.match(css,/overflow-x:auto;overflow-y:hidden/);
 assert.doesNotMatch(css,/touch-action\s*:\s*none/);
});
