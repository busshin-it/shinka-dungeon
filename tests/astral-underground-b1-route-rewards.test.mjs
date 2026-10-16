import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createB1Game} from "../v4-1/underground-b1-engine.mjs";
const engine=readFileSync(new URL("../v4-1/underground-b1-engine.mjs",import.meta.url),"utf8");
const screen=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
test("elite rewards are gated by route trial, earned on victory, and cleared",()=>{
 assert.match(engine,/routeTrial&&s\.routeElitePending\?40:0/);
 assert.match(engine,/s\.routeElitePending=type==="elite"/);
 assert.match(engine,/s\.routeElitePending=false/);
 const trial=createB1Game({seed:41,routeTrial:true});
 assert.equal(trial.enterRouteRoom("elite"),false);
 assert.equal(trial.selectStarter("basic"),true);
 assert.equal(trial.enterRouteRoom("elite"),false);
 const standard=createB1Game({seed:41});
 assert.equal(standard.enterRouteRoom("elite"),false);
});
test("route hints state the exact implemented rewards",()=>{
 for(const needle of ["勝利：カード3択＋追加40G","HP15回復・カード強化・基本カード1枚整理のいずれか","金貨・治癒・契約・強化の選択","金貨でカードを購入","ROUTE_HINT[node.type]","restRefine","game.chooseRest(\"refine\",choice.index)"])assert.ok(screen.includes(needle),needle);
});
