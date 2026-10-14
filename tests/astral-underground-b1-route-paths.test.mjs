import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const source=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
test("route lines follow actual graph and mark traveled path",()=>{
 for(const key of ["node.next","routePath.includes(node.id)&&routePath.includes(id)","b1-route-lines","b1-ascending-scroll","goToRouteRoom(node.id,node.type)"])assert.ok(source.includes(key),key);
 const s=source.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(s);
 const p=spawnSync(process.execPath,["--input-type=module","--check"],{input:s,encoding:"utf8"});assert.equal(p.status,0,p.stderr);
});
