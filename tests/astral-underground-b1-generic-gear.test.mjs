import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {B1_STARTER_GEAR,B1_WEAPONS,getB1StartingGearOffers,getB1WeaponOffers,createB1Game} from "../v4-1/underground-b1-engine.mjs";
const page=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
const source=readFileSync(new URL("../v4-1/underground-b1-engine.mjs",import.meta.url),"utf8");
function startWith(id){for(let seed=1;seed<=24;seed++){if(!getB1StartingGearOffers(seed).includes(id))continue;const game=createB1Game({seed,routeTrial:true,weaponTrial:true,tacticalEncounters:true});assert.equal(game.selectStarter("basic"),true);assert.equal(game.selectStartingWeapon(id),true);return game;}throw new Error("unreachable item "+id);}
test("exactly eight cross-archetype items; each run offers three distinct",()=>{
 assert.equal(Object.keys(B1_STARTER_GEAR).length,8);
 for(let seed=1;seed<=24;seed++){const options=getB1StartingGearOffers(seed);assert.equal(options.length,3);assert.equal(new Set(options).size,3);assert.ok(options.every(id=>B1_STARTER_GEAR[id]));assert.deepEqual(options,getB1StartingGearOffers(seed));}
 assert.equal(Object.keys(B1_WEAPONS).length,4);
 assert.ok(getB1WeaponOffers(1).every(id=>B1_WEAPONS[id]));
});
test("initial choices do not add cards and specialize only when treasure weapons appear",()=>{
 for(const id of Object.keys(B1_STARTER_GEAR)){const g=startWith(id);const s=g.snapshot();assert.equal(s.weaponId,id);assert.equal(s.phase,"battle");assert.equal(s.deck.length,10);assert.equal(s.weapon.name,B1_STARTER_GEAR[id].name);}
 const g=createB1Game({seed:3,routeTrial:true,weaponTrial:true});g.selectStarter("basic");assert.equal(g.selectStartingWeapon("thunderStaff"),false);
 const classic=createB1Game({seed:3,weaponTrial:true});classic.selectStarter("basic");assert.equal(classic.snapshot().weaponId,null);
});
test("on combat entry shield, draw and energy bonuses apply once",()=>{
 assert.equal(startWith("travelShield").snapshot().block,4);
 assert.equal(startWith("openJournal").snapshot().hand.length,6);
 assert.equal(startWith("dawnStone").snapshot().energy,4);
 assert.equal(startWith("coinPurse").snapshot().energy,3);
});
test("time and first-card abilities, restore compatibility",()=>{
 const h=startWith("hourglass");assert.equal(h.snapshot().energy,3);h.endTurn();assert.equal(h.snapshot().energy,4);
 const p=startWith("travelPendant"),initial=p.snapshot();assert.equal(initial.block,0);
 const idx=initial.hand.findIndex(id=>!id.includes("dragon"));assert.ok(idx>=0);
 assert.equal(p.play(idx,initial.selected),true);assert.ok(p.snapshot().block>=2);
 const item=p.exportCheckpoint(),g=createB1Game({seed:item.runSeed,routeTrial:true,weaponTrial:true,tacticalEncounters:true});assert.equal(g.restoreCheckpoint(item),true);assert.deepEqual(g.snapshot(),p.snapshot());
});
test("money/healing and three-card rhythm bonuses are guarded and reset per battle",()=>{
 for(const v of ['s.weaponId==="coinPurse"?10:0','s.weaponId==="herbAmulet"?2:0','s.weaponId==="rhythmBell"&&s.starterGearCardsPlayed===3','s.starterGearCardsPlayed=0'])assert.ok(source.includes(v),v);
});
test("page shows three general-purpose relics; no starter card image required",()=>{
 for(const fragment of ["getB1StartingGearOffers(routeSeed)","B1_STARTER_GEAR[id]","game.selectStartingWeapon(id)","旅のお守りを1つ選ぶ"])assert.ok(page.includes(fragment));
 const script=page.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];const p=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});assert.equal(p.status,0,p.stderr);
});
