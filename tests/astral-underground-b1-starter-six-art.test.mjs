import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CARDS,STARTER,createB1Game } from "../v4-1/underground-b1-engine.mjs";

const manifest=JSON.parse(readFileSync(new URL("../design/b1-starter-six-hq-manifest.json",import.meta.url),"utf8"));
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-fire.css",import.meta.url),"utf8");
const cardByName=new Map(manifest.art.map(x=>[x.card_id,x]));

test("six approved card images are unique, registered and match original exact hashes",()=>{
 assert.equal(manifest.art.length,6);
 assert.deepEqual(manifest.dimensions,[768,1024]);
 assert.equal(new Set(manifest.art.map(x=>x.filename)).size,6);
 assert.deepEqual(new Set(manifest.art.map(x=>x.card_id)),new Set(["spellblade","echoGuard","bolt","lightning","frost","guard"]));
 for(const art of manifest.art){
  assert.equal(CARDS[art.card_id].name,art.name);
  assert.equal(CARDS[art.card_id].magicArt,art.magic_art);
  assert.ok(html.includes('"'+art.magic_art+'":"'+art.filename+'"'),art.magic_art+" mapping");
  const bytes=readFileSync(new URL("../v4-1/assets/"+art.filename,import.meta.url));
  assert.equal(bytes.length,art.bytes,art.filename+" size");
  assert.equal(createHash("sha256").update(bytes).digest("hex"),art.sha256,art.filename+" approved source");
  assert.equal(bytes.toString("ascii",0,4),"RIFF");
  assert.equal(bytes.toString("ascii",8,12),"WEBP");
  assert.equal(bytes.toString("ascii",12,16),"VP8 ");
  assert.equal(bytes.readUInt16LE(26)&0x3fff,768,art.filename+" width");
  assert.equal(bytes.readUInt16LE(28)&0x3fff,1024,art.filename+" height");
 }
});

test("the familiar opening deck and spell stats have not changed",()=>{
 assert.deepEqual(STARTER,["bolt","bolt","bolt","bolt","guard","guard","guard","guard","break"]);
 assert.equal(CARDS.bolt.damage,6);
 assert.equal(CARDS.lightning.damage,13);
 assert.equal(CARDS.frost.damage,3);assert.equal(CARDS.frost.weaken,2);
 assert.equal(CARDS.guard.block,5);
 assert.equal(CARDS.spellblade.damage,7);assert.equal(CARDS.spellblade.blockAfterSpell,4);
 assert.equal(CARDS.echoGuard.block,4);assert.equal(CARDS.echoGuard.afterAttackDraw,2);
 assert.equal(Object.keys(CARDS).length,77);
 const game=createB1Game({seed:17});
 assert.deepEqual(game.snapshot().deck,STARTER);
 assert.equal(cardByName.get("bolt").magic_art,"starter-bolt");
 assert.equal(cardByName.get("guard").magic_art,"starter-guard");
});

test("all six images reuse the hand/reward/preview and shop paths with safe fallback",()=>{
 assert.match(html,/attachB1OriginalArt\(picture,c\.magicArt\)/);
 assert.match(html,/const card=getB1Card\(item\.id\),b=cardButton\(item\.id\)/);
 assert.match(html,/const candidates=\[highRes,lowRes\]/);
 assert.match(html,/else img\.remove\(\)/);
 assert.match(html,/img\.className="b1-original-elemental-img b1-original-card-img"/);
 assert.match(css,/b1-magic-art--starter-bolt/);
 assert.match(css,/b1-magic-art--starter-guard/);
 assert.match(css,/b1-magic-art--starter-defense/);
 assert.match(css,/b1-magic-art--starter-frost/);
 assert.match(css,/b1-magic-art--starter-lightning/);
 const sizeCSS=readFileSync(new URL("../v4-1/underground-b1-card-visibility.css",import.meta.url),"utf8");
 assert.match(sizeCSS,/object-position:50% 32%/);
});
