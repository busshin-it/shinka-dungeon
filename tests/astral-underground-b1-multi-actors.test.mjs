import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createB1Game,STAGES} from "../v4-1/underground-b1-engine.mjs";
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-actors.css",import.meta.url),"utf8");
const controls=readFileSync(new URL("../v4-1/underground-b1-actions.mjs",import.meta.url),"utf8");
const fx=readFileSync(new URL("../v4-1/underground-b1-feedback.mjs",import.meta.url),"utf8");
test("B1 boss battle has three independently selectable enemies with distinct HP and intent",()=>{
 const g=createB1Game({seed:1001,testDeck:Array(10).fill("lightning")});
 assert.equal(g.startBossPractice("test"),true);
 const s=g.snapshot();
 assert.deepEqual(s.enemies.map(e=>e.id),["left","boss","right"]);
 assert.deepEqual(s.enemies.map(e=>e.hp),[24,135,24]);
 assert.equal(s.intents.length,3);
 const initial=s.enemies.map(e=>e.hp);
 assert.equal(g.play(s.hand.indexOf("lightning"),"right"),true);
 const t=g.snapshot();
 assert.equal(t.enemies[0].hp,initial[0]);
 assert.equal(t.enemies[1].hp,initial[1]);
 assert.equal(t.enemies[2].hp,initial[2]-13);
});
test("other simultaneous battles also expose two different roles rather than one swapped puppet",()=>{
 assert.equal(STAGES[1].enemies.length,2);
 assert.equal(STAGES.at(-1).enemies.length,3);
 assert.match(html,/s\.enemies\.length>1/);
 assert.match(html,/s\.enemies\.length===2/);
 assert.match(html,/stage\.classList\.toggle\("b1-multi",many\)/);
 assert.match(html,/lineup\.hidden=!many/);
});
test("lineup renders a targetable actor for every combatant with sprite, HP bar, intent and status",()=>{
 assert.match(html,/id="enemyLineup" class="b1-enemy-lineup"/);
 for(const p of ["b.dataset.b1Enemy=e.id","b1-enemy-actor","b1-actor-figure","b1-actor-name","b1-actor-hpbar","b1-actor-intent","b1-actor-status","b1-actor-cast","channelDamage","B1_BOSS_CHANNEL_THRESHOLD"])
  assert.ok(html.includes(p),"missing actor UI: "+p);
 assert.match(html,/b\.addEventListener\("click",\(\)=>actions\.handleTargetClick\(e\.id\)\)/);
 assert.match(html,/b\.disabled=e\.hp<=0/);
 assert.match(html,/b\.setAttribute\("aria-label",/);
 assert.match(html,/choices:el\("enemyLineup"\)/);
});
test("B1 hides the original single-enemy puppet only when the full lineup is active",()=>{
 assert.match(css,/\.stage\.b1-multi #enemyPuppet/);
 assert.match(css,/\.stage\.b1-multi \.enemy-hud/);
 assert.match(css,/\.b1-enemy-lineup\.b1-two/);
 assert.match(css,/\.b1-enemy-actor\[aria-pressed=true\]/);
 assert.match(css,/\.b1-enemy-actor\.b1-drop-target/);
 assert.match(css,/@media\(max-width:430px\)/);
 assert.match(html,/class="puppet hero-puppet"/);
 assert.match(html,/src="\.\/assets\/hero\.webp"/);
});
test("drag targeting and action feedback animate actual selected actor, not the old hidden puppet",()=>{
 assert.match(controls,/choices\.querySelectorAll\("\[data-b1-enemy\]"\)/);
 assert.match(controls,/node\.closest\("\[data-b1-enemy\]"\)/);
 assert.match(controls,/stage\.classList\.contains\("b1-multi"\)/);
 assert.match(fx,/const anchorFor=id=>buttonFor\(id\)\|\|enemy/);
 assert.match(fx,/shake\(anchorFor\(old\.id\)\)/);
 assert.match(fx,/spellImpact\(anchorFor\(id\),i\*75\)/);
 assert.match(fx,/before\.intents/);
 assert.match(css,/b1-spell-trail/);
});
test("B1 application and animation modules are parseable JS",()=>{
 const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(source);
 const r=spawnSync(process.execPath,["--check","--input-type=module"],{input:source,encoding:"utf8"});
 assert.equal(r.status,0,r.stderr);
 for(const file of ["underground-b1-actions.mjs","underground-b1-feedback.mjs"]){
  const p=spawnSync(process.execPath,["--check",new URL("../v4-1/"+file,import.meta.url).pathname],{encoding:"utf8"});
  assert.equal(p.status,0,p.stderr);
 }
});
