import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CARDS } from "../v4-1/underground-b1-engine.mjs";

const ART = {
 bludgeon:["physical-bludgeon","b1-physical-bludgeon.avif"],
 rapidPunch:["physical-rapid","b1-physical-rapid.avif"],
 heavyBlow:["physical-heavy","b1-physical-heavy.avif"],
 sneakHit:["physical-sneak","b1-physical-sneak.avif"],
 ironHammer:["physical-hammer","b1-physical-hammer.avif"],
 doping:["physical-doping","b1-physical-doping.avif"],
 adversity:["physical-adversity","b1-physical-adversity.avif"],
 rage:["physical-rage","b1-physical-rage.avif"]
};
test("all eight physical cards have separately registered, valid AVIF pictures",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const seen=new Set();
 for(const [id,[artKey,name]] of Object.entries(ART)){
  assert.equal(CARDS[id].magicArt,artKey,id+" mapped to source");
  assert.ok(html.includes('"'+artKey+'":"'+name+'"'),id+" in central art map");
  const path=fileURLToPath(new URL("../v4-1/assets/"+name,import.meta.url));
  const buf=readFileSync(path);
  assert.equal(buf.toString("ascii",4,12),"ftypavif",name+" is a real AVIF");
  assert.ok(buf.length>=1000&&buf.length<30000,name+" is a compact art preview");
  assert.equal(statSync(path).size,buf.length);
  assert.ok(!seen.has(name),"each card owns its own image");
  seen.add(name);
 }
 assert.equal(seen.size,8);
});
test("physical images share hand, shop and preview renderers without changing card behavior",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-fire.css",import.meta.url),"utf8");
 assert.ok(html.includes("const B1_CARD_ART=Object.freeze("));
 assert.ok(html.includes("const lowRes=B1_CARD_ART[artKey],highRes=B1_HQ_CARD_ART[artKey]"));
 assert.ok(html.includes("const candidates=[highRes,lowRes]"),"HQ original first, existing AVIF second");
 assert.ok(html.includes("img.src=\"./assets/\"+candidates[index]"),"loads next fallback on failure");
 assert.ok(html.includes("attachB1OriginalArt(picture,c.magicArt)"),"hand and starter art");
 assert.ok(html.includes("const card=getB1Card(item.id),b=cardButton(item.id)"),"shop art");
 assert.ok(html.includes('img.addEventListener("error"'),"fallback on missing image");
 assert.ok(html.includes('img.className="b1-original-elemental-img b1-original-card-img"'));
 assert.ok(css.includes(".b1-original-elemental-img"));
 assert.ok(css.includes("object-fit:cover"));
 for(const [id,[key]] of Object.entries(ART)){
  assert.ok(css.includes(".b1-magic-art--"+key),id+" CSS fallback remains");
 }
});
