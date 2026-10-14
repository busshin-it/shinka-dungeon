import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";import {spawnSync} from "node:child_process";import {createB1Game,B1_WEAPONS} from "../v4-1/underground-b1-engine.mjs";
const html=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
test("new route begins with an equipped weapon, without three starter card picks",()=>{
 const game=createB1Game({seed:2026,routeTrial:true,weaponTrial:true});
 assert.equal(game.selectStarter("basic"),true);
 const n=game.snapshot().deck.length;
 assert.equal(game.selectStartingWeapon("moon"),false);
 assert.equal(game.selectStartingWeapon("thunderStaff"),true);
 assert.equal(game.snapshot().weaponId,"thunderStaff");
 assert.equal(game.snapshot().deck.length,n);
 assert.equal(game.snapshot().phase,"battle");
 assert.equal(game.selectStartingWeapon("oldClub"),false);
});
test("every equipped weapon can be chosen, and classic game is untouched",()=>{
 for(const id of Object.keys(B1_WEAPONS)){const game=createB1Game({seed:8,routeTrial:true,weaponTrial:true});game.selectStarter("basic");assert.equal(game.selectStartingWeapon(id),true,id);}
 const classic=createB1Game({seed:8,weaponTrial:true});assert.equal(classic.selectStartingWeapon("thunderStaff"),false);classic.selectStarter("basic");assert.equal(classic.snapshot().phase,"battle");
});
test("start screen shows equipment instead of clipped starter cards; oval is disabled",()=>{
 for(const q of ["Object.entries(B1_WEAPONS)","game.selectStartingWeapon(id)","b1-start-weapon-choice","#enemyPuppet.b1-drop-target","outline:none!important"])assert.ok(html.includes(q),q);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];const v=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});assert.equal(v.status,0,v.stderr);
});
