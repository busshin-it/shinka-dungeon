import test from "node:test";
import assert from "node:assert/strict";
import {statSync,readFileSync} from "node:fs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");

test("dragon-bone weapon portrait uses existing HQ dragon cell instead of enlarging 2.5KB art",()=>{
 const tiny=statSync(new URL("../v4-1/assets/b1-dragon-feed.webp",import.meta.url)).size;
 const hd=statSync(new URL("../v4-1/assets/b1-dragon-evolution-hd.avif",import.meta.url)).size;
 assert.ok(tiny<10000,"original card thumbnail was low fidelity");
 assert.ok(hd>100000,"high definition existing dragon atlas is retained");
 assert.ok(hd>tiny*20);
 assert.match(html,/const dragonHd=id==="dragonStaff"/);
 assert.match(html,/art=document\.createElement\(dragonHd\?"span":"img"\)/);
 assert.match(html,/art\.className="b1-weapon-art"\+\(dragonHd\?" b1-weapon-dragon-hd":""\)/);
 assert.match(html,/art\.setAttribute\("aria-hidden","true"\)/);
 assert.match(css,/\.b1-weapon-dragon-hd::before\{/);
 assert.match(css,/background-image:url\("\.\/assets\/b1-dragon-evolution-hd\.avif"\)/);
 assert.match(css,/background-size:400% 200%/);
 assert.match(css,/background-position:66\.667% 100%/);
 assert.match(css,/width:max\(100cqw,75cqh\);aspect-ratio:3\/4/);
});

test("new artwork for old club is only a specification; no unapproved asset path is used",()=>{
 assert.match(html,/oldClub:"b1-physical-bludgeon\.webp"/);
 assert.doesNotMatch(html,/b1-weapon-old-club\.webp/,"no missing image requests");
 assert.match(html,/button\.append\(art,info\)/);
 assert.match(html,/game\.chooseWeapon\(id\)/);
 const brief=readFileSync(new URL("../design/b1-weapon-dedicated-art-and-hd-placeholder-20261014.md",import.meta.url),"utf8");
 assert.match(brief,/画像生成・自動生成ワークフロー実行/);
 assert.match(brief,/人物・戦士・少女・敵・ドラゴンを入れない/);
 assert.match(brief,/古木の棍棒/);
});

test("PWA release descriptor signals the dragon HQ change",()=>{
 const release=JSON.parse(readFileSync(new URL("../v4-1/b1-release.json",import.meta.url),"utf8"));
 const js=readFileSync(new URL("../v4-1/b1-update.mjs",import.meta.url),"utf8");
 assert.match(release.build,/^[0-9]{4}[.][0-9]{2}[.][0-9]{2}[.][0-9]+$/);
 assert.ok(html.includes('data-b1-build="'+release.build+'"'));
 assert.ok(js.includes('B1_BUILD = "'+release.build+'"'));
});
