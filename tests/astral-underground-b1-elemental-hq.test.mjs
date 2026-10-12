import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CARDS } from "../v4-1/underground-b1-engine.mjs";

const manifest=JSON.parse(readFileSync(new URL("../design/b1-elemental-hq-expected-manifest.json",import.meta.url),"utf8"));
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-card-visibility.css",import.meta.url),"utf8");

test("all six B1 fire/lightning spell cards have distinct, fully uploaded original WebPs",()=>{
 assert.equal(manifest.files.length,6);
 const names=new Set();
 const arts=new Set();
 for(const art of manifest.files){
  assert.equal(CARDS[art.card_id].magicArt,art.art,art.card_id+" art ID");
  assert.equal(CARDS[art.card_id].name,art.name,art.card_id+" display name");
  assert.ok(html.includes('"'+art.art+'":"'+art.filename+'"'),"central art mapping: "+art.art);
  const b=readFileSync(new URL("../v4-1/assets/"+art.filename,import.meta.url));
  assert.equal(b.length,art.bytes,art.filename+" approved file length");
  assert.equal(createHash("sha256").update(b).digest("hex"),art.sha256,art.filename+" approved bytes");
  assert.equal(b.toString("ascii",0,4),"RIFF",art.filename+" RIFF");
  assert.equal(b.toString("ascii",8,12),"WEBP",art.filename+" WEBP");
  assert.equal(b.toString("ascii",12,16),"VP8 ",art.filename+" VP8 ");
  // VP8 lossy frame width/height are 14-bit little-endian words.
  assert.equal(b.readUInt16LE(26)&0x3fff,768,art.filename+" width");
  assert.equal(b.readUInt16LE(28)&0x3fff,1024,art.filename+" height");
  names.add(art.filename);arts.add(art.art);
 }
 assert.equal(names.size,6);
 assert.equal(arts.size,6);
});

test("the same uploaded artwork is used across hand, enlargement, shop and starters",()=>{
 assert.match(html,/attachB1OriginalArt\(picture,c\.magicArt\)/);
 assert.match(html,/attachB1OriginalArt\(thumb,card\.magicArt\)/);
 assert.match(html,/const candidates=\[highRes,lowRes\]/);
 assert.match(html,/img\.addEventListener\("error"/);
 assert.match(css,/object-position:50% 32%/);
 const six=new Set(manifest.files.map(x=>x.card_id));
 for(const id of six)assert.ok(html.includes('"'+id+'"'),"six spell choice "+id);
});
