import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,getB1Card} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-defense-prototype.css",import.meta.url),"utf8");
const doc=readFileSync(new URL("../design/CARD_UI_DESIGN_RULES.md",import.meta.url),"utf8");
const last20=["mentalCollapse","curse","deathSong","hallucination","shadowEcho",
 "blizzard","thunderSurge","guideThrust","spellblade","bludgeon","rapidPunch",
 "heavyBlow","sneakHit","ironHammer","doping","adversity","rage",
 "dragonEgg","dragonFeed","dragonBreath"];
function declared(name){
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 const reg=new RegExp("const "+escaped+"=new Set\\(\\[([\\s\\S]*?)\\]\\);");
 const m=html.match(reg);assert.ok(m,name+" declaration missing");
 return [...m[1].matchAll(/"([A-Za-z]+)"/g)].map(x=>x[1]);
}
test("all 65 cards are assigned once across four approved frame waves",()=>{
 assert.deepEqual(declared("B1_CARD_FRAME_WAVE3"),last20);
 assert.deepEqual(declared("B1_CARD_FRAME_WAVE4"),["lightningFlash","lightningFork","lightningSweep","lightningRelay","shieldMoss","shieldMirror","shieldSpore","shieldIncubate"]);
 const all=[...declared("B1_CARD_FRAME_WAVE1"),...declared("B1_CARD_FRAME_WAVE2"),...declared("B1_CARD_FRAME_WAVE3"),...declared("B1_CARD_FRAME_WAVE4")];
 assert.equal(all.length,65);
 assert.equal(new Set(all).size,65,"no duplicate implementation entries");
 assert.deepEqual(all.slice().sort(),Object.keys(CARDS).slice(0,65).slice().sort());
 assert.match(html,/B1_CARD_FRAME_WAVE3\.has\(designId\)/);
 for(const id of last20){
  const card=getB1Card(id);
  assert.ok(card.magicArt||card.fireArt||card.art,id+" original artwork retained");
  assert.ok(getB1Card(id+"~"),id+" retains upgrade rules");
 }
});
test("dragon sprites have original background artwork, clean clipping and distinct badge",()=>{
 assert.match(css,/> :is\(\.b1-magic-card-art,\.b1-fire-card-art,\.b1-dragon-card-art,\.b1-dragon-card-sprite\)/);
 assert.match(css,/background-color:#1b2a42/);
 assert.doesNotMatch(css,/border-bottom:2px solid #f1cc80;\s*background:#1b2a42;/);
 assert.match(css,/\.b1-frame-dragon/);
 assert.match(css,/\.b1-dragon-card-sprite/);
 assert.match(html,/\["dragon","dragonFeed","dragonBreath"\]\.includes\(card\.kind\)/);
 assert.match(html,/dragon:"✵"/);
 assert.ok(!css.includes("touch-action:auto"),"dragging stays in the original gesture handlers");
});
test("advanced text uses capped hand lines and a complete readable preview",()=>{
 assert.match(css,/\.b1-frame-long-effect/);
 assert.match(css,/-webkit-line-clamp:2/);
 assert.match(css,/-webkit-line-clamp:unset/);
 assert.match(css,/\.b1-card-preview/);
 assert.match(css,/#rewardCards/);
 assert.match(css,/\.b1-evolution-choice/);
 const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(js);
 const check=spawnSync(process.execPath,["--check","--input-type=module"],{input:js,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
 assert.match(doc,/全65種類に適用済み/);
 assert.match(doc,/全65種類に適用済み/);
});
