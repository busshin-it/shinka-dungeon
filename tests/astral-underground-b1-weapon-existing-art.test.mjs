import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {B1_WEAPONS,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");
const release=JSON.parse(readFileSync(new URL("../v4-1/b1-release.json",import.meta.url),"utf8"));
const update=readFileSync(new URL("../v4-1/b1-update.mjs",import.meta.url),"utf8");
const artFiles={
 thunderStaff:"b1-holy-thunder.webp",
 oldClub:"b1-physical-bludgeon.webp",
 mirrorStaff:"moon-mirror.webp",
 dragonStaff:"b1-dragon-feed.webp"
};

test("four weapon options use four existing local illustrations, not emoji-only placeholders",()=>{
 assert.equal(Object.keys(B1_WEAPONS).length,4);
 const inSource=html.slice(html.indexOf("const weaponArt={"),html.indexOf("const weaponArt={")+350);
 for(const [id,file] of Object.entries(artFiles)){
  assert.match(inSource,new RegExp(id+':"'+file.replaceAll(".","\\.")+'"'));
  assert.ok(existsSync(new URL("../v4-1/assets/"+file,import.meta.url)),file+" is shipped with the app");
 }
 assert.match(html,/art=document\.createElement\("img"\)/);
 assert.match(html,/art\.src="\.\/assets\/("\+weaponArt\[id\]|[^\n]+)/);
 assert.match(html,/art\.alt=""/,"decorative picture: accessible weapon name is already on button");
 assert.match(html,/button\.append\(art,info\)/);
 assert.doesNotMatch(html,/button\.append\(symbol,name,detail\)/,"weapon choices no longer rely on emoji symbols");
});

test("image cards preserve weapon selection, accessible names and effects",()=>{
 assert.match(html,/button\.className="b1-weapon-choice b1-weapon-image-choice"/);
 assert.match(html,/info\.append\(name,detail\)/);
 assert.match(html,/button\.setAttribute\("aria-label",w\.name\+"。"\+w\.text\)/);
 assert.match(html,/game\.chooseWeapon\(id\)/);
 assert.match(html,/game\.chooseWeapon\(null\)/);
 const game=createB1Game({seed:7,weaponTrial:true});
 assert.equal(game.snapshot().weaponId,null);
});

test("art has a bounded top region and effect is visible in 3-up landscape",()=>{
 const block=css.slice(css.indexOf("/* Weapon altar: reuse four existing illustrations"));
 assert.ok(block.length>1300);
 assert.match(block,/#weaponChoices \.b1-weapon-choice\.b1-weapon-image-choice\{/);
 assert.match(block,/flex:0 0 49%/);
 assert.match(block,/object-fit:cover/);
 assert.match(block,/\.b1-weapon-info\{[\s\S]*?min-height:0/);
 assert.match(block,/\.b1-weapon-info \.b1-weapon-detail\{[\s\S]*?white-space:normal/);
 assert.match(block,/@media \(orientation:landscape\) and \(max-height:620px\)/);
 assert.match(block,/flex-basis:39%;height:39%/);
 assert.match(block,/@media \(orientation:portrait\) and \(max-width:580px\)/);
 assert.match(block,/flex:0 0 36%;width:36%/);
});

test("installed app update displays the image build consistently",()=>{
 assert.equal(release.build,"2026.10.14.7");
 assert.match(html,/data-b1-build="2026\.10\.14\.7"/);
 assert.match(update,/B1_BUILD = "2026\.10\.14\.7"/);
});
