import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const source=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
test("integrated map keeps battle artwork, touch gestures and B1 combat screen",()=>{
 for(const part of ["attachB1Actions","showB1Feedback","B1_HQ_CARD_ART","underground-b1-route-map.mjs","routeTrial:true","renderAscendingMap()","goToRouteRoom(node.id,node.type)","game.enterRouteRoom(type)","game.play(","game.chooseReward(","game.chooseRest(","game.buyShop("])
  assert.ok(source.includes(part),part);
 const match=source.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(match);
 const proc=spawnSync(process.execPath,["--input-type=module","--check"],{input:match[1],encoding:"utf8"});
 assert.equal(proc.status,0,proc.stderr);
});
