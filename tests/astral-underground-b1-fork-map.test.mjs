import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createB1Game,STAGES,B1_FORK_ROUTES} from "../v4-1/underground-b1-engine.mjs";

function clearBattle(g){
 let turns=0;
 while(g.snapshot().phase==="battle"&&turns++<65){
  let count=0;
  while(g.snapshot().phase==="battle"&&count++<15){
   const s=g.snapshot();
   const target=s.enemies.find(e=>e.hp>0);
   const index=s.hand.findIndex(id=>id==="lightning"&&s.energy>=2);
   if(index<0||!target)break;
   assert.equal(g.play(index,target.id),true);
  }
  if(g.snapshot().phase==="battle")assert.equal(g.endTurn(),true);
 }
 assert.ok(turns<65,"battle timed out");
 assert.equal(g.snapshot().phase,"reward");
}
function reachFork(){
 const g=createB1Game({seed:17,maxHp:999,testDeck:Array(12).fill("lightning")});
 assert.equal(g.selectStarter("scatter"),true);
 clearBattle(g);assert.equal(g.chooseReward(null),true);
 const s=g.snapshot();
 assert.equal(s.phase,"between");assert.equal(s.stage,0);
 return g;
}
test("the first fork has two routes with different numbers of real enemies",()=>{
 assert.deepEqual(Object.keys(B1_FORK_ROUTES),["pack","stone"]);
 assert.equal(B1_FORK_ROUTES.pack.enemies.length,2);
 assert.equal(B1_FORK_ROUTES.stone.enemies.length,1);
 assert.equal(B1_FORK_ROUTES.stone.enemies[0].role,"carapace");
 assert.equal(STAGES.length,5);
});
test("route selection is restricted to the exact stage-one junction and cannot be overwritten",()=>{
 const g=createB1Game({seed:18});
 assert.equal(g.choosePath("stone"),false);
 const route=reachFork();
 assert.deepEqual(route.snapshot().availablePaths,["pack","stone"]);
 assert.equal(route.choosePath("fake"),false);
 assert.equal(route.choosePath("stone"),true);
 assert.equal(route.choosePath("pack"),false);
 assert.deepEqual(route.snapshot().routeHistory,["stone"]);
 assert.deepEqual(route.snapshot().availablePaths,[]);
 assert.equal(route.nextBattle(),true);
 assert.equal(route.snapshot().stage,1);
 assert.equal(route.snapshot().enemies.length,1);
 assert.equal(route.snapshot().enemies[0].id,"carapace");
 assert.equal(route.snapshot().stageName,"B1・石甲の回廊");
 assert.equal(route.choosePath("pack"),false);
});
test("the pack fork keeps the original two-monster stage, including its rewards",()=>{
 const g=reachFork();
 assert.equal(g.choosePath("pack"),true);
 assert.equal(g.nextBattle(),true);
 assert.deepEqual(g.snapshot().enemies.map(e=>e.id),["wolf","imp"]);
 clearBattle(g);
 const snap=g.snapshot();
 assert.equal(snap.phase,"reward");
 assert.equal(snap.rewards.length,3);
 assert.ok(snap.rewards.every(id=>STAGES[1].rewards.includes(id)));
 assert.equal(g.chooseReward(null),true);
 assert.equal(g.nextBattle(),true);
 assert.equal(g.snapshot().stage,2);
 assert.equal(g.snapshot().enemies[0].id,"priest");
});
test("stone route has distinctive defense intent and rejoins the same third battle",()=>{
 const g=reachFork();
 assert.equal(g.choosePath("stone"),true);
 assert.equal(g.nextBattle(),true);
 const first=g.snapshot();
 assert.match(first.intents[0].label,/防御8/);
 assert.equal(first.intents[0].kind,"buff");
 clearBattle(g);
 assert.equal(g.snapshot().rewards.length,3);
 assert.ok(g.snapshot().rewards.every(id=>STAGES[1].rewards.includes(id)));
 assert.equal(g.chooseReward(null),true);
 assert.equal(g.nextBattle(),true);
 assert.equal(g.snapshot().stageName,STAGES[2].name);
 assert.deepEqual(g.snapshot().routeHistory,["stone"]);
});
test("legacy scripted nextBattle without a path remains compatible with prior tests",()=>{
 const g=reachFork();
 assert.equal(g.nextBattle(),true);
 assert.deepEqual(g.snapshot().routeHistory,["pack"]);
 assert.equal(g.snapshot().enemies.length,2);
});
test("boss practice remains independent of the new junction",()=>{
 const g=createB1Game({seed:12});
 assert.equal(g.startBossPractice("combo"),true);
 assert.equal(g.snapshot().stage,4);
 assert.deepEqual(g.snapshot().routeHistory,[]);
 assert.deepEqual(g.snapshot().availablePaths,[]);
 assert.equal(g.choosePath("stone"),false);
});
test("map shows explicit current position and both visual routes with accessible buttons",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-map.css",import.meta.url),"utf8");
 for(const term of ['href="./underground-b1-map.css"','id="routeMap"','data-route="pack"','data-route="stone"','現在地：入口を突破','群れの坑道','石甲の回廊','game.choosePath(chosen.dataset.route)','el("routeMap").hidden=false'])
  assert.ok(html.includes(term),"missing map integration "+term);
 for(const term of [".b1-map-branch",".b1-map-path","prefers-reduced-motion","max-width:660px"])
  assert.ok(css.includes(term),"missing map style "+term);
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const check=spawnSync(process.execPath,["--check","--input-type=module"],{input:inline,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
});
