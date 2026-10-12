import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {BASIC_STARTER,STARTER,CARDS,createB1Game,STAGES} from "../v4-1/underground-b1-engine.mjs";
import {nextCard,artPrompt,buildIndex} from "../asset-factory/b1-card-auto.mjs";
import {B1_AUTO_CARD_ART} from "../v4-1/b1-auto-card-index.mjs";

const queue=JSON.parse(readFileSync(new URL("../asset-factory/b1-card-queue.json",import.meta.url),"utf8"));
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const yaml=readFileSync(new URL("../.github/workflows/b1-card-art-auto.yml",import.meta.url),"utf8");

test("the standard 12-fight game starts with attack x5 and defense x5 only",()=>{
 assert.equal(STAGES.length,12);
 assert.equal(BASIC_STARTER.length,10);
 assert.equal(BASIC_STARTER.filter(id=>id==="basicAttack").length,5);
 assert.equal(BASIC_STARTER.filter(id=>id==="basicDefense").length,5);
 assert.equal(CARDS.basicAttack.name,"攻撃");assert.equal(CARDS.basicAttack.damage,6);
 assert.equal(CARDS.basicDefense.name,"防御");assert.equal(CARDS.basicDefense.block,5);
 assert.equal(CARDS.basicAttack.magicArt,"basic-attack");
 assert.equal(CARDS.basicDefense.magicArt,"basic-defense");
 const g=createB1Game({seed:41});
 assert.deepEqual(g.snapshot().deck,BASIC_STARTER);
 assert.equal(g.selectStarter("basic"),true);
 const s=g.snapshot();
 assert.equal(s.stage,0);assert.equal(s.phase,"battle");
 assert.ok(s.hand.every(id=>["basicAttack","basicDefense"].includes(id)));
 assert.equal(s.enemies[0].maxHp,28);
 assert.equal(s.intents[0].damage,5);
 assert.equal(Object.keys(CARDS).length,57);
});
test("advanced legacy starters and boss practice still work in isolation",()=>{
 assert.equal(STARTER.length,9);
 const g=createB1Game({seed:22});assert.equal(g.selectStarter("scatter"),true);
 assert.equal(g.snapshot().deck.length,STARTER.length+1);
 const boss=createB1Game({seed:12});assert.equal(boss.startBossPractice("ideal"),true);
 assert.equal(boss.snapshot().stage,11);
 assert.ok(boss.snapshot().deck.includes("bolt"));
});
test("the scene shows one clear basic start and keeps advanced modes behind details",()=>{
 assert.match(html,/id="basicStarterOpen"/);
 assert.match(html,/game\.selectStarter\("basic"\)/);
 assert.match(html,/class="b1-advanced-start"/);
 assert.match(html,/攻撃5枚・防御5枚/);
 assert.match(html,/"basic-attack":"b1-starter-attack.webp"/);
 assert.match(html,/"basic-defense":"b1-starter-defense.webp"/);
 assert.match(html,/B1_AUTO_CARD_ART/);
 assert.match(html,/b1VisualKey\(id,c\)/);
});
test("all missing cards can run in a separate bounded auto art queue, never changing existing puppet queue",()=>{
 assert.equal(queue.jobs.length,25);
 assert.equal(queue.max_total_attempts,2);
 assert.equal(new Set(queue.jobs.map(j=>j.card_id)).size,25);
 assert.equal(new Set(queue.jobs.map(j=>j.filename)).size,25);
 for(const job of queue.jobs){
  assert.ok(CARDS[job.card_id],job.card_id);
  assert.equal(job.filename,"b1-auto-"+job.card_id+".webp");
  assert.match(artPrompt(queue,job),/文字・数字・カード枠|文字、数字、UI|文字、数字、カード枠/);
 }
 assert.equal(nextCard({...queue,enabled:false}),null);
 const first=nextCard(queue);assert.equal(first.card_id,"scatter");
 assert.equal(nextCard({...queue,jobs:queue.jobs.map(j=>({...j,status:"published"}))}),null);
 assert.ok(yaml.includes("schedule:")&&yaml.includes("workflow_dispatch:"));
 assert.ok(yaml.includes("b1-card-art-main"));
 assert.ok(yaml.includes("node asset-factory/b1-card-auto.mjs"));
 assert.ok(!yaml.includes("asset-factory/worker.mjs"));
 assert.match(yaml,/17|11/);
});
test("only QA-approved published images enter the static game index",()=>{
 assert.deepEqual(B1_AUTO_CARD_ART,{});
 const queued=JSON.parse(JSON.stringify(queue));
 queued.jobs[0].status="published";
 const src=buildIndex(queued);
 assert.ok(src.includes('"scatter": "b1-auto-scatter.webp"')||src.includes('"scatter":"b1-auto-scatter.webp"'));
 assert.ok(!src.includes('"chain":'));
 assert.ok(existsSync(new URL("../v4-1/assets/b1-starter-attack.webp",import.meta.url)));
 assert.ok(existsSync(new URL("../v4-1/assets/b1-starter-defense.webp",import.meta.url)));
});
