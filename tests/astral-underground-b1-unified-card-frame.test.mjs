import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,getB1Card} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-defense-prototype.css",import.meta.url),"utf8");
const guide=readFileSync(new URL("../design/CARD_UI_DESIGN_RULES.md",import.meta.url),"utf8");
const batch=["basicAttack","basicDefense","guard","bolt","lightning","frost","scatter","chain","heal","drain","poison","fragile","strength","spark","break"];

test("approved card frame wave 1 applies to exactly 15 cards, no accidental other cards",()=>{
 const match=html.match(/const B1_CARD_FRAME_WAVE1=new Set\(\[([\s\S]*?)\]\);/);
 assert.ok(match,"frame wave list must remain explicit");
 const ids=[...match[1].matchAll(/"([A-Za-z]+)"/g)].map(x=>x[1]);
 assert.deepEqual(ids,batch);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(Object.keys(CARDS).length,57);
 for(const id of ids){
  assert.ok(getB1Card(id)&&getB1Card(id).magicArt,id+" must show the existing painting");
  assert.ok(getB1Card(id+"~"),id+" upgraded variant preserved");
 }
 assert.equal(getB1Card("basicDefense").block,5);
 assert.equal(getB1Card("basicDefense").cost,1);
 assert.equal(getB1Card("basicAttack").damage,5);
 assert.equal(getB1Card("basicAttack").cost,1);
});
test("one game card function uses named frame themes, cost, title, art, labels and shield glyph",()=>{
 assert.match(html,/const designId=id\.endsWith\("~"\)\?id\.slice\(0,-1\):id/);
 assert.match(html,/B1_CARD_FRAME_WAVE1\.has\(designId\)/);
 assert.match(html,/btn\.classList\.add\("b1-arcane-card","b1-frame-"\+role\)/);
 assert.match(html,/if\(c\.text\.length>14\)btn\.classList\.add\("b1-frame-long-effect"\)/);
 assert.match(html,/role!=="guard"/);
 assert.match(html,/type\.dataset\.symbol=B1_FRAME_SYMBOL\[role\]/);
 assert.match(html,/btn\.setAttribute\("aria-label",c\.name\+"、魔力"\+c\.cost/);
 assert.match(css,/\.pilot-card\.b1-arcane-card:not\(\.b1-evolution-choice\)/);
 for(const role of ["guard","physical","spell","heal","debuff","skill"]){
  assert.ok(html.includes('"'+role+'"')||html.includes('role==="'+role+'"'),role);
 }
 for(const role of ["physical","spell","heal","debuff","skill"]){
  assert.ok(css.includes(".b1-frame-"+role),role+" has unique type badge");
 }
 assert.match(css,/> \.type::before/);
 assert.match(css,/> \.type::after/);
 assert.match(css,/content:attr\(data-symbol\)/);
});
test("full screen evolution stays a separate gold comparison UI instead of the common hand frame",()=>{
 assert.match(html,/card\.classList\.remove\("b1-arcane-card"\)/);
 assert.match(html,/originType\.textContent=typeNames\[current\.kind\]\|\|current\.kind/);
 assert.match(html,/originType\.removeAttribute\("data-symbol"\)/);
 assert.match(html,/card\.classList\.add\("b1-rest-upgrade-card","b1-upgrade-image-choice","b1-evolution-choice"\)/);
 assert.match(css,/:not\(\.b1-evolution-choice\)/);
});
test("hand and reward card sizing remains untouched and long effects can be read by preview",()=>{
 assert.match(css,/#playScreen #hand\.hand \.pilot-card\.b1-arcane-card/);
 assert.match(css,/\.b1-card-preview \.pilot-card\.b1-arcane-card/);
 assert.match(css,/#rewardCards \.pilot-card\.b1-arcane-card/);
 assert.match(css,/\.b1-frame-long-effect/);
 assert.match(css,/-webkit-line-clamp:2/);
 assert.match(css,/-webkit-line-clamp:unset/);
 const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(js);
 const p=spawnSync(process.execPath,["--input-type=module","--check"],{input:js,encoding:"utf8"});
 assert.equal(p.status,0,p.stderr);
});
test("design rules are definitive while rollout status, guard styling and undo instructions stay visible",()=>{
 assert.match(guide,/正式ルール/);
 assert.match(guide,/防御/);
 assert.match(guide,/15種類/);
 assert.match(guide,/42種類/);
 assert.match(guide,/手札/);
 assert.match(guide,/強化/);
 assert.match(guide,/アクセシビリティ/);
 assert.match(guide,/戻し方/);
});
