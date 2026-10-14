import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";import {spawnSync} from "node:child_process";
const html=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
test("room transition keeps same B1 engine and allows reduced motion",()=>{
 for(const key of ['b1RouteGuidance','b1-route-enter','b1-room-arrival','prefers-reduced-motion:reduce','game.enterRouteRoom(type)','routePath=next','game.chooseReward(id)'])assert.ok(html.includes(key),key);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(script);
 const result=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});assert.equal(result.status,0,result.stderr);
});