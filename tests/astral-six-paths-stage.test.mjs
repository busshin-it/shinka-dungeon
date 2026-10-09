import test from "node:test";
import assert from "node:assert/strict";
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
