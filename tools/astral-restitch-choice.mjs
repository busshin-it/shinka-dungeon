// Same-state, one-turn opportunity-cost probes. Synthetic zones only; no player data.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';
import {planTurn,DEFAULTS} from './astral-growth-balance.mjs';
import {engine,fixture,plain} from '../tests/helpers/restitch-fixtures.mjs';
const start=performance.now(),rows=[],options={...DEFAULTS,beam:8,maxCards:10};
for(const upgraded of [false,true])for(const origin of ['frost','storm','mirror'])for(const energy of [1,2,3,5])for(const target of [null,'ice','bolt','basicStrike'])for(const turn of [1,2]){
 for(const support of ['restitch','starBookmark','meditate']){
  const id=support+(upgraded?'+':''),g=fixture([id,'chain','guard','ashWard'],{origin,energy,turn},{discard:target?[target]:[],draw:['basicWard','basicStrike','ice','focus','guard'].slice(0,target?5:6)}),before=g.snapshot();
  const plan=planTurn(engine,g,options),played=[];for(const index of plan){played.push(g.snapshot().hand[index]);assert(g.play(index));}const hpLoss=g.intent().hpLoss||0,atEnd=g.snapshot();assert(g.endTurn());
  rows.push({upgraded,origin,energy,target,turn,support,played,used:played.includes(id),damage:atEnd.stats.dealt-before.stats.dealt,block:atEnd.block,reflect:atEnd.reflect,hpLoss,energyLeft:atEnd.energy,phase:g.snapshot().phase});
 }
}
const own=fs.readFileSync(new URL(import.meta.url)),source=fs.readFileSync(new URL('../v4-1/planning-engine.js',import.meta.url));const hash=x=>createHash('sha256').update(x).digest('hex');
const summary=Object.fromEntries(['restitch','starBookmark','meditate'].map(support=>{const a=rows.filter(r=>r.support===support);return[support,{cases:a.length,used:a.filter(r=>r.used).length,skipped:a.filter(r=>!r.used).length,meanDamage:a.reduce((s,r)=>s+r.damage,0)/a.length,meanHpLoss:a.reduce((s,r)=>s+r.hpLoss,0)/a.length}]}));
console.log(JSON.stringify({synthetic:true,scope:'One-turn opportunity cost, 192 same-zone states × 3 alternative support cards. Paired comparator slots differ by that one support ID only.',sourceSha256:hash(source),harnessSha256:hash(own),node:process.version,elapsedSeconds:(performance.now()-start)/1000,options,limits:'Bounded heuristic with fixed visible zones and known next draws. Not natural acquisition, full-run card strength, optimal play, or human enjoyment. Source state uses genuine validator.',summary,rows},null,2));
