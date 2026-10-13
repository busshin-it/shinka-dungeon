import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");
test("upgrade picker now shows both full effects alongside a thumbnail in compact rows",()=>{
 const patch=css.slice(css.lastIndexOf("/* B1 approved upgrade comparison list:"));
 assert.ok(patch.length>1600);
 assert.match(patch,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(patch,/\.b1-evolution-choice\{[\s\S]*display:grid/);
 assert.match(patch,/grid-template-columns:clamp\(96px,10vw,132px\) minmax\(0,1fr\)/);
 assert.match(patch,/\.b1-evolution-choice > \.pilot-card-copy\{[\s\S]*display:grid/);
 assert.match(patch,/\.b1-evolution-text\{[\s\S]*overflow:visible/);
 assert.match(patch,/@media\(max-width:1100px\)/);
 assert.match(patch,/@media\(max-width:540px\)/);
 assert.doesNotMatch(patch,/overflow:auto/);
 assert.match(html,/b1EvolutionCompareBlock\("現在の効果",current\.text,current\.cost,"before"\)/);
 assert.match(html,/b1EvolutionCompareBlock\(upgraded\?"進化済み":"✦ 進化後の効果",futureText,future\.cost,"after"\)/);
 assert.match(html,/game\.chooseRest\("upgrade",index\)/);
 assert.match(html,/card\.classList\.remove\("b1-defense-prototype"\)/);
 assert.equal(Object.keys(CARDS).length,85);
});
test("UI builder module remains parseable",()=>{
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const check=spawnSync(process.execPath,["--check","--input-type=module"],{input:script,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
});
