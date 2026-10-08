// Controlled one-action tradeoffs; synthetic saves only, no player data or writes to runtime.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {engine,fixture,plain,restore} from '../tests/helpers/restitch-fixtures.mjs';
const rows=[];
for(const upgraded of [false,true])for(const origin of ['frost','storm','mirror'])for(const weaken of [0,1,2,3,4,5])for(const energy of [1,2])for(const [battle,turn]of [[2,1],[2,2],[4,1],[4,2],[6,1]]){
 const g=fixture(['rimeThaw'+(upgraded?'+':''),'guard'+(upgraded?'+':''),'basicStrike'],{origin,weaken,energy,turn},{battle}),saved=plain(g.exportSave()),choices=[];
 for(const [choice,index]of [['hold',null],['rimeThaw',0],['guard',1],['basicStrike',2]]){
  const copy=restore(saved),before=copy.snapshot();if(index!==null)assert(copy.play(index));const now=copy.snapshot(),intent=copy.intent();assert(copy.endTurn());const after=copy.snapshot();assert.equal(before.hp-after.hp,intent.hpLoss||0);
  choices.push({choice,hpLoss:intent.hpLoss||0,energyLeft:now.energy,damage:after.stats.dealt-before.stats.dealt,block:now.block,weaken:now.weaken,reflected:intent.reflected||0});
 }
 const held=choices[0],converted=choices[1];rows.push({upgraded,origin,weaken,energy,battle,turn,conversionComparedWithHolding:converted.hpLoss<held.hpLoss?'less-damage':converted.hpLoss>held.hpLoss?'more-damage':'same-damage',choices});
}
const counts=Object.fromEntries(['less-damage','more-damage','same-damage'].map(k=>[k,rows.filter(r=>r.conversionComparedWithHolding===k).length]));
const hash=x=>createHash('sha256').update(x).digest('hex');console.log(JSON.stringify({synthetic:true,sourceSha256:hash(fs.readFileSync(new URL('../v4-1/planning-engine.js',import.meta.url))),harnessSha256:hash(fs.readFileSync(new URL(import.meta.url))),states:rows.length,trials:rows.length*4,counts,policy:'Four explicit actions from the identical hand and save/RNG. Holding, conversion, existing Guard, and basic attack. No search heuristic or injected reward selection.',limits:'One turn. Spending one mana differs from holding; equal damage does not imply equal future value. Synthetic weakness and hand; no human enjoyment or natural acquisition claim.',rows},null,2));
