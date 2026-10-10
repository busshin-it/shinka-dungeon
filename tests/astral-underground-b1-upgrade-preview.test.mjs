import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,getB1Card,createB1Game} from "../v4-1/underground-b1-engine.mjs";

test("before/after preview reflects the effective card rules without mutating definitions",()=>{
 for(const id of Object.keys(CARDS)){
  const before=getB1Card(id),after=getB1Card(id+"~");
  assert.equal(before,CARDS[id]);
  assert.equal(after.name,before.name+"＋");
  assert.notDeepEqual(after,before);
  assert.deepEqual(getB1Card(id),CARDS[id]);
 }
});
test("rest UI uses canonical current and upgraded card effects and labels already upgraded copies",()=>{
 const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../v4-1/underground-b1-map.css",import.meta.url),"utf8");
 for(const s of ["getB1Card(id+\"~\")","現在：","強化後：","強化済み","b1-upgrade-after","b1-rest-already-upgraded"]){
  assert.ok(html.includes(s),"missing "+s);
 }
 assert.ok(css.includes(".b1-upgrade-after"));
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const check=spawnSync(process.execPath,["--check","--input-type=module"],{input:inline,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
});
