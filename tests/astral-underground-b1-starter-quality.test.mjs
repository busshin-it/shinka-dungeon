import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,STARTER,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const root=new URL("../v4-1/",import.meta.url);
const html=readFileSync(new URL("underground-b1-playtest.html",root),"utf8");
const css=readFileSync(new URL("underground-b1-starter-art.css",root),"utf8");
const vector=readFileSync(new URL("assets/b1-scatter-sharp.svg",root),"utf8");

test("replace the 112x149 low-resolution scatter starter art with a resolution-independent image",()=>{
 const lowRes=readFileSync(new URL("assets/pilot-doom-bullet.webp",root));
 assert.equal(lowRes.toString("ascii",0,4),"RIFF");
 assert.deepEqual([lowRes.readUInt16LE(26)&0x3fff,lowRes.readUInt16LE(28)&0x3fff],[112,149]);
 assert.ok(existsSync(new URL("assets/b1-scatter-sharp.svg",root)));
 assert.match(vector,/<svg[^>]+viewBox="0 0 768 768"/);
 assert.match(vector,/<\/svg>\s*$/);
 assert.match(vector,/<path /);
 const scatter=css.split(".b1-starter-card-art--scatter{")[1].split("}")[0];
 assert.ok(scatter.includes("b1-scatter-sharp.svg"));
 assert.ok(!scatter.includes("pilot-doom-bullet.webp"),"low-res image must not appear on starter card");
 assert.ok(css.includes("background-size:cover;background-position:center"));
 assert.match(html,/for\(const id of \["lightning","scatter","flow","dragonEgg"\]\)/);
});

test("the egg starter is always rendered with its name and complete effect below the art",()=>{
 const start=html.slice(html.indexOf("function renderSetup()"),html.indexOf("// Enemy sprite buttons",html.indexOf("function renderSetup()")));
 for(const fragment of [
  'if(id==="dragonEgg")','b.querySelector(".desc").textContent=description',
  "召喚・育成・竜息の3枚で開始","進化すると攻撃","次の戦闘は卵から",
  'b.setAttribute("aria-label","竜の卵、魔力1。"+description)',
 ])assert.ok(start.includes(fragment),fragment);
 assert.match(css,/\.pilot-start-card\{\s*display:grid;/);
 assert.match(css,/grid-template-rows:minmax\(0,58%\) minmax\(0,42%\)/);
 assert.match(css,/\.b1-starter-card-art\{[\s\S]*?grid-column:1;grid-row:1;/);
 assert.match(css,/\.pilot-card-copy\{[\s\S]*?grid-column:1;grid-row:2;/);
 assert.match(css,/background:linear-gradient\(180deg,#f8ecd2,#f2e4ca\)/);
 assert.match(css,/\.b1-starter-card-art--dragonEgg::before\{\s*z-index:0;/);
 assert.match(css,/@media\(max-height:720px\)/);
 assert.match(css,/@media\(max-width:450px\)/);
});

test("dragon egg's displayed three-card benefit is real, with no gameplay rule changes",()=>{
 const g=createB1Game({seed:22});
 assert.equal(g.selectStarter("dragonEgg"),true);
 const s=g.snapshot();
 assert.equal(s.phase,"battle");
 assert.equal(s.deck.length,STARTER.length+3);
 for(const id of ["dragonEgg","dragonFeed","dragonBreath"])assert.equal(s.deck.filter(x=>x===id).length,1,id);
 assert.equal(s.dragonStage,-1,"starts from a fresh egg every battle");
 assert.equal(CARDS.dragonEgg.kind,"dragon");
 assert.equal(CARDS.dragonEgg.cost,1);
});

test("B1 starter-only change preserves battle layout, other starters and HTML syntax",()=>{
 for(const id of ["lightning","scatter","flow"]){
  const g=createB1Game({seed:22});
  assert.equal(g.selectStarter(id),true);
  assert.ok(g.snapshot().deck.includes(id));
 }
 for(const name of ["heroPuppet","enemyPuppet","hand","endTurn","setupChoices"])
  assert.ok(html.includes('id="'+name+'"'));
 assert.equal(css.includes("#playScreen #hand"),false,"do not modify battle-hand CSS");
 const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(js);
 const check=spawnSync(process.execPath,["--check","--input-type=module"],{input:js,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
});
