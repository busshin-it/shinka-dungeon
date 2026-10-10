import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {spawnSync} from "node:child_process";

const root=new URL("../v4-1/",import.meta.url);
const html=readFileSync(new URL("underground-b1-playtest.html",root),"utf8");
const css=readFileSync(new URL("underground-b1-mobile.css",root),"utf8");
const original=readFileSync(new URL("six-paths-stage.css",root),"utf8");
function styles(){
 const refs=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\.\/([^"]+)"/g)].map(x=>x[1]);
 return refs;
}
test("B1 uses its own last-loaded mobile stylesheet and preserves wizard game HTML",()=>{
 const refs=styles();
 assert.equal(refs.at(-1),"underground-b1-mobile.css");
 assert.ok(refs.indexOf("six-paths-stage.css")<refs.indexOf("underground-b1-mobile.css"));
 assert.ok(refs.indexOf("underground-b1-dragon-visuals.css")<refs.indexOf("underground-b1-mobile.css"));
 assert.match(html,/class="planning-mode pilot-mode" data-b1-mobile="true"/);
 for(const id of ["playScreen","heroPuppet","enemyPuppet","heroHp","enemyHp","hand","endTurn","deckButton","enemyLineup","setupPanel"]){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 for(const file of refs)assert.ok(existsSync(new URL(file,root)),file);
 assert.ok(original.includes(".pilot-mode .pilot-game"));
});
test("landscape has bounded viewport grid with non-overlapping battle and cards",()=>{
 assert.match(css,/@media \(orientation:landscape\) and \(max-width:1100px\) and \(max-height:620px\)/);
 assert.match(css,/height:100dvh/);
 assert.match(css,/min-height:0;max-width:none;overflow:hidden/);
 assert.match(css,/grid-template-rows:30px 15px minmax\(0,1fr\)/);
 assert.match(css,/grid-template-rows:minmax\(116px,1fr\) clamp\(144px,42dvh,168px\)/);
 assert.match(css,/grid-template-rows:36px 15px minmax\(0,1fr\)/);
 assert.match(css,/#playScreen > \.stage/);
 assert.match(css,/#playScreen > \.table/);
 assert.match(css,/#hand/);
 assert.match(css,/height:calc\(100% - 2px\)/);
 for(const vh of [346,360,390,420,500,620]){
  const header=30+15,table=Math.max(144,Math.min(vh*.42,168));
  const arena=vh-header-table;
  assert.ok(arena>=116, "arena should not collapse at "+vh);
  const cardRoom=table-36-15-3-2-4-3-2;
  assert.ok(cardRoom>=60, "usable card height at "+vh);
 }
});
test("touch targeting, overlays, safe areas, portrait and tiny screens remain usable",()=>{
 assert.match(css,/touch-action:pan-x/);
 assert.match(css,/overscroll-behavior-x:contain/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/@media \(orientation:portrait\) and \(max-width:900px\)/);
 assert.match(css,/overflow-x:hidden; overflow-y:auto/);
 assert.match(css,/@media \(orientation:landscape\) and \(max-width:1100px\) and \(max-height:305px\)/);
 assert.match(css,/min-height:360px;overflow:visible/);
 assert.match(css,/max-height:calc\(100dvh - 16px\)/);
 assert.match(css,/\.b1-enemy-lineup/);
 assert.match(css,/#dragonHud/);
 assert.match(css,/prefers-reduced-motion/);
 // Cards must remain scrollable, not all shrunk to unreadable zero-width columns.
 assert.match(css,/overflow-x:auto;overflow-y:hidden/);
 assert.match(css,/min-width:clamp\(105px,16vw,122px\)/);
});
test("B1 battle script still parses and mobile changes are presentation-only",()=>{
 const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(code);
 const run=spawnSync(process.execPath,["--check","--input-type=module"],{input:code,encoding:"utf8"});
 assert.equal(run.status,0,run.stderr);
 const action=readFileSync(new URL("underground-b1-actions.mjs",root),"utf8");
 assert.ok(action.includes("pointermove"));
 assert.ok(action.includes("pointercancel"));
 assert.doesNotMatch(css,/\.play\(|\.endTurn\(|localStorage|serviceWorker/);
});
