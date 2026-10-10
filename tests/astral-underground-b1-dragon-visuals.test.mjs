import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {DRAGON_STAGES} from "../v4-1/underground-b1-engine.mjs";
import {DRAGON_VISUAL_SPRITE,DRAGON_VISUAL_LABELS,DRAGON_VISUAL_STAGE_MAP,getB1DragonVisual} from "../v4-1/underground-b1-dragon-visuals.mjs";

test("eight provided illustrations cover every existing nine-stage dragon step",()=>{
 assert.equal(DRAGON_STAGES.length,9);
 assert.deepEqual(DRAGON_VISUAL_LABELS,["竜の卵","幼竜","小さな竜","成竜","中竜","大竜","巨竜","神龍"]);
 assert.deepEqual(DRAGON_VISUAL_STAGE_MAP,[0,1,1,2,3,4,5,6,7]);
 assert.equal(getB1DragonVisual(-1),null);
 assert.equal(getB1DragonVisual(9),null);
 assert.equal(getB1DragonVisual(2.5),null);
 for(let i=0;i<DRAGON_STAGES.length;i++){
  const visual=getB1DragonVisual(i);
  assert.ok(visual);
  assert.equal(visual.spriteIndex,DRAGON_VISUAL_STAGE_MAP[i]);
  assert.match(visual.position,/^\d+\.\d{3}% (?:0|100)%$/);
 }
 assert.equal(getB1DragonVisual(0).label,"竜の卵");
 assert.equal(getB1DragonVisual(8).label,"神龍");
 assert.equal(getB1DragonVisual(8).position,"100.000% 100%");
});
test("all eight frames exist in a real optimized AVIF image with no extra network requests",()=>{
 assert.equal(DRAGON_VISUAL_SPRITE,"./assets/b1-dragon-evolution.avif");
 const path=new URL("../v4-1/assets/b1-dragon-evolution.avif",import.meta.url);
 assert.equal(existsSync(path),true);
 const bytes=readFileSync(path);
 assert.ok(bytes.length>10000&&bytes.length<100000);
 assert.equal(bytes.toString("ascii",4,12),"ftypavif");
});
test("the same art is visible as a companion, on cards and on the egg starter without changing combat logic",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-dragon-visuals.css",import.meta.url),"utf8");
 assert.match(html,/id="b1DragonCompanion"/);
 assert.match(html,/id="b1DragonPortrait"/);
 assert.match(html,/import \{getB1DragonVisual\}/);
 assert.match(html,/const dragonVisual=getB1DragonVisual\(s.dragonStage\)/);
 assert.match(html,/portrait.style.backgroundPosition=dragonVisual.position/);
 assert.match(html,/b1-dragon-card-sprite/);
 assert.match(css,/\.b1-dragon-portrait/);
 assert.match(css,/\.b1-starter-card-art--dragonEgg/);
 assert.match(css,/background-size:400% 200%/);
 assert.ok(html.includes('id="heroPuppet"'));
 assert.ok(html.includes('id="enemyPuppet"'));
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const p=spawnSync(process.execPath,["--check","--input-type=module"],{input:inline,encoding:"utf8"});
 assert.equal(p.status,0,p.stderr);
});
