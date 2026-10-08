// Synthetic same-state opportunity-cost probes. Never writes runtime or user saves.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {planTurn,DEFAULTS,mean} from './astral-growth-balance.mjs';
import {engine,fixture} from '../tests/helpers/restitch-fixtures.mjs';
const pairs=[['frostCrossing','frostWard'],['starFrostLetter','starWait'],['stillMirror','mirror'],['afterglowWard','emberVeil'],['bankedStarBlade','bolt']];
const started=performance.now(),rows=[],options={...DEFAULTS,beam:8,maxCards:10};
for(const [candidate,alternative] of pairs)for(const upgraded of [false,true])for(const origin of ['frost','storm','mirror'])for(const energy of [1,2,3,4,5])for(const turn of [1,2,3]){
 for(const support of [candidate,alternative]){
  const id=support+(upgraded?'+':''),g=fixture([id,'basicStrike','guard','spark'],{origin,energy,turn,prevEndEmpty:turn===3},{draw:['bolt','basicStrike','basicWard','ice','guard','focus']}),before=g.snapshot();
  const plays=planTurn(engine,g,options),played=[];
  for(const index of plays){played.push(g.snapshot().hand[index]);assert(g.play(index));}
  const end=g.snapshot(),intent=g.intent();
  if(end.phase==='battle')assert(g.endTurn());
  rows.push({candidate,alternative,support,upgraded,origin,energy,turn,previousEmpty:turn===3,played,used:played.includes(id),first:played[0]===id,damage:end.stats.dealt-before.stats.dealt,block:end.block,reflect:end.reflect,pendingBlock:end.pendingBlock,pendingFocus:end.pendingFocus,hpLoss:intent.hpLoss||0,energyLeft:end.energy,reflected:intent.reflected||0,totalDamage:g.snapshot().stats.dealt-before.stats.dealt,actualHpTaken:g.snapshot().stats.taken-before.stats.taken,phase:g.snapshot().phase});
 }
}
const summary=Object.fromEntries(pairs.map(([candidate,alternative])=>[candidate,Object.fromEntries([candidate,alternative].map(support=>{const a=rows.filter(r=>r.candidate===candidate&&r.support===support);return[support,{cases:a.length,used:a.filter(r=>r.used).length,skipped:a.filter(r=>!r.used).length,first:a.filter(r=>r.first).length,usedLater:a.filter(r=>r.used&&!r.first).length,meanDamage:mean(a.map(r=>r.damage)),meanHpLoss:mean(a.map(r=>r.hpLoss)),meanTotalDamage:mean(a.map(r=>r.totalDamage)),meanReflected:mean(a.map(r=>r.reflected)),meanPendingBlock:mean(a.map(r=>r.pendingBlock)),meanPendingFocus:mean(a.map(r=>r.pendingFocus)),meanEnergyLeft:mean(a.map(r=>r.energyLeft))}]}))]));
const hash=x=>createHash('sha256').update(x).digest('hex');
console.log(JSON.stringify({synthetic:true,scope:'450 same-state pairs (900 trials). Only the compared support slot differs; all saves pass the production validator.',options,node:process.version,elapsedSeconds:(performance.now()-started)/1000,sourceSha256:hash(fs.readFileSync(new URL('../v4-1/planning-engine.js',import.meta.url))),harnessSha256:hash(fs.readFileSync(new URL(import.meta.url))),policy:'Unmodified one-turn bounded beam heuristic. Known synthetic draw pile. Turn 3 carries a synthetic previous-zero-mana flag; other turns do not.',limits:'Comparator costs/effects differ intentionally. Outcomes cover one turn and its enemy response; reservations are reported separately, not converted into actual future damage. Not natural acquisition, optimal play, full-run card strength, or human enjoyment.',summary,rows},null,2));
