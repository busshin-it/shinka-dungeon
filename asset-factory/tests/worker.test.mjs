import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, selectJobs } from '../worker.mjs';
import { buildPrompt } from '../lib/prompt.mjs';
import { inspectPng, structuralQa } from '../lib/png.mjs';

test('parseArgs reads batch controls', () => {
  assert.deepEqual(parseArgs(['--count','5','--asset','x','--max-retries','3','--dry-run']), { count:5, asset:'x', maxRetries:3, dryRun:true });
});

test('selectJobs only returns pending work', () => {
  const q={jobs:[{asset_id:'a',status:'adopted'},{asset_id:'b',status:'waiting'},{asset_id:'c',status:'needs_fix'}]};
  assert.deepEqual(selectJobs(q,{count:2,asset:''}).map(x=>x.asset_id),['b','c']);
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
