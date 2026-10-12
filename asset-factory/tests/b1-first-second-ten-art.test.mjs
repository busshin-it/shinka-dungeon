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
    "scatter",
    "散弾",
    "first-scatter",
    "b1-auto-scatter.webp",
    "112e960da8f08eb1d682600fc1bf5acafce43fbb7cf9cfce49ec92ff637a1182"
  ],
  [
    "chain",
    "連鎖雷",
    "first-chain",
    "b1-auto-chain.webp",
    "0e84271270db409b837021b807004a4c2da31304a7de1e9577cbf2f02bdd321d"
  ],
  [
    "heal",
    "小治癒",
    "first-heal",
    "b1-auto-heal.webp",
    "b9ae6f3a4dd11aa7582138231ddea2de71fcab66ec5803da0f070be03bad447f"
  ],
  [
    "drain",
    "吸命",
    "first-drain",
    "b1-auto-drain.webp",
    "12be825802f44122a2c46b6872ffafe1cd1d4b81d6b3432162deaba721653c4d"
  ],
  [
    "poison",
    "毒の印",
    "first-poison",
    "b1-auto-poison.webp",
    "fe04212eacb4cd23c7381720dde685cc094dc3d71db4977dcfc6f4ddb39fbec9"
  ],
  [
    "fragile",
    "脆弱の印",
    "second-fragile",
    "b1-fragile.webp",
    "8c1442b65274ff1c47df10d05ab4c1dfa7e62e6602478f0248cc4e7bb2394ec3"
  ],
  [
    "strength",
    "闘魔の印",
    "second-strength",
    "b1-power.webp",
    "80e7cc876ad728ae57ea48e02f1e8989c5a11a758a2697b171188b233d5013ff"
  ],
  [
    "spark",
    "火花",
    "second-spark",
    "b1-spark.webp",
    "d266d74e5f84b96ee590b93850b593b0e5cfa993baa2afed82734d00d68aed9e"
  ],
  [
    "ward",
    "氷の結界",
    "second-ward",
    "b1-ice-barrier.webp",
    "38ee874cd36f2b9e92f00d0223f3b8832c197c276ae4df3fcd9ac17d2f71f1ce"
  ],
  [
    "flow",
    "術式循環",
    "second-flow",
    "b1-cycle.webp",
    "18a91681328abd4aaf9c1d1bb93e49067ee38b44ff0c62e79de1fedfaf556eae"
  ]
];

for(const [id,name,key,filename,sha256] of cards){
 test('B1 original art: '+name+' / '+id,async()=>{
  const match=engine.match(new RegExp('(?:^|\\n)\\s*'+id+':\\{[^\\n]*','m'));
  assert.ok(match,'card ID missing: '+id);
  assert.ok(match[0].includes('magicArt:"'+key+'"'),'art key not registered');
  assert.ok(html.includes('"'+key+'":"'+filename+'"'),'image filename not mapped');
  const full=path.join(root,'v4-1/assets',filename);
  const bytes=await readFile(full);
  const meta=await sharp(bytes).metadata();
  assert.equal(meta.format,'webp');
  assert.equal(meta.width,768);
  assert.equal(meta.height,1024);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256);
  assert.ok((await stat(full)).size>50000);
 });
}
test('B1 shared card rendering retains missing image CSS fallback',()=>{
 assert.match(html,/img\.addEventListener\("error"/);
 assert.match(html,/else img\.remove\(\)/);
});
