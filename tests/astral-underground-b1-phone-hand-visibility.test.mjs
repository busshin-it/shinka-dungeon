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
 assert.match(css,/--b1-hand-dock:clamp\(184px,57dvh,246px\)/);
 assert.match(css,/grid-template-rows:34px 9px minmax\(0,1fr\)/);
 assert.match(css,/overflow-x:auto;overflow-y:hidden/);
 // Unlike the original 155px override, the hand has enough space for names/effects.
 for(const height of [306,345,360,390,440,560,620]){
  const dock=Math.max(184,Math.min(height*.57,246));
  assert.ok(dock-34-9-12>=129,"usable height at "+height);
  assert.ok(height-dock>=120,"arena remains usable at "+height);
 }
});
test("hidden header actions remain accessible from a compact battle menu",()=>{
 assert.match(html,/id="b1MobileQuickMenu"/);
 assert.match(html,/summary aria-label="ゲームメニュー"/);
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
