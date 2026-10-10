import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const original=readFileSync(new URL('../v4-1/six-paths-pilot.html',import.meta.url),'utf8');
const b1=readFileSync(new URL('../v4-1/underground-b1-playtest.html',import.meta.url),'utf8');
const tag=(s,pattern)=>s.match(pattern)?.[0]??null;
test('B1 reuses the original wizard stage rather than an approximate new UI',()=>{
 for(const ref of ['<link rel="stylesheet" href="./planning.css">','<link rel="stylesheet" href="./six-paths-stage.css">','class="planning-mode pilot-mode"','class="game pilot-game"','class="stage-shade"','class="hud hero-hud"','class="puppet hero-puppet"','src="./assets/hero.webp"','class="puppet enemy-puppet"','class="hud enemy-hud"','class="table"','class="energy"','class="piles"','class="hand-label"','class="hand"','class="pilot-overlay"','class="pilot-help"']){
  assert.ok(original.includes(ref),'original lacks expected visual primitive: '+ref);
  assert.ok(b1.includes(ref),'B1 failed to reuse original primitive: '+ref);
 }
 for(const pattern of [/<div id="heroPuppet".*?<\/div>/s,/<div class="hud hero-hud">.*?<\/div>/s,/<div id="enemyPuppet".*?<\/div>/s,/<div class="controls">.*?<\/div>/s]){
  assert.equal(tag(b1,pattern),tag(original,pattern),'legacy DOM region changed: '+pattern);
 }
});
test('B1 differs only for the required multi-enemy target picker and art-free cards',()=>{
 assert.match(b1,/id="targetChoices"/);
 assert.match(b1,/b1-text-card/);
 assert.match(b1,/import \{CARDS,STAGES,createB1Game(?:,[A-Za-z_][A-Za-z0-9_]*)*\} from "\.\/underground-b1-engine\.mjs"/);
 assert.doesNotMatch(b1,/<div class="enemies" id="enemies"/);
 assert.doesNotMatch(b1,/style="color:var\(--gold\)"/);
});
test('B1 inline module parses as JavaScript without needing browser globals',()=>{
 const match=b1.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(match,'B1 application module missing');
 const p=spawnSync(process.execPath,['--check','--input-type=module'],{input:match[1],encoding:'utf8'});
 assert.equal(p.status,0,p.stderr||p.error?.message);
});
