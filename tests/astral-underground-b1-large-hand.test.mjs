import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {b1PointerIntent} from "../v4-1/underground-b1-actions.mjs";

const css=readFileSync(new URL("../v4-1/underground-b1-overlay-hand.css",import.meta.url),"utf8");
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const lastSection=css.slice(css.indexOf("/* Bigger Slay-inspired"));
const clamp=(min,x,max)=>Math.min(max,Math.max(min,x));
const cardMetrics=(vw,vh,orientation)=>{
 const isPortrait=orientation==="portrait"&&vw<=900;
 const isShort=orientation==="landscape"&&vh<=600;
 const mobileShort=isShort&&vw<=1100;
 const dock=isPortrait?275:isShort?clamp(235,vh*.62,330):clamp(315,vh*.45,425);
 const width=isPortrait?210:mobileShort?clamp(172,vw*.19,210):isShort?clamp(170,vw*.155,215):clamp(225,vw*.15,275);
 const chrome=isPortrait?37+13+2+4+9+3+5:isShort?34+9+9+4+4:39+14+2+15+5+5;
 return {dock,width,height:dock-chrome};
};
test("fanned cards grow substantially from the prior 161px desktop-short / 128px mobile limits",()=>{
 let desktop=cardMetrics(1325,450,"landscape");
 assert.ok(desktop.width>=200&&desktop.width<=220);
 assert.ok(desktop.height>=200&&desktop.height<=250);
 assert.ok(desktop.width>=161*1.25);
 let android=cardMetrics(960,440,"landscape");
 assert.ok(android.width>=172,"landscape card is no longer only 128px");
 assert.ok(android.height>192,"card art/title/description remain visible");
 assert.ok(android.dock<440*.74,"retain a distinct upper combat target area");
 let tall=cardMetrics(1920,1080,"landscape");
 assert.ok(tall.width>=260&&tall.height>=325,"larger desktop cards");
 let portrait=cardMetrics(390,844,"portrait");
 assert.equal(portrait.width,210);
 assert.ok(portrait.height>195);
});
test("latest B1 card dimensions override earlier responsive values, with readable text",()=>{
 for(const token of [
  "--b1-hand-dock:clamp(315px,45dvh,425px)",
  "clamp(225px,15vw,275px)",
  "clamp(36px,3.3vw,56px)",
  "clamp(78px,13dvh,125px)",
  "--b1-hand-dock:clamp(235px,62dvh,330px)",
  "clamp(172px,19vw,210px)",
  "font-size:14px",
  "--b1-hand-dock:275px",
  "flex:0 0 210px",
  "margin-inline-start:-32px",
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
