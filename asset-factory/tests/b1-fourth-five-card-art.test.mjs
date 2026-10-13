import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const root=process.cwd();
const engine=await readFile(path.join(root,'v4-1/underground-b1-engine.mjs'),'utf8');
const html=await readFile(path.join(root,'v4-1/underground-b1-playtest.html'),'utf8');
const cards=[
  [
    "frostBreak",
    "霜砕き",
    "fourth-frost-shatter",
    "b1-frost-shatter.webp",
    "c8745bda76e8c6a3c7224623e69dcd84f8fd8a00ab56341e233b8fe1e49860e1"
  ],
  [
    "lingeringPoison",
    "余毒の頁",
    "fourth-toxic-page",
    "b1-toxic-page.webp",
    "e5bdb55880929410a99d38bc8840ded07e0480ce8198ac0c5f1193bb0d2bb732"
  ],
  [
    "darkBolt",
    "闇弾",
    "dark",
    "b1-dark-bolt.webp",
    "761dee46e70844b902d695229169768f74da7398a01159fb70c35294a2c1aca4"
  ],
  [
    "abyssBolt",
    "奈落弾",
    "abyss",
    "b1-abyss-bolt.webp",
    "9f6fef3f08fd790dd8e59f8f07beedc47dde838e8d90152f2cdc16b8a2d14ac9"
  ],
  [
    "iceSpear",
    "氷槍",
    "ice",
    "b1-ice-lance.webp",
    "0eda0ddeb014ac7e01c46a67b2f6d1f91d5d1cfbdbd543251372a84b2e6ac2a1"
  ]
];

test('fourth B1 card artwork: unique card IDs, keys and files',()=>{
 assert.equal(cards.length,5);
 for(const ix of [0,2,3])assert.equal(new Set(cards.map(c=>c[ix])).size,5);
});
for(const [id,name,key,filename,expectedSHA] of cards){
 test('B1 art: '+name+' ('+id+')',async()=>{
  const match=engine.match(new RegExp('(?:^|\\n)\\s*'+id+':\\{[^\\n]*','m'));
  assert.ok(match,'card missing: '+id);
  assert.ok(match[0].includes('magicArt:"'+key+'"'),'art key missing for '+id);
  assert.ok(html.includes('"'+key+'":"'+filename+'"'),'HQ mapping missing for '+id);
  const file=path.join(root,'v4-1/assets',filename);
  const data=await readFile(file);
  const meta=await sharp(data).metadata();
  assert.equal(meta.format,'webp');
  assert.equal(meta.width,768);
  assert.equal(meta.height,1024);
  assert.equal(createHash('sha256').update(data).digest('hex'),expectedSHA);
  const size=(await stat(file)).size;
  assert.ok(size>50000 && size<800000,'unexpected image size: '+filename);
 });
}
test('B1 shared rendering preserves CSS fallback when image loading fails',()=>{
 assert.match(html,/img\.addEventListener\("error"/);
 assert.match(html,/else img\.remove\(\)/);
});
