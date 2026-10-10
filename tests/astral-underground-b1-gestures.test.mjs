import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {needsB1Target} from "../v4-1/underground-b1-actions.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-actions.css",import.meta.url),"utf8");
const controls=readFileSync(new URL("../v4-1/underground-b1-actions.mjs",import.meta.url),"utf8");
const effects=readFileSync(new URL("../v4-1/underground-b1-feedback.mjs",import.meta.url),"utf8");

test("attack and single-target status cards require an enemy; untargeted cards do not",()=>{
 for(const kind of ["attack","multi","poison","fragile"])assert.equal(needsB1Target(kind),true,kind);
 for(const kind of ["guard","all","energy","power","draw","heal"])assert.equal(needsB1Target(kind),false,kind);
});
test("B1 imports its isolated interaction layer without modifying the legacy game stylesheet",()=>{
 assert.match(html,/underground-b1-actions\.css/);
 assert.match(html,/import \{attachB1Actions\} from "\.\/underground-b1-actions\.mjs"/);
 assert.match(html,/import \{showB1Feedback\} from "\.\/underground-b1-feedback\.mjs"/);
 assert.match(html,/actions\.bindHandCard\(b,index\)/);
 assert.match(html,/actions\.handleTargetClick\(e\.id\)/);
 assert.match(html,/showB1Feedback\(\{stage:gameStage/);
 assert.match(html,/href="\.\/six-paths-stage\.css"/);
 assert.match(html,/class="puppet hero-puppet"/);
});
test("drag gesture supports tap, pointer, cancellation and keyboard safely",()=>{
 for(const term of ["pointerdown","pointermove","pointerup","pointercancel","setPointerCapture","elementFromPoint","Escape","suppressUntil","pointerTarget","aria-pressed","pointerId"])
  assert.ok(controls.includes(term),"gesture missing "+term);
 assert.match(css,/touch-action:pan-x/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/b1-casting/);
 assert.match(css,/b1-dealt/);
});
test("feedback uses HP differences and visual animations without mutating the engine",()=>{
 assert.match(effects,/old\.hp-newer\.hp/);
 assert.match(effects,/before\.hp-after\.hp/);
 assert.match(effects,/\.animate\(/);
 assert.match(effects,/prefers-reduced-motion/);
 assert.doesNotMatch(effects,/createB1Game|\.play\(|\.endTurn\(/);
});
test("both B1 modules and inlined module pass the JavaScript parser",()=>{
 for(const file of ["underground-b1-actions.mjs","underground-b1-feedback.mjs"]){
  const run=spawnSync(process.execPath,["--check",new URL("../v4-1/"+file,import.meta.url).pathname],{encoding:"utf8"});
  assert.equal(run.status,0,file+" "+run.stderr);
 }
 const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(code,"B1 module not found");
 const run=spawnSync(process.execPath,["--check","--input-type=module"],{input:code,encoding:"utf8"});
 assert.equal(run.status,0,run.stderr);
});
