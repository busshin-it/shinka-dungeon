import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {b1PointerIntent} from "../v4-1/underground-b1-actions.mjs";

const css=readFileSync(new URL("../v4-1/underground-b1-overlay-hand.css",import.meta.url),"utf8");
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const lastSection=css.slice(css.indexOf("/* B1 hand adjusted from oversized v20"));
const clamp=(min,x,max)=>Math.min(max,Math.max(min,x));
const dimensions=(vw,vh,orientation,oversized=false)=>{
 const portrait=orientation==="portrait"&&vw<=900;
 const short=orientation==="landscape"&&vh<=600;
 const mobileShort=short&&vw<=1100;
 const dock=oversized?
  (portrait?275:short?clamp(235,vh*.62,330):clamp(315,vh*.45,425)):
  (portrait?206:short?clamp(176,vh*.465,248):clamp(236,vh*.3375,319));
 const width=oversized?
  (portrait?210:mobileShort?clamp(172,vw*.19,210):short?clamp(170,vw*.155,215):clamp(225,vw*.15,275)):
  (portrait?158:mobileShort?clamp(129,vw*.1425,158):short?clamp(128,vw*.11625,161):clamp(169,vw*.1125,206));
 return {dock,width};
};
test("cards and hand height are each about 25 percent smaller than the oversized previous build",()=>{
 for(const [vw,vh,orientation] of [
  [1325,450,"landscape"],[960,440,"landscape"],
  [1920,1080,"landscape"],[390,844,"portrait"]
 ]){
  const old=dimensions(vw,vh,orientation,true);
  const updated=dimensions(vw,vh,orientation,false);
  assert.ok(updated.width/old.width>=.74&&updated.width/old.width<=.76,"width ratio "+vw+"x"+vh);
  assert.ok(updated.dock/old.dock>=.74&&updated.dock/old.dock<=.76,"dock ratio "+vw+"x"+vh);
 }
});
test("latest B1 card dimensions preserve full scene and readable text",()=>{
 for(const token of [
  "--b1-hand-dock:clamp(236px,33.75dvh,319px)",
  "clamp(169px,11.25vw,206px)",
  "clamp(27px,2.475vw,42px)",
  "clamp(59px,9.75dvh,94px)",
  "--b1-hand-dock:clamp(176px,46.5dvh,248px)",
  "clamp(129px,14.25vw,158px)",
  "font-size:12px",
  "--b1-hand-dock:206px",
  "flex:0 0 158px",
  "margin-inline-start:-24px",
 ])assert.ok(lastSection.includes(token),token);
 assert.ok(lastSection.includes("height:calc(100% - 4px)"));
 assert.ok(lastSection.includes("touch-action:none"));
 assert.ok(css.includes("background:transparent"));
 assert.ok(css.includes("overflow-x:auto"));
 assert.match(css,/#playScreen > \.stage\{[\s\S]*?height:100%/);
});
test("B1 remains isolated and touch drag and horizontal scrolling are intact",()=>{
 assert.ok(html.includes('href="./underground-b1-overlay-hand.css"'));
 for(const id of ["hand","heroPuppet","enemyPuppet","endTurn","enemyLineup"])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.equal(b1PointerIntent(12,-32,"touch"),"drag");
 assert.equal(b1PointerIntent(58,2,"touch"),"scroll");
});
