// Explicit legal plans from identical synthetic saves. No player data or runtime writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fixture,plain,restore} from '../tests/helpers/restitch-fixtures.mjs';
const plans=[[],['bankedStance'],['bolt'],['bankedStance','bolt'],['bankedStance','basicStrike'],['basicStrike','bankedStance'],['guard','basicStrike']];
const rows=[];
for(const evolved of [false,true])for(const origin of ['frost','storm','mirror'])for(const energy of [1,2,3,4,5])for(const [battle,turn]of [[2,1],[2,2],[4,1],[4,2],[4,3],[6,1]])for(const lethal of [false,true]){
  const suffix=evolved?'+':'',hand=['bankedStance'+suffix,'bolt','guard','basicStrike'];
  const initial=fixture(hand,{origin,energy,turn,...(lethal?{enemyHp:3}:{})},{battle}),save=plain(initial.exportSave()),choices=[];
  for(const plan of plans){
    const g=restore(save),before=g.snapshot();let legal=true;
    for(const id of plan){const index=g.snapshot().hand.indexOf(id==='bankedStance'?id+suffix:id);if(!g.play(index)){legal=false;break;}}
    if(!legal)continue;
    const now=g.snapshot(),intent=now.phase==='battle'?g.intent():null;
    if(intent){assert(g.endTurn());assert.equal(before.hp-g.snapshot().hp,intent.hpLoss||0);}
    const after=g.snapshot();
    choices.push({plan:plan.join(' → ')||'hold',hpLoss:before.hp-after.hp,damage:after.stats.dealt-before.stats.dealt,energyLeft:now.energy,block:now.block,focus:now.focus,phase:after.phase});
  }
  assert.deepEqual(plain(initial.exportSave()),save);
  rows.push({evolved,origin,energy,battle,turn,lethal,choices});
}
const usesStance=x=>x.plan.includes('bankedStance');
// Equal or better immediate HP/damage AND retained mana. No scalar score or optimality claim.
const dominates=(a,b)=>a.hpLoss<=b.hpLoss&&a.damage>=b.damage&&a.energyLeft>=b.energyLeft&&(a.hpLoss<b.hpLoss||a.damage>b.damage||a.energyLeft>b.energyLeft);
const summary={states:rows.length,legalTrials:rows.reduce((n,r)=>n+r.choices.length,0),statesWithNonDominatedStance:rows.filter(r=>r.choices.some(c=>usesStance(c)&&!r.choices.some(d=>dominates(d,c)))).length,statesWhereEveryStancePlanIsDominated:rows.filter(r=>r.choices.filter(usesStance).every(c=>r.choices.some(d=>dominates(d,c)))).length};
const hash=x=>createHash('sha256').update(x).digest('hex');
console.log(JSON.stringify({synthetic:true,sourceSha256:hash(fs.readFileSync(new URL('../v4-1/planning-engine.js',import.meta.url))),harnessSha256:hash(fs.readFileSync(new URL(import.meta.url))),summary,limits:'One-turn sampled plans, fixed artificial hands and lethal/full HP. Dominance counts ignore future draws, progression, reward acquisition and human enjoyment; not optimal play or a reason to buff the card. Retained mana is before natural regeneration. Focus expires if no attack is made. No reuse of spent cards added.',rows},null,2));
