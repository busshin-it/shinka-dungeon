import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {STAGES,B1_FORK_ROUTES,CARDS} from "../v4-1/underground-b1-engine.mjs";

const read=p=>readFileSync(new URL("../v4-1/"+p,import.meta.url),"utf8");
const actions=read("underground-b1-actions.mjs");
const css=read("underground-b1-reward-shop-status.css");
const html=read("underground-b1-playtest.html");

test("hand inspection is substantially larger than 190-230px hand and works on mouse hover and touch selection",()=>{
 assert.match(actions,/Math\.min\(390,window\.innerWidth\*\.82,heightBound\/1\.39\)/);
 assert.match(actions,/Math\.min\(window\.innerHeight\*\.78,560\)/);
 assert.match(actions,/pointerenter",e=>\{if\(e\.pointerType==="mouse"&&!active\)showPreview\(button\)/);
 assert.match(actions,/button\.addEventListener\("click",\(\)=>handleCardClick\(index\)\)/);
 assert.match(actions,/if\(!button\|\|active\?\.moved\|\|read\(\)\.phase!=="battle"\)return/);
 assert.match(actions,/fullDescription\.dataset\.b1FullDesc/);
 assert.doesNotMatch(actions,/Math\.min\(window\.innerHeight<450\?168:224/);
 const result=spawnSync(process.execPath,["--check","--input-type=module"],{input:actions,encoding:"utf8"});
 assert.equal(result.status,0,result.stderr);
});

test("upgrade has exactly one touch-friendly full-page scroll container, with no nested hidden grid scroll",()=>{
 const start=css.indexOf("/* B1 usability 2026-10-13");
 assert.ok(start>=0);
 const rule=css.slice(start);
 assert.match(rule,/\.pilot-overlay-window\{[\s\S]*overflow-y:auto;overflow-x:hidden/);
 assert.match(rule,/height:100dvh;max-height:100dvh/);
 assert.match(rule,/touch-action:pan-y/);
 assert.match(rule,/#restSite\{[\s\S]*height:auto;min-height:0;max-height:none;[\s\S]*overflow:visible/);
 assert.match(rule,/#restUpgradeCards\.b1-rest-upgrades\{[\s\S]*flex:none;height:auto;min-height:0;max-height:none;[\s\S]*overflow:visible/);
 assert.match(rule,/#restBack\{[\s\S]*position:sticky;bottom:0/);
 assert.match(rule,/#restBack\[hidden\]\{display:none\}/);
 assert.match(html,/id="restUpgradeCards"/);
});

test("all role art mappings are supernatural monsters, not human portraits",()=>{
 const m=html.match(/const art=\{([\s\S]*?)\};/);
 assert.ok(m);
 const mapped=[...m[1].matchAll(/\b(\w+):"([^"]+)"/g)].map(v=>({role:v[1],filename:v[2]}));
 const expected=["rat","wolf","imp","guard","carapace","ritual","elite","boss","archer","watcher","venom","berserker","healer","breaker","banner","warder"];
 assert.deepEqual(mapped.map(x=>x.role).slice().sort(),expected.slice().sort());
 for(const {role,filename} of mapped){
  assert.ok(["wraith.webp","bell-spirit.webp","boss.webp"].includes(filename),role+" must use a monster painting");
 }
 assert.match(html,/image\.src="\.\/assets\/"\+\(art\[e\.role\]\|\|"bell-spirit\.webp"\)/);
 assert.match(html,/el\("enemyArt"\)\.src="\.\/assets\/"\+\(art\[enemy\.role\]\|\|"bell-spirit\.webp"\)/);
 assert.ok(!m[1].includes("librarian-noa.webp"));
 assert.ok(!m[1].includes("gatekeeper.webp"));
 assert.ok(!m[1].includes("bow-watcher.webp"));
 assert.ok(!m[1].includes("tide-star-sentinel.webp"));
});

test("enemy display names are monsters, encounter roles and balance are unchanged",()=>{
 assert.equal(STAGES.length,12);
 assert.equal(Object.keys(CARDS).length,57);
 const names=[...STAGES.flatMap(x=>x.enemies.map(e=>e.name)),...B1_FORK_ROUTES.stone.enemies.map(e=>e.name)];
 for(const name of names)assert.doesNotMatch(name,/治療師|弓兵|呪術師|番兵|破盾兵|旗手|毒遣い|狂戦士|祭司|監視者|盾守/);
 assert.equal(STAGES[6].enemies.find(e=>e.id==="healer2").role,"healer");
 assert.equal(STAGES[6].enemies.find(e=>e.id==="healer2").maxHp,21);
 assert.equal(STAGES[8].enemies.find(e=>e.id==="mistArcher").role,"archer");
 assert.equal(STAGES[8].enemies.find(e=>e.id==="mistArcher").maxHp,29);
 assert.equal(STAGES[11].enemies.find(e=>e.id==="boss").role,"boss");
 assert.equal(STAGES[11].enemies.find(e=>e.id==="boss").maxHp,135);
});
