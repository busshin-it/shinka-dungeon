// Reproducible counterfactual sampling, not a measurement of human enjoyment.
// Node 22+, no third-party dependencies. Prints data, never changes gameplay.
import fs from 'node:fs';
import vm from 'node:vm';
const context={};vm.runInNewContext(fs.readFileSync(new URL('../v4-1/planning-engine.js',import.meta.url),'utf8'),context);
const E=context.ShinkaV43, plain=x=>JSON.parse(JSON.stringify(x));
function battleAction(game){
 const s=game.snapshot(),risk=game.intent().hpLoss;
 const choices=s.hand.map((_,i)=>({i,c:game.previewCard(i)})).filter(x=>x.c.cost<=s.energy).map(({i,c})=>{
   const copy=E.createGame();copy.restoreSave(plain(game.exportSave()));copy.play(i);
   const next=copy.snapshot();
   return {i,score:c.actualDamage+(risk-copy.intent().hpLoss)*1.15+c.actualDraw*2+c.actualHeal*.8+(c.energy||0)*3+(c.focus||0)*.7+(c.actualNextBlock||0)*.5+(c.actualNextFocus||0)*.5+(next.phase==='victory'?100:0)};
 }).sort((a,b)=>b.score-a.score);
 return choices.length&&choices[0].score>0?['play',choices[0].i]:['endTurn'];
}
function step(game,route){const s=game.snapshot();if(s.phase==='battle')return battleAction(game);
 if(s.phase==='reward')return ['chooseReward',game.rewardOptions().map(id=>({id,c:E.card(id)})).sort((a,b)=>value(b.c)-value(a.c))[0].id];
 return {intro:['start'],victory:['openReward'],route:['chooseRoute','moon'],ready:['nextBattle'],sanctuary:['chooseSanctuary','rest'],chapter:['chooseChapter',route],camp:['chooseCamp','rest']}[s.phase];}
function value(c){return (c.damage||0)+(c.block||0)*.6+(c.weaken||c.emptyWeak||0)*1.5+(c.draw||0)*3+(c.bankBlock||0)*.3-(c.cost||0)*2;}
function advance(game,route,stopChapter=false){for(let i=0;i<1000;i++){if(stopChapter&&game.snapshot().phase==='chapter')return true;const cmd=step(game,route);if(!cmd)return false;if(!game[cmd[0]](...cmd.slice(1)))return false;}throw Error('Action limit');}
const result={policy:'One-step greedy damage / immediate avoided HP loss; rest at camps. Paired exact chapter saves, 128 seeds × 3 origins. No lookahead; not a human fun or optimal-play assessment.',reachedChapter:0,routes:{}};
for(const route of ['library','wind','causeway'])result.routes[route]={runs:0,completed:0,totalEndHp:0,totalWinsAfterChapter:0,battle4Wins:0,totalBattle4Taken:0};
for(const origin of ['frost','storm','mirror'])for(let seed=1;seed<=128;seed++){
 const game=E.createGame(E.seededRandom(seed));game.selectOrigin(origin);if(!advance(game,'library',true))continue;
 const save=plain(game.exportSave());result.reachedChapter++;
 for(const route of ['library','wind','causeway']){
  const copy=E.createGame();copy.restoreSave(save);advance(copy,route);const s=copy.snapshot(),r=result.routes[route];
  r.runs++;r.completed+=Number(s.phase==='complete');r.totalEndHp+=s.hp;r.totalWinsAfterChapter+=s.wins-3;
  r.battle4Wins+=Number(s.history.some(h=>h.battle===4&&h.result==='victory'));
  const h=s.history.find(h=>h.battle===4);if(h)r.totalBattle4Taken+=Math.max(0,save.state.hp+(route==='wind'?6:route==='causeway'?-4:0)-h.hp);
 }
}
for(const r of Object.values(result.routes)){r.completionRate=+(r.completed/r.runs).toFixed(3);r.meanEndHp=+(r.totalEndHp/r.runs).toFixed(2);r.meanBattle4HpDelta=+(r.totalBattle4Taken/r.runs).toFixed(2);}
console.log(JSON.stringify(result,null,2));
