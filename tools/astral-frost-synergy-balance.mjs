// Synthetic paired smoke comparison. Read-only; never touches user saves or runtime.
// Requires the original baseline commit in the local Git checkout.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {loadEngine,DEFAULTS,parseOptions,ORIGINS,runTrial,summarize} from './astral-growth-balance.mjs';
const baseCommit='f65d4dc545e590f9c28029b3bb3cd84cd6a2f27a',root=new URL('..',import.meta.url);
const options={...DEFAULTS,...parseOptions(process.argv.slice(2))};
const before=execFileSync('git',['show',`${baseCommit}:v4-1/planning-engine.js`],{cwd:root,encoding:'utf8'}),after=fs.readFileSync(new URL('v4-1/planning-engine.js',root),'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex'),plain=x=>JSON.parse(JSON.stringify(x));
const engines={v416:loadEngine(before),v417:loadEngine(after)},newIds=['rimeMirror','frostOmen'];
for(const key of ['ORIGINS','ENEMIES','GROWTH_ENEMIES','RELICS','BASIC_STARTER','FIRST_REWARD_POOLS'])assert.deepEqual(plain(engines.v416[key]),plain(engines.v417[key]),key);
for(const [id,c]of Object.entries(engines.v416.CARDS))assert.deepEqual(plain(engines.v417.CARDS[id]),plain(c),id);
const started=performance.now(),rows=[];
for(const origin of ORIGINS)for(let seed=1;seed<=options.seeds;seed++)for(const [version,engine]of Object.entries(engines)){
 const {row}=runTrial(engine,{...options,origin,seed,ruleset:'growth-v2'});rows.push({version,...row});
}
const summaries=Object.fromEntries(Object.keys(engines).map(version=>[version,summarize(rows.filter(r=>r.version===version))]));
const report={schemaVersion:1,synthetic:true,baseCommit,sourceSha256:{v416:sha(before),v417:sha(after)},harnessSha256:sha(fs.readFileSync(new URL('astral-growth-balance.mjs',import.meta.url))),ownSourceSha256:sha(fs.readFileSync(new URL(import.meta.url))),nodeVersion:process.version,options,elapsedSeconds:+((performance.now()-started)/1000).toFixed(3),policy:'Unmodified bounded beam search and reward heuristic from astral-growth-balance.mjs. Moon/library/rest. Same seed and origin; subsequent reward/draw RNG can diverge after the enlarged pool. No human play, optimality, balance, or enjoyment claim.',summary:summaries,newCards:Object.fromEntries(newIds.map(id=>[id,{offered:rows.filter(r=>r.version==='v417').flatMap(r=>r.rewardChoices).filter(r=>r.offers.some(o=>o.id===id)).length,selected:rows.filter(r=>r.version==='v417').flatMap(r=>r.rewardChoices).filter(r=>r.selected===id).length}])),rows};
console.log(JSON.stringify(report,null,2));
