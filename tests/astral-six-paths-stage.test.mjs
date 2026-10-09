import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import {readFileSync} from "node:fs";

const read=name=>readFileSync(new URL("../v4-1/"+name,import.meta.url),"utf8");
const pilot=read("six-paths-pilot.html");
const old=read("planning.html");
const css=read("six-paths-stage.css");

test("twelve battle pilot reuses the old character stage and combat controls",()=>{
  const stage=old.slice(old.indexOf('  <section class="stage"'),old.indexOf('<div id="futureIntent"')).trim();
  assert(stage.length>500);
  assert(pilot.includes(stage),"original stage, sprites, HP HUD and battle log must remain intact");
  assert.match(pilot,/class="table"/);
  assert.match(pilot,/class="pilot-play"/);
  assert.match(pilot,/id="heroPuppet"/);
  assert.match(pilot,/id="enemyPuppet"/);
  assert.match(pilot,/renderStage\(s,next,incoming\)/);
  assert.match(pilot,/id="effectBadges"/);
});

test("card art stays optional while all actions and saved game isolation survive",()=>{
  for (const id of ["setupPanel","setupChoices","hand","endTurn","journeyPanel","rewardCards","advance","skipReward","restart"]) {
    assert.match(pilot,new RegExp('id="'+id+'"'));
  }
  assert.match(pilot,/game\.play\(index\)/);
  assert.match(pilot,/game\.chooseReward\(id\)/);
  assert.match(pilot,/game\.nextBattle\(\)/);
  assert.match(pilot,/shinka-six-paths-quick-forge-v1/);
  assert.doesNotMatch(pilot,/src="\.\/assets\/.*card.*\.webp"/);
  assert.match(css,/\.pilot-mode \.pilot-card/);
  assert.match(pilot,/href="\.\/planning\.css"/);
});

test("12 enemy slots map to legacy illustrations without modifying the engine roster",()=>{
  for(const id of ["skeleton","mistRogue","wraith","mossSentinel","trial","ashLancer","archive","frostDancer","elite","shadowScribe","bellWarden","moth"])
    assert.match(pilot,new RegExp(id+':"[^"]+\\.webp"'));
  assert.match(pilot,/const encounterId|encounterSet\?\.\[s\.battle-1\]/);
  assert.match(pilot,/aria-valuenow/);
  assert.match(pilot,/e\("battleLog"\)\.textContent/);
});

test("nested grids occupy one full-width arena and card row at landscape sizes",()=>{
  // planning.css uses named areas on .game/.stage/.table. Without these
  // overrides a nested pilot-play grid can create implicit extra columns.
  assert.match(css,/grid-template-areas:"pilot-header" "pilot-progress" "pilot-content"/);
  assert.match(css,/\.pilot-mode #setupPanel,\s*\.pilot-mode #playScreen\s*\{\s*grid-area:pilot-content/);
  assert.match(css,/grid-template-areas:"pilot-arena" "pilot-hand"/);
  assert.match(css,/\.pilot-mode #playScreen > \.stage\s*\{\s*grid-area:pilot-arena/);
  assert.match(css,/\.pilot-mode #playScreen > \.table\s*\{\s*grid-area:pilot-hand/);
  assert.match(css,/\.pilot-mode \.pilot-card \.pilot-card-art/);
});

test("every six-path card renders a reused local image in forge, hand and reward",()=>{
  const {existsSync}=fs;
  const engine=read("six-paths-pilot.mjs");
  const ids=[...engine.slice(engine.indexOf("export const CARDS"),engine.indexOf("export const TALISMANS")).matchAll(/^\s*([a-zA-Z]+)\s*:/gm)].map(hit=>hit[1]);
  assert.equal(ids.length,12);
  const mapping=pilot.slice(pilot.indexOf("const PILOT_CARD_ART"),pilot.indexOf("function illustratedCard"));
  for(const id of ids){
    const hit=mapping.match(new RegExp('\\b'+id+':"([^"]+\\.webp)"'));
    assert(hit,"card "+id+" needs mapped illustration");
    assert(existsSync(new URL("../v4-1/assets/"+hit[1],import.meta.url)),"art missing: "+hit[1]);
  }
  assert.match(pilot,/function illustratedCard\(id\)/);
  assert.match(pilot,/image\.src="\.\/assets\/"\+/);
  assert.match(pilot,/image\.addEventListener\("error"/);
  assert.match(pilot,/btn\.classList\.add\("pilot-start-card"\)/);
  assert.match(pilot,/button=illustratedCard\(id\);button\.disabled/);
  assert.match(pilot,/const button=illustratedCard\(id\);/);
});
