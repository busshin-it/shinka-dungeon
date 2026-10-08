import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {execFileSync,spawnSync} from 'node:child_process';
import {ROOT,loadGame,validateSet,promptManifest,timingSummary,safeAsset} from '../tools/astral-card-production.mjs';

const example = () => JSON.parse(fs.readFileSync(new URL('../design/production/noa-example.json',import.meta.url),'utf8'));
const change = edit => { const value=example(); edit(value); return value; };
function fails(edit,pattern,options) { assert.throws(()=>validateSet(change(edit),options),pattern); }
function scratch(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'astral-production-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'v4-1/assets'),{recursive:true}); fs.mkdirSync(path.join(root,'tools'));
  for(const name of ['planning-engine.js','fan-card-text.js','planning-game.js','planning.html']) fs.copyFileSync(path.join(ROOT,'v4-1',name),path.join(root,'v4-1',name));
  fs.copyFileSync(path.join(ROOT,'tools/astral-files.json'),path.join(root,'tools/astral-files.json'));
  for(const a of example().assets) fs.copyFileSync(path.join(ROOT,'v4-1',a.path),path.join(root,'v4-1',a.path));
  return root;
}
function editFile(root,name,edit) { const file=path.join(root,name);fs.writeFileSync(file,edit(fs.readFileSync(file,'utf8'))); }

test('existing Noa set passes release metadata, image references, 9 behavior/text/save scenarios',()=>{
  assert.deepEqual(validateSet(example(),{stage:'release'}),{set:'noa-example',stage:'release',cards:4,assets:5,scenarios:9});
});
test('reuse catalog still names the inspected asset bytes and actual live card mappings',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'design/production/reusable-art.json'),'utf8'));
  const {engine}=loadGame();
  const actualCards=Object.entries(engine.CARDS).map(([card_id,c])=>({card_id,name:c.name,family:c.family,art_key:c.art}));
  assert.deepEqual(catalog.current_cards,actualCards);
  assert.equal(catalog.summary.planning_cards,actualCards.length);
  assert.equal(catalog.summary.active_art_keys,new Set(actualCards.map(c=>c.art_key)).size);
  assert.equal(catalog.entries.length,catalog.summary.pixel_inspected_entries);
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'v4-1/card-art-data.js'),'utf8'),context,{timeout:3000});
  let embedded=0;
  for(const entry of catalog.entries) {
    for(const asset of [entry.asset,entry.runtime_asset].filter(Boolean)) {
      assert.match(asset.path,/^(?:v4-1\/assets|assets\/(?:cards|runtime\/cards))\/[a-zA-Z0-9_-]+\.(?:png|webp)$/);
      const bytes=fs.readFileSync(path.join(ROOT,asset.path));
      assert.equal(bytes.length,asset.bytes,asset.path+' byte count');
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.path+' reviewed pixels changed');
    }
    if(entry.embedded_reference) {
      const ref=entry.embedded_reference,uri=context.window.CARD_ART_DATA[ref.key];
      assert.match(uri,/^data:image\/webp;base64,/);
      const bytes=Buffer.from(uri.split(',')[1],'base64');
      assert.deepEqual(bytes,fs.readFileSync(path.join(ROOT,entry.runtime_asset.path)),ref.key+' embedded/runtime identity');
      assert.equal(bytes.length,ref.decoded_bytes);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),ref.sha256);
      embedded++;
    }
    if(entry.art_key && entry.current_cards.length) {
      assert.deepEqual(entry.current_cards,actualCards.filter(c=>c.art_key===entry.art_key).map(c=>c.card_id),entry.art_key+' live mapping');
    }
  }
  assert.equal(embedded,catalog.validation.embedded_runtime_byte_matches);
});
test('draft checks set shape, field types, supported effects, and required base/upgrade cases',()=>{
  fails(s=>delete s.id,/kebab-case set id/,{stage:'draft'});
  fails(s=>delete s.assets[0].key,/invalid asset key/,{stage:'draft'});
  fails(s=>delete s.cards[0].id,/invalid card id/,{stage:'draft'});
  fails(s=>delete s.cards[0].asset,/card asset key required/,{stage:'draft'});
  fails(s=>s.id=false,/kebab-case set id/,{stage:'draft'});
  fails(s=>s.cards.pop(),/4–6/,{stage:'draft'});
  fails(s=>{s.assets[0].kind='npc';s.assets[0].alt={mode:'text',text:'NPC'};},/Exactly one NPC/,{stage:'draft'});
  fails(s=>s.cards[1].id=s.cards[0].id,/Duplicate\/invalid card/,{stage:'draft'});
  fails(s=>s.cards[0].base.damage=-1,/invalid value/,{stage:'draft'});
  fails(s=>s.cards[0].base.nextTurnMana=1,/unsupported effect/,{stage:'draft'});
  fails(s=>s.cards[0].base.exhaust='yes',/invalid value/,{stage:'draft'});
  fails(s=>s.cards[0].cases=s.cards[0].cases.filter(c=>c.variant==='base'),/base and upgrade/,{stage:'draft'});
  fails(s=>s.cards[0].cases[0].text={},/visible summary/,{stage:'draft'});
});
test('changed numbers, upgrade metadata, displayed text and behavior fail independently',()=>{
  fails(s=>s.cards[1].base.damage=11,/metadata differs/);
  fails(s=>s.cards[1].upgrade.damage=14,/quietComet\+: complete effect definition/);
  fails(s=>s.cards[1].textIncludes=['{damage}ダメージ。追加999'],/description missing/);
  fails(s=>s.cards[0].textIncludes=['{inventedValue}'],/Unknown text value/);
  fails(s=>s.cards[0].cases[0].preview.actualNextBlock=9,/preview.actualNextBlock/);
  fails(s=>s.cards[0].cases[0].after.pendingBlock=9,/after.pendingBlock/);
  fails(s=>s.cards[0].cases[0].text.summary=['次ターン防御99'],/summary missing/);
  fails(s=>s.cards[0].cases[0].state={phase:'reward'},/unsupported fixture state/);
  fails(s=>s.cards[0].cases[0].preview.nonexistent=null,/missing nonexistent/);
});
test('an undeclared extra upgrade effect cannot hide behind partial metadata assertions',t=>{
  const root=scratch(t);
  editFile(root,'v4-1/planning-engine.js',s=>s.replace('if (c.upgraded) {',"if (c.upgraded) { if (c.base === 'quietComet') c.draw = 1;"));
  assert.throws(()=>validateSet(example(),{root,stage:'release'}),/quietComet\+: complete effect definition/);
});
test('a post-play restore that silently drops reserved effects is rejected',t=>{
  const root=scratch(t);
  editFile(root,'v4-1/planning-engine.js',s=>s.replace('s = JSON.parse(JSON.stringify(x));',"s = JSON.parse(JSON.stringify(x)); if (s.stats.played.starRelay) s.pendingBlock = 0;"));
  assert.throws(()=>validateSet(example(),{root,stage:'release'}),/post-play restore must be lossless/);
});
test('release refuses placeholders, missing visual approval and unknown/third-party rights',()=>{
  const placeholder=s=>Object.assign(s.assets[0],{status:'placeholder',finalPath:'./assets/new-relay.webp'});
  assert.equal(validateSet(change(placeholder)).stage,'integrated');
  fails(placeholder,/placeholder cannot ship/,{stage:'release'});
  fails(s=>s.assets[0].visualQa.status='pending',/visual QA/,{stage:'release'});
  fails(s=>s.assets[0].provenance.kind='unknown',/unknown source/,{stage:'release'});
  fails(s=>s.assets[0].provenance.kind='third-party',/source\/license review/,{stage:'release'});
  fails(s=>delete s.assets[0].reuseFrom,/reuseFrom required/);
});
test('image checks reject URLs, missing images, escaping paths, corrupt headers and changed bytes',t=>{
  for(const name of ['https://example.com/card.webp','./assets/../../secret.webp','./assets/a//b.webp','./assets/card.webp?old=1']) fails(s=>s.assets[0].path=name,/Unsafe\/local-only/);
  for(const name of ['../../outside.webp','https://example.com/card.webp']) {
    fails(s=>s.assets[0].path=name,/Unsafe\/local-only/,{stage:'draft'});
    assert.throws(()=>promptManifest(change(s=>{s.assets[0].status='placeholder';s.assets[0].path=name;})),/Unsafe\/local-only/);
  }
  fails(s=>s.assets[0].path='./assets/missing.webp',/Missing image/);
  const root=scratch(t), target=path.join(root,'v4-1/assets/star-relay.webp');
  fs.writeFileSync(target,'not a webp'); assert.throws(()=>validateSet(example(),{root}),/signature\/extension/);
  fs.copyFileSync(path.join(ROOT,'v4-1/assets/star-relay.webp'),target);fs.appendFileSync(target,'changed');
  assert.throws(()=>validateSet(example(),{root}),/changed since visual QA/);
  fs.unlinkSync(target);fs.symlinkSync(path.join(ROOT,'v4-1/assets/star-relay.webp'),target);
  assert.throws(()=>safeAsset(root,'./assets/star-relay.webp'),/escapes app or is a symlink/);
});
test('release/cache membership, image mapping and alt policy are checked against consumers',t=>{
  let root=scratch(t);
  editFile(root,'tools/astral-files.json',s=>JSON.stringify(JSON.parse(s).filter(x=>!x.includes('star-relay'))));
  assert.throws(()=>validateSet(example(),{root}),/release\/cache manifest/);
  root=scratch(t);editFile(root,'v4-1/planning.html',s=>s.replace('data-card-art="starRelay"','data-card-art="obsolete"'));
  assert.throws(()=>validateSet(example(),{root}),/image mapping/);
  root=scratch(t);editFile(root,'v4-1/planning.html',s=>s.replace('data-card-art="starRelay" src="./assets/star-relay.webp" alt=""','data-card-art="starRelay" src="./assets/star-relay.webp"'));
  assert.throws(()=>validateSet(example(),{root}),/alt differs/);
  root=scratch(t);editFile(root,'v4-1/planning-game.js',s=>s.replace('alt="星綴りの司書ノア"','alt=""'));
  assert.throws(()=>validateSet(example(),{root}),/NPC path\/alt/);
});
test('a shared prompt is deterministic, single-asset, and reuse jobs are omitted',()=>{
  assert.deepEqual(promptManifest(example()).jobs,[]);
  const spec=change(s=>{Object.assign(s.assets[0],{status:'placeholder',finalPath:'./assets/new-relay.webp'});s.assets[1].status='final';});
  const manifest=promptManifest(spec);
  assert.equal(manifest.jobs.length,1);
  assert.equal(manifest.jobs[0].needsGeneration,true);
  assert.equal(manifest.jobs[0].output,'./assets/new-relay.webp');
  assert(manifest.jobs[0].prompt.includes(spec.style.palette));
  assert(manifest.jobs[0].prompt.includes(spec.assets[0].subject));
  assert(manifest.jobs[0].prompt.includes('one asset'));
  assert.deepEqual(promptManifest(spec),manifest);
  for(const finalPath of [spec.assets[0].path,'./assets/shatter.webp','../outside.webp']) {
    const bad=structuredClone(spec);bad.assets[0].finalPath=finalPath;assert.throws(()=>promptManifest(bad),/separate from every|already exists|Unsafe/);
  }
  const duplicate=structuredClone(spec);Object.assign(duplicate.assets[1],{status:'placeholder',finalPath:duplicate.assets[0].finalPath});
  assert.throws(()=>promptManifest(duplicate),/finalPath must be unique/);
});
test('a new final image cannot be routed through an existing or broken parent symlink',t=>{
  const root=scratch(t),outside=path.join(root,'outside');fs.mkdirSync(outside);
  const spec=change(s=>Object.assign(s.assets[0],{status:'placeholder',finalPath:'./assets/link/new.webp'}));
  const link=path.join(root,'v4-1/assets/link');fs.symlinkSync(outside,link);
  assert.throws(()=>validateSet(spec,{root,stage:'draft'}),/Unsafe finalPath parent/);
  fs.unlinkSync(link);fs.symlinkSync(path.join(root,'missing'),link);
  assert.throws(()=>validateSet(spec,{root,stage:'draft'}),/Unsafe finalPath parent/);
});
test('timings report overlapping service time separately from elapsed/active wall time',()=>{
  const log={schemaVersion:1,intervals:[
    {id:'a',owner:'artist-a',phase:'image-generation',start:'2026-10-06T12:00:00Z',end:'2026-10-06T12:01:00Z'},
    {id:'b',owner:'artist-b',phase:'image-generation',start:'2026-10-06T12:00:20Z',end:'2026-10-06T12:01:10Z'},
    {id:'c',owner:'integrator',phase:'integration',start:'2026-10-06T12:02:00Z',end:'2026-10-06T12:02:20Z'}
  ]};
  const s=timingSummary(log);
  assert.equal(s.elapsedSeconds,140);assert.equal(s.activeWallSeconds,90);
  assert.deepEqual(s.phases['image-generation'],{calls:2,summedSeconds:110,activeWallSeconds:70});
  const bad=structuredClone(log);bad.intervals[0].end='2026-10-06T11:59:00Z';assert.throws(()=>timingSummary(bad),/end before start/);
  bad.intervals[0].end='2026-10-06T12:01:00';assert.throws(()=>timingSummary(bad),/timezone-qualified/);
  assert.throws(()=>timingSummary({...log,intervals:[log.intervals[0],log.intervals[0]]}),/Duplicate/);
  assert.equal(timingSummary({schemaVersion:1,intervals:[]}).elapsedSeconds,0);
});
test('CLI fails closed on invalid commands and emits portable JSON without writes',()=>{
  const tool=path.join(ROOT,'tools/astral-card-production.mjs');
  const catalog=JSON.parse(execFileSync(process.execPath,[tool,'catalog'],{encoding:'utf8'}));
  assert.equal(catalog.length,62);assert.equal(catalog.find(c=>c.id==='quietComet').upgrade.damage,13);
  const output=JSON.parse(execFileSync(process.execPath,[tool,'validate',path.join(ROOT,'design/production/noa-example.json'),'release'],{encoding:'utf8'}));
  assert.equal(output.scenarios,9);
  for(const args of [['generate'],['catalog','ignored'],['validate',path.join(ROOT,'design/production/noa-example.json'),'oops']]) {
    const result=spawnSync(process.execPath,[tool,...args],{encoding:'utf8'});assert.equal(result.status,1);assert(result.stderr.includes('Card production check failed'));
  }
});

test('Noa postscript passes reuse-only release checks and 10 behavior/text/save scenarios',()=>{
 const spec=JSON.parse(fs.readFileSync(path.join(ROOT,'design/production/noa-postscript.json'),'utf8'));
 assert.deepEqual(validateSet(spec,{stage:'release'}),{set:'noa-postscript',stage:'release',cards:4,assets:5,scenarios:10});
 assert.deepEqual(promptManifest(spec).jobs,[]);
 assert(spec.assets.every(asset=>asset.status==='reuse'));
 const aliases=JSON.parse(fs.readFileSync(path.join(ROOT,'design/production/reusable-art.json'),'utf8')).reuse_aliases;
 for(const [id,original]of Object.entries(aliases)) {
  const card=spec.cards.find(c=>c.id===id),asset=spec.assets.find(a=>a.key===card.asset);
  const html=fs.readFileSync(path.join(ROOT,'v4-1/planning.html'),'utf8');
  const oldPath=html.match(new RegExp(`data-card-art="${original}" src="([^"]+)"`))[1];
  assert.equal(asset.path,oldPath,id+' shares reviewed original image');
 }
});

test('Star Dial set passes release cases, unchanged artwork, explicit enemy mapping and reuse-only jobs',()=>{
 const spec=JSON.parse(fs.readFileSync(path.join(ROOT,'design/production/star-dial.json'),'utf8'));
 assert.deepEqual(validateSet(spec,{stage:'release'}),{set:'star-dial',stage:'release',cards:4,assets:5,scenarios:10});
 assert.deepEqual(promptManifest(spec).jobs,[]);
 const {engine}=loadGame();assert.deepEqual(JSON.parse(JSON.stringify(engine.ENEMIES[spec.encounter.id])),spec.encounter.definition);
 const art=spec.encounter.art,bytes=safeAsset(ROOT,art.path);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),art.sha256);
 const html=fs.readFileSync(path.join(ROOT,'v4-1/planning.html'),'utf8');assert(html.includes(`data-art="starDial" src="${art.path}" alt=""`));
 assert(JSON.parse(fs.readFileSync(path.join(ROOT,'tools/astral-files.json'))).includes(art.path));
 const aliases=JSON.parse(fs.readFileSync(path.join(ROOT,'design/production/reusable-art.json'))).star_dial_aliases;
 for(const [id,original]of Object.entries(aliases)){const card=spec.cards.find(c=>c.id===id),asset=spec.assets.find(a=>a.key===card.asset);assert.equal(asset.path,html.match(new RegExp(`data-card-art="${original}" src="([^"]+)"`))[1]);}
});
