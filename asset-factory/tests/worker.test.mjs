import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, selectJobs, decideFailureAction, hasAttemptBudget, alphaCoverageIssues, autoFitTransparentSubject } from '../worker.mjs';
import { buildPrompt } from '../lib/prompt.mjs';
import { inspectPng, structuralQa } from '../lib/png.mjs';
import { removeChromaKey, alphaStats } from '../lib/chroma.mjs';
import sharp from 'sharp';

test('parseArgs reads batch controls', () => {
  assert.deepEqual(parseArgs(['--count','5','--asset','x','--max-retries','3','--max-total-attempts','9','--dry-run']), { count:5, asset:'x', maxRetries:3, maxTotalAttempts:9, autoRequeue:true, dryRun:true });
});

test('selectJobs only returns pending work', () => {
  const q={jobs:[{asset_id:'a',status:'adopted'},{asset_id:'b',status:'waiting'},{asset_id:'c',status:'needs_fix'}]};
  assert.deepEqual(selectJobs(q,{count:2,asset:''}).map(x=>x.asset_id),['b']);
});

test('prompt forbids sheets and requests transparency', () => {
  const q={project:'X',art_direction:'dark gothic'};
  const j={name:'Enemy',type:'enemy',prompt:'one knight',transparent:true,negative:['text']};
  const p=buildPrompt(q,j);
  assert.match(p,/ONE enemy/i);
  assert.match(p,/transparent alpha/i);
  assert.match(p,/contact sheet/i);
});

test('inspectPng reads dimensions and alpha color type', () => {
  const b=Buffer.alloc(45);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(b,0);
  b.writeUInt32BE(13,8);
  b.write('IHDR',12,'ascii');
  b.writeUInt32BE(1024,16);
  b.writeUInt32BE(1536,20);
  b[24]=8;
  b[25]=6;
  b.writeUInt32BE(0,33);
  b.write('IEND',37,'ascii');
  const info=inspectPng(b);
  assert.equal(info.valid,true);
  assert.equal(info.width,1024);
  assert.equal(info.height,1536);
  assert.equal(info.hasAlpha,true);
  const qa=structuralQa({transparent:true,aspect_ratio:'2:3'},b);
  assert.equal(qa.pass,true);
});


test('self-healing requeues retryable failures before total attempt cap', () => {
  const action = decideFailureAction(
    { attempts: 3 },
    { autoRequeue: true, maxTotalAttempts: 8 },
    { retryable: true }
  );
  assert.deepEqual(action, { status:'queued', requeue:true, exhausted:false, manual:false });
});

test('self-healing escalates only after total attempt cap', () => {
  const action = decideFailureAction(
    { attempts: 8 },
    { autoRequeue: true, maxTotalAttempts: 8 },
    { retryable: true }
  );
  assert.deepEqual(action, { status:'needs_fix', requeue:false, exhausted:true, manual:true });
});

test('non-retryable API failures go to manual review', () => {
  const action = decideFailureAction(
    { attempts: 1 },
    { autoRequeue: true, maxTotalAttempts: 8 },
    { retryable: false }
  );
  assert.equal(action.manual, true);
  assert.equal(action.requeue, false);
});


test('needs_fix jobs stay parked and are not selected for automatic runs', () => {
  const q={jobs:[
    {asset_id:'manual',status:'needs_fix'},
    {asset_id:'queued',status:'queued'},
    {asset_id:'waiting',status:'waiting'}
  ]};
  assert.deepEqual(selectJobs(q,{count:5,asset:''}).map(x=>x.asset_id),['queued','waiting']);
});


test('awaiting_human jobs are not selected for automatic generation', () => {
  const q={jobs:[
    {asset_id:'review',status:'awaiting_human'},
    {asset_id:'queued',status:'queued'}
  ]};
  assert.deepEqual(selectJobs(q,{count:5,asset:''}).map(x=>x.asset_id),['queued']);
});


test('selectJobs respects numeric priority for automatic runs', () => {
  const q={jobs:[
    {asset_id:'later',status:'queued',priority:50},
    {asset_id:'first',status:'queued',priority:10},
    {asset_id:'middle',status:'waiting',priority:30}
  ]};
  assert.deepEqual(selectJobs(q,{count:3,asset:''}).map(x=>x.asset_id),['first','middle','later']);
});


test('hard total attempt cap prevents extra image calls', () => {
  assert.equal(hasAttemptBudget({attempts:7},{maxTotalAttempts:8}), true);
  assert.equal(hasAttemptBudget({attempts:8},{maxTotalAttempts:8}), false);
  assert.equal(hasAttemptBudget({attempts:10},{maxTotalAttempts:8}), false);
});


test('alpha coverage guard rejects nearly erased transparent candidates', () => {
  const issues = alphaCoverageIssues(
    { transparent:true, min_visible_coverage:0.08 },
    { transparent_ratio:0.996 }
  );
  assert.equal(issues.length, 1);
  assert.match(issues[0], /可視領域/);

  assert.deepEqual(
    alphaCoverageIssues(
      { transparent:true, min_visible_coverage:0.08 },
      { transparent_ratio:0.80 }
    ),
    []
  );
});


test('green-only chroma removal preserves dark subject pixels', async () => {
  const width = 64, height = 64, channels = 4;
  const raw = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const subject = x >= 20 && x < 44 && y >= 16 && y < 48;
      raw[i] = subject ? 10 : 0;
      raw[i+1] = subject ? 12 : 255;
      raw[i+2] = subject ? 18 : 0;
      raw[i+3] = 255;
    }
  }
  const png = await sharp(raw, { raw: { width, height, channels } }).png().toBuffer();
  const out = await removeChromaKey(png);
  const stats = await alphaStats(out);
  const visible = 1 - stats.transparent_ratio;
  assert.ok(visible > 0.15, 'dark subject should remain visible');
  assert.ok(visible < 0.30, 'green background should be removed');
});


test('auto-fit enlarges a small transparent subject without changing canvas size', async () => {
  const width = 100, height = 100, channels = 4;
  const raw = Buffer.alloc(width * height * channels);
  for (let y = 40; y < 60; y++) {
    for (let x = 42; x < 58; x++) {
      const i = (y * width + x) * channels;
      raw[i] = 20;
      raw[i+1] = 30;
      raw[i+2] = 40;
      raw[i+3] = 255;
    }
  }
  const png = await sharp(raw, { raw: { width, height, channels } }).png().toBuffer();
  const fitted = await autoFitTransparentSubject(png, { target_width_ratio:0.60, target_height_ratio:0.70 });
  const meta = await sharp(fitted.buffer).metadata();
  const stats = await alphaStats(fitted.buffer);
  assert.equal(meta.width, 100);
  assert.equal(meta.height, 100);
  assert.ok(fitted.output_subject.width >= 50);
  assert.ok((1 - stats.transparent_ratio) > 0.20);
});
