import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-card-visibility.css",import.meta.url),"utf8");
const gestures=readFileSync(new URL("../v4-1/underground-b1-actions.mjs",import.meta.url),"utf8");
const c=(name)=>html.indexOf('href="./'+name+'"');

test("new B1 art-first layout overrides legacy 43px-wide-screen image restrictions",()=>{
 assert.ok(c("underground-b1-card-visibility.css")>c("underground-b1-overlay-hand.css"));
 assert.match(css,/--b1-hand-art-share:67%/);
 assert.match(css,/--b1-hand-art-share:65%/);
 assert.match(css,/--b1-hand-art-share:63%/);
 assert.match(css,/--b1-hand-art-share:66%/);
 assert.match(css,/height:var\(--b1-hand-art-share\)/);
 assert.match(css,/flex:0 0 var\(--b1-hand-art-share\)/);
 assert.ok(css.includes(".b1-magic-card-art")&&css.includes(".b1-fire-card-art")&&css.includes(".b1-dragon-card-sprite"));
 assert.ok(css.includes(".pilot-card-copy"));
 assert.ok(css.includes("object-position:50% 32%"),"art focal crop moves a little upward");
 assert.match(css,/--b1-hand-dock:clamp\(182px,53dvh,270px\)/);
 assert.match(css,/--b1-hand-dock:clamp\(234px,32dvh,290px\)/);
 assert.match(css,/width:clamp\(190px,13vw,230px\)/);
 assert.match(css,/width:clamp\(161px,19vw,198px\)/);
 assert.match(css,/width:clamp\(174px,46vw,198px\)/);
});
test("text stays concise in the hand, with complete details accessible in the raised preview",()=>{
 assert.match(html,/function b1HandSummary\(id,card\)/);
 for(const id of ["bludgeon","rapidPunch","heavyBlow","sneakHit","ironHammer","doping","adversity","rage","mentalCollapse","curse","deathSong","hallucination"]){
  assert.ok(html.includes('case "'+id+'":'),id);
 }
 assert.ok(html.includes("handDesc.textContent=b1HandSummary(id,c)"));
 assert.ok(html.includes("handDesc.dataset.b1FullDesc=c.text"));
 assert.ok(html.includes('b.setAttribute("aria-label",c.name+"、魔力"+c.cost+"、"+c.text)'));
 assert.ok(gestures.includes('copy.querySelector?.(".desc")'));
 assert.ok(gestures.includes("fullDescription.textContent=fullDescription.dataset.b1FullDesc"));
 assert.match(css,/\.b1-card-preview .*?\.pilot-card\.b1-art-card/s);
 assert.ok(css.includes("-webkit-line-clamp:2"));
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const check=spawnSync(process.execPath,["--input-type=module","--check"],{input:inline,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
});
test("hand gestures, responsive scrolling, animation and battle actions still use their original behavior",()=>{
 assert.match(css,/@media \(orientation:landscape\) and \(max-height:600px\)/);
 assert.match(css,/@media \(orientation:landscape\) and \(max-height:350px\)/);
 assert.match(css,/@media \(orientation:portrait\) and \(max-width:900px\)/);
 assert.ok(!css.includes("pointer-events:none"));
 assert.ok(!css.includes("touch-action:auto"));
 assert.ok(!css.includes("scroll-snap-type:none"));
 assert.ok(!css.includes("background:#081"));
 assert.match(gestures,/hand\.addEventListener\("pointerdown"/);
 assert.match(gestures,/window\.addEventListener\("pointerup"/);
 assert.ok(html.includes("actions.bindHandCard(b,index)"));
 assert.ok(html.includes("attachB1OriginalArt(picture,c.magicArt)"));
});
