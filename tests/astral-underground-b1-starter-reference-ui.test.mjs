import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {spawnSync} from "node:child_process";
const read=p=>readFileSync(new URL("../v4-1/"+p,import.meta.url),"utf8");
const html=read("underground-b1-playtest.html");
const css=read("underground-b1-starter-art.css");

test("approved four-card starter layout stays a functional real card selection",()=>{
 assert.ok(html.includes('class="stage pilot-setup b1-ref-setup"'));
 assert.ok(html.includes('class="pilot-setup-content b1-ref-panel"'));
 assert.ok(html.includes('class="pilot-setup-head b1-ref-head"'));
 assert.ok(html.includes('class="b1-ref-title-rule"'));
 assert.ok(html.includes('href="./underground-b1-starter-art.css"'));
 assert.ok(html.includes('for(const id of ["lightning","scatter","flow","dragonEgg"])'));
 assert.ok(html.includes('artPanel.className="b1-starter-card-art b1-starter-card-art--"+id'));
 assert.ok(html.includes('b.addEventListener("click",()=>{if(game.selectStarter(id))'));
 for(const id of ["bossComboPractice","bossPractice","bossBasicPractice"])assert.ok(html.includes('id="'+id+'"'));
});
test("new CSS preserves readable art and text with four equal columns",()=>{
 assert.match(css,/\.b1-ref-panel \.pilot-choices\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/max-width:850px[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.ok(css.includes("b1-starter-card-art--dragonEgg"));
 assert.ok(css.includes("background-size:cover"));
 assert.ok(css.includes("border:3px solid #c4a06c"));
 assert.ok(css.includes("prefers-reduced-motion:reduce"));
 assert.ok(css.includes(".pilot-start-card .pilot-card-copy"));
 for(const file of ["star-relay.webp","pilot-doom-bullet.webp","star-bookmark.webp","b1-dragon-egg.webp"]){
  assert.ok(existsSync(new URL("../v4-1/assets/"+file,import.meta.url)),file);
 }
});
test("starter layout change does not rewrite the battle view and scripts parse",()=>{
 assert.ok(html.includes('id="heroPuppet"'));
 assert.ok(html.includes('id="enemyPuppet"'));
 assert.ok(html.includes('id="playScreen"'));
 assert.ok(html.includes('id="dragonHud"'));
 const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const p=spawnSync(process.execPath,["--check","--input-type=module"],{input:inline,encoding:"utf8"});
 assert.equal(p.status,0,p.stderr);
});
