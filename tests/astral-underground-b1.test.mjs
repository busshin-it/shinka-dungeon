import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,STAGES,STARTER,createB1Game} from '../v4-1/underground-b1-engine.mjs';

function playAvailable(g,preferBoss=false){
 const s=g.snapshot();
 for(let i=s.hand.length-1;i>=0;i--){
  const id=s.hand[i],c=CARDS[id];
  if(c.cost>s.energy)continue;
  if(c.kind==='heal'&&s.hp===s.maxHp)continue;
  const alive=s.enemies.filter(e=>e.hp>0);
  const target=preferBoss?(alive.find(e=>e.role==='boss')||alive[0]):(alive.find(e=>e.role!=='boss')||alive[0]);
  if(g.play(i,target?.id))return true;
 }
 return false;
}
function runBattle(g){
 let count=0;
 while(g.snapshot().phase==='battle'&&count++<130){
  let actions=0;
  while(actions++<15&&playAvailable(g)){}
  if(g.snapshot().phase==='battle')assert.equal(g.endTurn(),true);
 }
 assert.ok(count<130,'battle should finish with finite number of decisions');
}
function reachBoss(g,starter='lightning'){
 assert.equal(g.selectStarter(starter),true);
 for(let wave=0;wave<STAGES.length-1;wave++){
  runBattle(g);const s=g.snapshot();assert.equal(s.phase,'reward');
  const preferred=wave%2===0?'double':'chain';
  assert.equal(g.chooseReward(s.rewards.includes(preferred)?preferred:s.rewards[0]),true);
  assert.equal(g.nextBattle(),true);
 }
 return g.snapshot();
}
function findCard(g,id,maxTurns=20){
 for(let t=0;t<maxTurns;t++){
  const s=g.snapshot();
  if(s.phase!=='battle')throw new Error('Encounter ended before drawing '+id);
  const i=s.hand.findIndex(x=>x===id&&CARDS[x].cost<=s.energy);
  if(i>=0)return i;
  g.endTurn();
 }
 throw new Error('Could not draw '+id);
}

test('card pool and initial deck are independent from original pilot',()=>{
 assert.equal(STARTER.length,9);
 assert.equal(Object.keys(CARDS).length,22);
 assert.equal(STAGES.length,5);
 assert.equal(CARDS.scatter.kind,'all');
});
test('starter, targeting, magic spending and combat log',()=>{
 const g=createB1Game({seed:42,maxHp:250});
 assert.equal(g.snapshot().phase,'starter');
 assert.equal(g.selectStarter('wrong'),false);
 assert.equal(g.selectStarter('lightning'),true);
 assert.equal(g.selectStarter('scatter'),false);
 let s=g.snapshot();assert.equal(s.phase,'battle');assert.equal(s.deck.length,10);assert.equal(s.hp,250);
 const i=findCard(g,'bolt');
 s=g.snapshot();const before=s.enemies[0].hp,energy=s.energy;
 assert.equal(g.play(i,'no-enemy'),false);
 assert.equal(g.snapshot().energy,energy);
 assert.equal(g.play(i,'rat'),true);
 s=g.snapshot();assert.equal(s.enemies[0].hp,before-6);assert.equal(s.energy,energy-1);
 assert.ok(s.log[0].includes('ダメージ'));
});
test('frost waits until next attack and then clears',()=>{
 const g=createB1Game({seed:100,maxHp:220,testDeck:['frost','guard','bolt','bolt','bolt']});g.selectStarter('lightning');
 const i=findCard(g,'frost');
 assert.equal(g.play(i,'rat'),true);
 assert.equal(g.snapshot().enemies[0].weaken,2);
 // Rat intent depends on turn; an attack clears the effect.
 let guard=0;while(g.snapshot().phase==='battle'&&g.snapshot().enemies[0].weaken>0&&guard++<4)g.endTurn();
 assert.equal(g.snapshot().enemies[0].weaken,0);
});
test('a run can advance through two rewards and beat the protected B1 boss',()=>{
 const g=createB1Game({seed:20261010,maxHp:999});
 let s=reachBoss(g);
 assert.equal(s.stage,4);assert.equal(s.enemies.length,3);
 assert.equal(s.enemies.filter(e=>e.role==='guard').length,2);
 runBattle(g);s=g.snapshot();assert.equal(s.phase,'won');
 assert.ok(s.hp>0);
});
test('two living guards mitigate individual boss hits by four, but not hits on guards',()=>{
 const g=createB1Game({seed:55,maxHp:999});reachBoss(g);
 const i=findCard(g,'bolt');
 const s=g.snapshot();const boss=s.enemies.find(e=>e.role==='boss');
 assert.equal(g.play(i,'boss'),true);
 assert.equal(g.snapshot().enemies.find(e=>e.role==='boss').hp,boss.hp-2);
});
test('an AoE spell evaluates simultaneous guard damage (guard armor at cast start)',()=>{
 const g=createB1Game({seed:333,maxHp:999});reachBoss(g,'scatter');
 const i=findCard(g,'scatter');
 const s=g.snapshot(),initial=new Map(s.enemies.map(e=>[e.id,e.hp]));
 assert.equal(g.play(i),true);
 for(const e of g.snapshot().enemies){
  assert.equal(e.hp,initial.get(e.id)-(e.role==='boss'?2:6));
 }
});
test('reward can be skipped and does not silently mutate deck',()=>{
 const g=createB1Game({seed:12,maxHp:999});g.selectStarter('lightning');
 runBattle(g);const s=g.snapshot();assert.equal(s.phase,'reward');
 assert.equal(g.chooseReward('not-in-choice'),false);
 assert.equal(g.chooseReward(null),true);
 assert.equal(g.snapshot().deck.length,s.deck.length);
 assert.equal(g.nextBattle(),true);assert.equal(g.snapshot().stage,1);
});
