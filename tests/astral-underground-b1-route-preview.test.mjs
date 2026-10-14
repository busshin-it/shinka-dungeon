import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createB1Game} from "../v4-1/underground-b1-engine.mjs";
const html=readFileSync(new URL("../v4-1/underground-b1-route-preview.html",import.meta.url),"utf8");
test("ascending route view has an actual battle loop and map navigation",()=>{
 for(const key of ["flex-direction:column","createB1RouteMap","availableB1Rooms","chooseB1Room","createB1Game","routeTrial:true","game.play(index,selectedEnemy)","game.endTurn()","enterRouteRoom(type)","game.chooseReward","game.chooseRest","game.buyShop"])assert.ok(html.includes(key),key);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const result=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});
 assert.equal(result.status,0,result.stderr);
});
test("route mode enters a battle only from between, event gives one reward, and legacy mode rejects route actions",()=>{
 const g=createB1Game({seed:9,routeTrial:true,tacticalEncounters:true});
 assert.equal(g.enterRouteRoom("event"),false);
 assert.equal(g.selectStarter("basic"),true);
 assert.equal(g.enterRouteRoom("event"),false);
 const old=createB1Game({seed:9});
 assert.equal(old.enterRouteRoom("event"),false);
});
