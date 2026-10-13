import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,STAGES} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");

test("one scroll surface: the upgrade grid, not each card's text pane",()=>{
 const ix=css.lastIndexOf("/* B1 2026-10-13 scrolling root fix.");
 assert.ok(ix>=0,"root scrolling fix must come AFTER legacy rules");
 const patch=css.slice(ix);
 assert.match(patch,/#restUpgradeCards\.b1-rest-upgrades\{[\s\S]*overflow-y:auto;/);
 assert.match(patch,/\.b1-evolution-choice\{[\s\S]*height:auto;/);
 assert.match(patch,/\.b1-evolution-choice > \.pilot-card-copy\{[\s\S]*overflow:visible;/);
 assert.match(patch,/\.b1-evolution-choice \.b1-upgrade-effects\{[\s\S]*overflow:visible;/);
 assert.match(patch,/touch-action:pan-y/);
 assert.doesNotMatch(patch,/overflow\\s*:\\s*auto\\s*;/);
 assert.match(css,/\.pilot-overlay-window\{[\s\S]*height:100dvh;min-height:0;max-height:100dvh;[\s\S]*overflow:hidden/);
});
test("wheel anywhere over cards scrolls the list and offers keyboard access",()=>{
 assert.match(html,/const b1UpgradeGrid=el\("restUpgradeCards"\)/);
 assert.match(html,/b1UpgradeGrid\.setAttribute\("tabindex","0"\)/);
 assert.match(html,/b1UpgradeGrid\.setAttribute\("aria-label","強化するカード一覧"\)/);
 assert.match(html,/b1UpgradeGrid\.addEventListener\("wheel",event=>/);
 assert.match(html,/event\.deltaMode===1\?18:event\.deltaMode===2\?b1UpgradeGrid\.clientHeight:1/);
 assert.match(html,/event\.preventDefault\(\)/);
 assert.match(html,/b1UpgradeGrid\.scrollTop=next/);
 assert.match(html,/\{passive:false\}/);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const syntaxCheck=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});
 assert.equal(syntaxCheck.status,0,syntaxCheck.stderr);
});
test("legacy stage base contains 44, expanded extras make 60 of 65 available",()=>{
 const cards=Object.keys(CARDS);
 const rewardNames=new Set(STAGES.flatMap(stage=>stage.rewards));
 const omitted=cards.slice(0,65).filter(id=>!rewardNames.has(id));
 assert.equal(cards.length,85);
 assert.equal(STAGES.length,12);
 assert.equal(rewardNames.size,44);
 assert.deepEqual(omitted,["basicAttack","basicDefense","bolt","guard","break",
  "fireSmall","fireMedium","fireLarge","darkBolt","doping",
  "dragonEgg","dragonFeed","dragonBreath",
  "lightningFlash","lightningFork","lightningSweep","lightningRelay",
  "shieldMoss","shieldMirror","shieldSpore","shieldIncubate"]);
 for(const stage of STAGES.slice(0,-1))assert.equal(stage.rewards.length,9);
 assert.equal(STAGES.at(-1).rewards.length,0);
});
