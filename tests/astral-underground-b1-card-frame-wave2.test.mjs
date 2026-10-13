import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CARDS,getB1Card} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-defense-prototype.css",import.meta.url),"utf8");
const doc=readFileSync(new URL("../design/CARD_UI_DESIGN_RULES.md",import.meta.url),"utf8");
const ids=["fireSmall","fireMedium","fireLarge","fireWaveSmall","fireWaveMedium","fireWaveLarge",
 "thunderSmall","thunderMedium","thunderLarge","flow","ward","charge","double","focus",
 "flare","frostBreak","echoGuard","lingeringPoison","darkBolt","abyssBolt","iceSpear","arcaneLance"];

test("phase two includes 22 additional original-art cards and leaves 20 for later",()=>{
 const m=html.match(/const B1_CARD_FRAME_WAVE2=new Set\(\[([\s\S]*?)\]\);/);
 assert.ok(m,"named second wave set missing");
 const actual=[...m[1].matchAll(/"([A-Za-z]+)"/g)].map(x=>x[1]);
 assert.deepEqual(actual,ids);
 assert.equal(new Set(actual).size,22);
 assert.equal(Object.keys(CARDS).length,65);
 for(const id of ids){
  const card=getB1Card(id);
  assert.ok(card.magicArt||card.fireArt,id+" must use existing original art");
  assert.ok(getB1Card(id+"~"),"upgrade exists "+id);
 }
 assert.match(html,/B1_CARD_FRAME_WAVE1\.has\(designId\)\|\|B1_CARD_FRAME_WAVE2\.has\(designId\)/);
 assert.match(doc,/合計37種類適用/);
 assert.match(doc,/残り0種類/);
});
test("fire sprites share illustrated frame geometry without modifying original sprite mapping",()=>{
 const generic=/ > :is\(\.b1-magic-card-art,\.b1-fire-card-art,\.b1-dragon-card-art,\.b1-dragon-card-sprite\)/g;
 const matches=[...css.matchAll(generic)];
 assert.ok(matches.length>=5,"base, hand, preview, reward, V3 all use same art slot");
 assert.match(css,/> \.b1-fire-card-art\{/);
 assert.match(css,/background-repeat:no-repeat/);
 assert.match(css,/\.b1-original-card-img/);
 assert.match(css,/#playScreen #hand\.hand/);
 assert.match(css,/\.b1-card-preview/);
 assert.match(css,/#rewardCards/);
 assert.ok(!css.includes("touch-action:auto"));
});
