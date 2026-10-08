#!/usr/bin/env node
// Read-only production checks. Never generates images, calls an API, or rewrites the game.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
const plain = value => JSON.parse(JSON.stringify(value));
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const check = (ok, message) => { if (!ok) throw Error(message); };
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const ID = /^[a-z][A-Za-z0-9]*$/;
const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ASSET_PATH = /^\.\/assets\/[a-z0-9]+(?:[a-z0-9/-]*[a-z0-9])?\.(webp|png)$/;
const NUMBERS = new Set('cost damage block weaken focus reflect draw heal energy combo weakBonus weakThreshold thresholdBonus breakBlock breakDraw bankBlock emptyWeak emptyBonus bankBonus memoryCap exhaustBlock exhaustReflect prevEmptyBlock nextFocus emptyNextBlock blockDamage transferBlockCap recoverBonus reflectDamageMultiplier reflectDamageCap weakBlockMultiplier weakBlockCap'.split(' '));
const FLAGS = new Set('exhaust consumeWeak consumeBlock consumeReflect recycleAttack'.split(' '));
const STRINGS = new Set(['name', 'family', 'art']);
const PHASES = new Set(['design','reuse-review','image-generation','image-qa','implementation','tests','integration','browser-qa','tool-wait','publish']);

export function loadGame(root = ROOT) {
  const context = {};
  for (const name of ['planning-engine.js', 'fan-card-text.js']) {
    vm.runInNewContext(read(root, 'v4-1/' + name), context, {timeout: 3000, filename: name});
  }
  return {engine: context.ShinkaV43, format: context.ShinkaFanText.format};
}

function definition(value, label, partial = false) {
  check(object(value), `${label}: definition must be an object`);
  if (!partial) for (const key of ['name','cost','family','art']) check(Object.hasOwn(value,key), `${label}: missing ${key}`);
  for (const [key, item] of Object.entries(value)) {
    check(NUMBERS.has(key) || FLAGS.has(key) || STRINGS.has(key), `${label}: unsupported effect ${key}; implement/review its preview, text, play and save tests first`);
    check(NUMBERS.has(key) ? Number.isSafeInteger(item) && item >= 0 : FLAGS.has(key) ? typeof item === 'boolean' : nonempty(item), `${label}.${key}: invalid value`);
  }
  if (!partial && (value.weakBlockMultiplier !== undefined || value.weakBlockCap !== undefined)) {
    check(value.weakBlockMultiplier > 0 && value.weakBlockCap > 0 && value.block > 0 && value.consumeWeak === true && value.damage === undefined && value.weaken === undefined && value.emptyWeak === undefined, `${label}: weakness-to-block requires a positive multiplier/cap/block, consumes weakness, and cannot attack or reapply weakness`);
  }
  if (value.cost !== undefined) check(value.cost <= 5, `${label}: cost exceeds maximum energy`);
}

export function safeAsset(root, name) {
  assetPath(name);
  const app = fs.realpathSync(path.join(root, 'v4-1'));
  const target = path.join(app, name);
  check(fs.existsSync(target), `Missing image: ${name}`);
  const resolved = fs.realpathSync(target);
  check(resolved.startsWith(app + path.sep) && !fs.lstatSync(target).isSymbolicLink() && fs.statSync(target).isFile(), `Image escapes app or is a symlink: ${name}`);
  const bytes = fs.readFileSync(target);
  const webp = bytes.length >= 20 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  const png = bytes.length >= 24 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  check(name.endsWith('.webp') ? webp : png, `Image signature/extension mismatch: ${name}`);
  return bytes;
}

function assetPath(name) {
  check(typeof name === 'string' && ASSET_PATH.test(name) && !name.includes('//'), `Unsafe/local-only asset path: ${name}`);
}

function newAssetDestination(root, name) {
  const app = fs.realpathSync(path.join(root,'v4-1'));
  let candidate = path.join(app,name);
  check(!fs.existsSync(candidate), `finalPath already exists; review/adopt it instead of overwriting: ${name}`);
  // A nonexistent leaf must not make a symlinked parent an unchecked output route.
  while (candidate !== app) {
    if (fs.existsSync(candidate) || fs.lstatSync(candidate,{throwIfNoEntry:false})?.isSymbolicLink()) {
      check(!fs.lstatSync(candidate).isSymbolicLink() && fs.statSync(candidate).isDirectory() && fs.realpathSync(candidate).startsWith(app + path.sep), `Unsafe finalPath parent: ${name}`);
    }
    candidate = path.dirname(candidate);
  }
}

function interpolate(text, values) {
  return text.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_, key) => {
    check(Object.hasOwn(values,key), `Unknown text value {${key}}`);
    return String(values[key]);
  });
}

function expectSubset(actual, expected, label) {
  check(object(expected), `${label}: expected object`);
  for (const [key, value] of Object.entries(expected)) {
    check(Object.hasOwn(actual,key), `${label}: missing ${key}`);
    assert.deepEqual(plain(actual[key]), value, `${label}.${key}`);
  }
}

// A real, fixed-seed battle with synthetic zones. Restore validation stays enabled.
function fixture(engine, id, scenario = {}) {
  const game = engine.createGame(engine.seededRandom(27), {ruleset:'classic'});
  game.start();
  const save = plain(game.exportSave()), s = save.state;
  const allowed = new Set(['turn','energy','block','reflect','weaken','focus','pendingBlock','pendingFocus','prevEndEmpty','prevLastAttack','usedExhaustThisTurn','interrupted','turnDamage','spellCount']);
  check(object(scenario.state || {}), `${id}: state must be an object`);
  for (const key of Object.keys(scenario.state || {})) check(allowed.has(key), `${id}: unsupported fixture state ${key}`);
  Object.assign(s, {energy:5, flags:{}, block:0, reflect:0, focus:0, weaken:0}, scenario.state);
  s.hand = [id]; s.discard = [...(scenario.discard || [])]; s.exhaust = [];
  check(s.discard.length <= 9 && s.discard.every(x => typeof x === 'string' && engine.card(x)), `${id}: invalid fixture discard`);
  s.draw = Array(9 - s.discard.length).fill('guard');
  s.deck = [...s.hand,...s.draw,...s.discard];
  check(game.restoreSave(save), `${id}: synthetic fixture failed real save validation`);
  return game;
}

function runCase(engine, format, spec, scenario) {
  const id = spec.id + (scenario.variant === 'upgrade' ? '+' : '');
  const game = fixture(engine,id,scenario), before = plain(game.exportSave());
  const preview = plain(game.previewCard(0));
  assert.deepEqual(plain(game.previewCard(0)), preview, `${id}: stable preview`);
  assert.deepEqual(plain(game.exportSave()), before, `${id}: preview must not mutate state or RNG`);
  expectSubset(preview,scenario.preview,`${id}/${scenario.name}/preview`);
  const text = format(preview), values = {...engine.card(id),...preview};
  for (const [field, patterns] of Object.entries(scenario.text)) {
    for (const pattern of patterns) check(text[field].includes(interpolate(pattern, values)), `${id}/${scenario.name}: ${field} missing ${interpolate(pattern,values)}`);
  }
  const restored = engine.createGame();
  check(restored.restoreSave(before), `${id}: save roundtrip failed`);
  assert.deepEqual(plain(restored.exportSave()), before, `${id}: lossless restore`);
  check(game.play(0), `${id}/${scenario.name}: play failed`);
  check(restored.play(0), `${id}: restored play failed`);
  assert.deepEqual(plain(game.exportSave()), plain(restored.exportSave()), `${id}: deterministic next action after restore`);
  expectSubset(game.snapshot(),scenario.after,`${id}/${scenario.name}/after`);
  const s = game.snapshot();
  assert.deepEqual([...s.hand,...s.draw,...s.discard,...s.exhaust].sort(), [...s.deck].sort(), `${id}: card multiset`);
  const after = plain(game.exportSave());
  check(restored.restoreSave(after), `${id}: post-play save must restore`);
  assert.deepEqual(plain(restored.exportSave()),after,`${id}: post-play restore must be lossless`);
}

function imageAttributes(html) {
  return [...html.matchAll(/<img\b[^>]*>/g)].map(([tag]) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,k,v]) => [k,v])));
}

export function validateSet(spec, {root = ROOT, stage = 'integrated'} = {}) {
  check(['draft','integrated','release'].includes(stage), `Unknown stage: ${stage}`);
  check(object(spec) && spec.schemaVersion === 1 && typeof spec.id === 'string' && SLUG.test(spec.id), 'Expected schemaVersion:1 and a kebab-case set id');
  check(nonempty(spec.title) && nonempty(spec.theme), 'Set title and theme are required');
  check(spec.scope === undefined || ['single-card-pilot','two-card-pilot'].includes(spec.scope), 'Unknown production scope');
  const pilot = spec.scope !== undefined, pilotSize = spec.scope === 'single-card-pilot' ? 1 : 2;
  check(Array.isArray(spec.cards) && (pilot ? spec.cards.length === pilotSize : spec.cards.length >= 4 && spec.cards.length <= 6), pilot ? `A card pilot contains exactly ${pilotSize} cards` : 'A production set contains 4–6 cards');
  check(Array.isArray(spec.assets) && spec.assets.length === spec.cards.length + (pilot ? 0 : 1), pilot ? 'A card pilot contains exactly one image per card' : 'A production set contains one NPC image and one image per card');
  check(object(spec.style) && ['world','palette','medium','composition','avoid'].every(x => nonempty(spec.style[x])), 'Shared prompt needs world, palette, medium, composition and avoid');
  const assetKeys = new Set(), cardIds = new Set(), outputs = new Set();
  for (const asset of spec.assets) {
    check(object(asset) && typeof asset.key === 'string' && SLUG.test(asset.key) && !assetKeys.has(asset.key), `Duplicate/invalid asset key: ${asset?.key}`); assetKeys.add(asset.key);
    check(['card','npc'].includes(asset.kind) && ['placeholder','final','reuse'].includes(asset.status), `${asset.key}: invalid kind/status`);
    check(nonempty(asset.subject) && nonempty(asset.path), `${asset.key}: subject and path required`);
    assetPath(asset.path);
    if (asset.status === 'placeholder') {
      assetPath(asset.finalPath);
      check(!outputs.has(asset.finalPath) && !spec.assets.some(a => a.path === asset.finalPath), `${asset.key}: finalPath must be unique and separate from every displayed image`);
      newAssetDestination(root,asset.finalPath);
      outputs.add(asset.finalPath);
    }
    check(object(asset.alt) && ['decorative','text'].includes(asset.alt.mode) && typeof asset.alt.text === 'string', `${asset.key}: alt policy required`);
    check(asset.alt.mode === 'decorative' ? asset.alt.text === '' : nonempty(asset.alt.text), `${asset.key}: alt text does not match policy`);
    check(asset.kind !== 'npc' || asset.alt.mode === 'text', `${asset.key}: NPC requires descriptive alt text`);
    check(object(asset.provenance) && ['project-generated','existing-project','third-party','unknown'].includes(asset.provenance.kind) && nonempty(asset.provenance.evidence), `${asset.key}: provenance evidence required`);
    if (asset.status === 'reuse') check(nonempty(asset.reuseFrom), `${asset.key}: reuseFrom required`);
    if (stage !== 'draft') {
      const bytes = safeAsset(root,asset.path);
      const files = JSON.parse(read(root,'tools/astral-files.json'));
      check(files.includes(asset.path), `${asset.key}: missing from release/cache manifest`);
      if (asset.status !== 'placeholder') check(asset.sha256 === sha256(bytes), `${asset.key}: image changed since visual QA; check pixels and refresh SHA-256`);
    }
    if (stage === 'release') {
      check(asset.status !== 'placeholder', `${asset.key}: placeholder cannot ship`);
      check(asset.visualQa?.status === 'passed' && nonempty(asset.visualQa.note), `${asset.key}: visual QA required`);
      check(asset.provenance.kind !== 'unknown', `${asset.key}: unknown source cannot ship`);
      if (asset.provenance.kind === 'third-party') check(nonempty(asset.provenance.license) && nonempty(asset.provenance.sourceUrl) && asset.provenance.rightsReviewed === true, `${asset.key}: third-party source/license review required`);
    }
  }
  check(spec.assets.filter(x => x.kind === 'npc').length === (pilot ? 0 : 1), pilot ? 'A card pilot does not introduce an NPC' : 'Exactly one NPC image required');
  const {engine,format} = loadGame(root);
  const images = imageAttributes(read(root,'v4-1/planning.html'));
  const gameSource = read(root,'v4-1/planning-game.js');
  const usedAssets = new Set();
  let scenarios = 0;
  for (const card of spec.cards) {
    check(object(card) && typeof card.id === 'string' && ID.test(card.id) && !cardIds.has(card.id), `Duplicate/invalid card id: ${card?.id}`); cardIds.add(card.id);
    definition(card.base,card.id); definition(card.upgrade,card.id + '+',true);
    check(card.base.art === card.id, `${card.id}: use a stable dedicated art key (reuse the image path when appropriate)`);
    check(nonempty(card.asset), `${card.id}: card asset key required`);
    const asset = spec.assets.find(x => x.key === card.asset && x.kind === 'card');
    check(asset && !usedAssets.has(card.asset), `${card.id}: missing/duplicate card asset`); usedAssets.add(card.asset);
    check(Array.isArray(card.textIncludes) && card.textIncludes.length > 0 && card.textIncludes.every(nonempty), `${card.id}: description checks required`);
    check(Array.isArray(card.cases) && card.cases.length >= 2 && ['base','upgrade'].every(variant => card.cases.some(c => c.variant === variant)), `${card.id}: base and upgrade cases required`);
    for (const c of card.cases) {
      check(nonempty(c.name) && ['base','upgrade'].includes(c.variant) && object(c.preview) && Object.keys(c.preview).length && object(c.after) && Object.keys(c.after).length, `${card.id}: case name, variant, preview and after assertions required`);
      check(object(c.text) && Object.entries(c.text).length > 0 && Object.entries(c.text).every(([k,v]) => ['summary','rules'].includes(k) && Array.isArray(v) && v.length && v.every(nonempty)), `${card.id}: case must check visible summary/rules`);
    }
    if (stage === 'draft') continue;
    assert.deepEqual(plain(engine.CARDS[card.id] ?? null), card.base, `${card.id}: metadata differs from live card definition`);
    for (const variant of ['', '+']) {
      const live = engine.card(card.id + variant), expected = {...card.base,...(variant ? card.upgrade : {})};
      // Upgrade display names get the engine's suffix. All effect fields must match.
      if (variant && !Object.hasOwn(card.upgrade,'name')) expected.name += '＋';
      const authored = Object.fromEntries(Object.entries(live).filter(([key]) => !['id','base','isAttack','upgraded','text'].includes(key)));
      assert.deepEqual(plain(authored),expected,`${card.id + variant}: complete effect definition differs`);
      for (const pattern of card.textIncludes) check(live.text.includes(interpolate(pattern,live)), `${card.id + variant}: description missing ${interpolate(pattern,live)}`);
      for (let energy = 0; energy < live.cost; energy++) {
        const g = fixture(engine,live.id,{state:{energy}}), before = plain(g.exportSave());
        check(g.play(0) === false, `${live.id}: insufficient energy must reject`);
        assert.deepEqual(plain(g.exportSave()),before,`${live.id}: rejected play must be atomic`);
      }
      if (live.cost === 0) check(fixture(engine,live.id,{state:{energy:0}}).play(0), `${live.id}: zero-cost play at zero energy`);
    }
    const mapped = images.filter(x => x['data-card-art'] === card.id);
    check(mapped.length === 1 && mapped[0].src === asset.path, `${card.id}: missing/ambiguous/stale image mapping`);
    check(Object.hasOwn(mapped[0],'alt') && mapped[0].alt === asset.alt.text, `${card.id}: alt differs from manifest`);
    // Current renderer intentionally treats art as decorative; the full name/rules label the button.
    check(asset.alt.mode === 'decorative', `${card.id}: renderer currently supports decorative card art only`);
    check(gameSource.includes('aria-label="${accessibleCard(id, game.previewCard(i))}"') && gameSource.includes('aria-label="${card(id).name}。魔力${card(id).cost}。${card(id).text}"'), 'Accessible hand/reward labels changed; review the DOM and update this static guard');
    for (const scenario of card.cases) { runCase(engine,format,card,scenario); scenarios++; }
  }
  if (stage !== 'draft') {
    const npc = spec.assets.find(x => x.kind === 'npc');
    if (!pilot) check(imageAttributes(gameSource).some(x => x.src === npc.path && x.alt === npc.alt.text), `${npc.key}: NPC path/alt missing from renderer`);
  }
  return {set:spec.id,stage,cards:spec.cards.length,assets:spec.assets.length,scenarios};
}

export function promptManifest(spec) {
  validateSet(spec,{stage:'draft'});
  return {set:spec.id,mode:'one-independent-image-per-job',notes:'Only placeholder assets need final-art generation. Reuse and completed final assets are omitted. Dispatch only approved jobs. No API calls are made.',jobs:spec.assets.filter(a => a.status === 'placeholder').map(a => ({
    id:a.key,kind:a.kind,output:a.finalPath,needsGeneration:true,
    prompt:[`Use case: stylized-concept.`, `Asset type: one ${a.kind === 'npc' ? 'NPC portrait' : 'spell card illustration'} for 蒼星の回廊.`, `Primary request: ${a.subject}`, `Scene/backdrop: ${spec.style.world}`, `Style/medium: ${spec.style.medium}`, `Color palette: ${spec.style.palette}`, `Composition/framing: ${a.composition || spec.style.composition}`, `Constraints: one asset, no card frame, no text, no UI, no watermark.`, `Avoid: ${spec.style.avoid}`].join('\n')
  }))};
}

// Separate summed service time from the union of overlapping observed intervals.
export function timingSummary(log) {
  check(log.schemaVersion === 1 && Array.isArray(log.intervals), 'Timing log expects schemaVersion:1 and intervals');
  const intervals = log.intervals.map(row => {
    check(PHASES.has(row.phase) && nonempty(row.owner) && nonempty(row.id), 'Timing interval needs a known phase, owner and id');
    for (const key of ['start','end']) check(typeof row[key] === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(row[key]) && Number.isFinite(Date.parse(row[key])), `${row.id}: timezone-qualified ${key} required`);
    const start = Date.parse(row.start), end = Date.parse(row.end);
    check(end >= start, `${row.id}: end before start`);
    return {...row,startMs:start,endMs:end,seconds:(end-start)/1000};
  });
  check(new Set(intervals.map(x=>x.id)).size === intervals.length, 'Duplicate timing interval id');
  function union(rows) {
    let end = -Infinity, total = 0;
    for (const x of [...rows].sort((a,b)=>a.startMs-b.startMs)) { total += Math.max(0,x.endMs-Math.max(end,x.startMs)); end=Math.max(end,x.endMs); }
    return total/1000;
  }
  const phases = Object.fromEntries([...new Set(intervals.map(x=>x.phase))].map(phase => { const rows=intervals.filter(x=>x.phase===phase); return [phase,{calls:rows.length,summedSeconds:rows.reduce((n,x)=>n+x.seconds,0),activeWallSeconds:union(rows)}]; }));
  return {intervals:intervals.length,elapsedSeconds:intervals.length ? (Math.max(...intervals.map(x=>x.endMs))-Math.min(...intervals.map(x=>x.startMs)))/1000 : 0,activeWallSeconds:union(intervals),phases,note:'Observed intervals only. Elapsed time includes gaps; overlapping work is never summed as wall time. No speedup forecast.'};
}

function main(args) {
  const [command,input,stage,...extra] = args;
  check(!extra.length, 'Too many arguments');
  if (command === 'catalog') {
    check(!input, 'catalog takes no arguments');
    const {engine}=loadGame();
    return Object.keys(engine.CARDS).map(id => ({id,base:plain(engine.CARDS[id]),upgrade:Object.fromEntries(Object.keys(engine.CARDS[id]).filter(k=>engine.card(id+'+')[k]!==engine.CARDS[id][k]).map(k=>[k,engine.card(id+'+')[k]]))}));
  }
  check(['validate','prompts','timing'].includes(command) && input, 'Usage: astral-card-production.mjs catalog | validate SET.json [draft|integrated|release] | prompts SET.json | timing LOG.json');
  const value=JSON.parse(fs.readFileSync(input,'utf8'));
  if (command === 'validate') return validateSet(value,{stage:stage || 'integrated'});
  check(!stage, `${command} takes one input file`);
  return command === 'prompts' ? promptManifest(value) : timingSummary(value);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(main(process.argv.slice(2)),null,2)); }
  catch (error) { console.error(`Card production check failed: ${error.message}`); process.exitCode=1; }
}
