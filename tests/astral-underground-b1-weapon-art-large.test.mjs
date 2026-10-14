import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const base=new URL("../v4-1/",import.meta.url);
const css=readFileSync(new URL("underground-b1-weapon-art-large.css",base),"utf8");
test("weapon art is larger and both modes load the final stylesheet",()=>{
 assert.match(css,/flex:0 0 61%;height:61%/);
 assert.match(css,/max-height:620px/);
 assert.match(css,/max-width:580px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 for(const file of ["underground-b1-playtest.html","underground-b1-journey.html"]){
  const html=readFileSync(new URL(file,base),"utf8");
  assert.ok(html.includes('href="./underground-b1-weapon-art-large.css"'),file);
 }
});
