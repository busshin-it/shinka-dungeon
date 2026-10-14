import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createB1Game} from "../v4-1/underground-b1-engine.mjs";
const html=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
test("route checkpoint restores deck, hand, hp and deterministic RNG",()=>{
 const first=createB1Game({seed:9191,routeTrial:true,tacticalEncounters:true,weaponTrial:true});
 assert.equal(first.selectStarter("lightning"),true);
 for(let i=0;i<3;i++)assert.equal(first.chooseStarterPick(first.snapshot().starterOffers[0]),true);
 const original=first.snapshot(),saved=JSON.parse(JSON.stringify(first.exportCheckpoint()));
 const replay=createB1Game({seed:9191,routeTrial:true,tacticalEncounters:true,weaponTrial:true});
 assert.equal(replay.restoreCheckpoint(saved),true);
 assert.deepEqual(replay.snapshot(),original);
 assert.equal(first.endTurn(),true);assert.equal(replay.endTurn(),true);
 assert.deepEqual(replay.snapshot(),first.snapshot());
});
test("legacy mode never exports checkpoints; invalid checkpoint fails safely",()=>{
 const legacy=createB1Game({seed:1});
 assert.equal(legacy.exportCheckpoint(),null);
 const route=createB1Game({seed:1,routeTrial:true});
 assert.equal(route.restoreCheckpoint({version:1,runSeed:1,randomState:1,state:{stage:999}}),false);
});
test("separate save key, restore before starter and clear on restart",()=>{
 for(const key of ["shinka-b1-journey-v1","localStorage.setItem","localStorage.getItem","localStorage.removeItem","const resumed=loadJourney()","saveJourney();"])assert.ok(html.includes(key),key);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 const res=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});
 assert.equal(res.status,0,res.stderr);
});
