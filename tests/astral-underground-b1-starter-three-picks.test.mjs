import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";import {spawnSync} from "node:child_process";import {createB1Game} from "../v4-1/underground-b1-engine.mjs";
test("route mode selects exactly three cards before first combat",()=>{
 const g=createB1Game({seed:123,routeTrial:true,tacticalEncounters:true,weaponTrial:true});
 assert.equal(g.selectStarter("basic"),true);
 const initial=g.snapshot().deck.length;
 for(let n=0;n<3;n++){
  const s=g.snapshot();assert.equal(s.phase,"starterPick");assert.equal(s.starterPicksDone,n);assert.equal(s.starterOffers.length,3);
  assert.equal(g.chooseStarterPick("no-such-card"),false);
  assert.equal(g.chooseStarterPick(s.starterOffers[0]),true);
 }
 assert.equal(g.snapshot().phase,"battle");assert.equal(g.snapshot().deck.length,initial+3);
 assert.equal(g.chooseStarterPick("fireSmall"),false);
});
test("starter picks persist across checkpoints, and legacy mode still starts immediately",()=>{
 const g=createB1Game({seed:321,routeTrial:true});g.selectStarter("basic");g.chooseStarterPick(g.snapshot().starterOffers[1]);const before=g.snapshot();
 const replay=createB1Game({seed:321,routeTrial:true});assert.equal(replay.restoreCheckpoint(g.exportCheckpoint()),true);assert.deepEqual(replay.snapshot(),before);
 const old=createB1Game({seed:321});old.selectStarter("basic");assert.equal(old.snapshot().phase,"battle");
});
test("three illustrated choices render before stage without overlay",()=>{
 const source=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
 for(const s of ['b1StarterPickCards','s.phase==="starterPick"','game.chooseStarterPick(id)','s.starterPicksDone+1','saveJourney();return;'])assert.ok(source.includes(s),s);
 const script=source.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 const r=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});assert.equal(r.status,0,r.stderr);
});
