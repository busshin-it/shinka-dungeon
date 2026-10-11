import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync,statSync} from "node:fs";
import {createHash} from "node:crypto";

const root=new URL("../v4-1/",import.meta.url);
const html=readFileSync(new URL("underground-b1-playtest.html",root),"utf8");
const exporter=readFileSync(new URL("../scripts/build_b1_card_hq.py",import.meta.url),"utf8");
const cases={
 "physical-bludgeon":"b1-physical-bludgeon.webp",
 "physical-rapid":"b1-physical-rapid.webp",
 "physical-heavy":"b1-physical-heavy.webp",
 "physical-sneak":"b1-physical-sneak.webp",
 "physical-hammer":"b1-physical-hammer.webp",
 "physical-doping":"b1-physical-doping.webp",
 "physical-adversity":"b1-physical-adversity.webp",
 "physical-rage":"b1-physical-rage.webp",
 "mental-collapse":"b1-dark-mental-collapse.webp",
 "curse":"b1-dark-curse.webp",
 "death-song":"b1-dark-death-song.webp",
 "hallucination":"b1-dark-hallucination.webp"
};

test("all 12 candidate HD cards map to a unique 768x1024 WebP filename and source",()=>{
 assert.ok(html.includes("const B1_HQ_CARD_ART=Object.freeze("));
 assert.equal(Object.keys(cases).length,12);
 for(const [key,filename] of Object.entries(cases)){
  assert.ok(html.includes('"'+key+'":"'+filename+'"'),key);
  assert.ok(exporter.includes('"'+filename+'":'),filename+" exporter");
 }
 assert.ok(exporter.includes("SIZE = (768, 1024)"));
 assert.ok(exporter.includes('image.save(output, format="WEBP", quality=83, method=6)'));
 assert.equal(new Set(Object.values(cases)).size,12);
});

test("HD images are preferred; any missing source safely falls back to tiny AVIF or CSS",()=>{
 assert.ok(html.includes("const lowRes=B1_CARD_ART[artKey],highRes=B1_HQ_CARD_ART[artKey]"));
 assert.ok(html.includes("const candidates=[highRes,lowRes]"));
 assert.ok(html.includes("if(index<candidates.length)img.src="));
 assert.ok(html.includes('else img.remove()'));
 assert.ok(html.includes("unavailableB1Art.add(candidates[index])"));
 assert.ok(html.includes("parent.append(img)"));
 // This migration does not require uncommitted binary assets to be present;
 // the game keeps using the checked-in AVIF/CSS until the 12 WebP files are uploaded.
});

test("registered 768x1024 WebP images match the approved export manifest exactly",()=>{
 const manifest=JSON.parse(readFileSync(new URL("../design/b1-card-hq-expected-manifest.json",import.meta.url),"utf8"));
 assert.equal(manifest.dimensions.join("x"),"768x1024");
 assert.equal(manifest.assets.length,12);
 assert.deepEqual(manifest.assets.map(x=>x.filename).sort(),Object.values(cases).sort());
 for(const {filename,bytes,sha256} of manifest.assets){
  const f=new URL("assets/"+filename,root);
  if(!existsSync(f))continue;
  const buf=readFileSync(f);
  assert.equal(buf.length,bytes,filename+" expected generated size");
  assert.equal(buf.toString("ascii",0,4),"RIFF",filename+" RIFF");
  assert.equal(buf.toString("ascii",8,12),"WEBP",filename+" WebP");
  assert.equal(createHash("sha256").update(buf).digest("hex"),sha256,filename+" unchanged image");
  assert.equal(statSync(f).size,bytes);
 }
});

test("all 12 IDs still share the existing card, shop and preview renderer",()=>{
 for(const expression of [
  "attachB1OriginalArt(picture,c.magicArt)",
  "attachB1OriginalArt(thumb,card.magicArt)",
  'img.className="b1-original-elemental-img b1-original-card-img"',
  'img.addEventListener("error",'
 ])assert.ok(html.includes(expression),expression);
});
