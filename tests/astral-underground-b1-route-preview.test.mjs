import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../v4-1/underground-b1-route-preview.html",import.meta.url),"utf8");
test("route preview imports the shared route generator and only allows valid next rooms",()=>{
 for(const needle of ["createB1RouteMap","availableB1Rooms","chooseB1Room","route-map.mjs","btn.disabled=!available.has(node.id)","role=\"status\"","新しい地図","戦闘・報酬・HP"])assert.ok(html.includes(needle),needle);
 assert.ok(!html.includes("underground-b1-engine.mjs"));
});
