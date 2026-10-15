import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";import {spawnSync} from "node:child_process";import {createB1Game} from "../v4-1/underground-b1-engine.mjs";
const html=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
test("blood choice requires offered card and does not affect classic journeys",()=>{
 const legacy=createB1Game({seed:7});assert.equal(legacy.chooseRouteEvent("blood","fireSmall"),false);
 const route=createB1Game({seed:7,routeTrial:true});assert.equal(route.chooseRouteEvent("blood","fireSmall"),false);
 assert.equal(route.selectStarter("basic"),true);
 assert.equal(route.chooseRouteEvent("blood","fireSmall"),false);
});
test("three choices in page and payment only on selection",()=>{
 for(const needle of ["s.eventBloodOffers||[]","game.chooseRouteEvent(studying?\"study\":\"blood\",id)","b1EventBloodOpen=true;render();","b1EventBloodOpen=false;b1EventStudyOpen=false;render();","b1-event-blood-grid","cardButton(id)"])assert.ok(html.includes(needle),needle);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(script);
 const check=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});assert.equal(check.status,0,check.stderr);
});
