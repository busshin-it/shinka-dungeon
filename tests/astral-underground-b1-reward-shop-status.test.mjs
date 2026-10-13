import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");
const engine=readFileSync(new URL("../v4-1/underground-b1-engine.mjs",import.meta.url),"utf8");

test("reward artwork grows beyond old 70px strip while descriptions stay separate",()=>{
 assert.ok(html.includes('href="./underground-b1-reward-shop-status.css"'));
 assert.ok(html.indexOf("underground-b1-reward-shop-status.css")>html.indexOf("underground-b1-card-visibility.css"));
 assert.match(css,/#rewardCards\.pilot-rewards/);
 assert.match(css,/#rewardCards \.pilot-card\.b1-art-card > :is\(/);
 assert.match(css,/height:58%;flex:0 0 58%/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/max-height:calc\(100dvh - 28px\)/);
});

test("shop lists only rolled three offers and uses original in-game card images for buying/removal",()=>{
 assert.ok(engine.includes('s.shopStock=rollShopStock()'));
 assert.ok(engine.includes("return pool.slice(0,3)"));
 assert.ok(engine.includes("const item=s.shopStock.find"));
 assert.ok(!engine.includes("const item=SHOP_STOCK.find"));
 assert.ok(html.includes("s.shopStock.forEach(item=>"));
 assert.match(html,/const card=getB1Card\(item\.id\),b=cardButton\(item\.id\)/);
 assert.ok(html.includes('b.classList.add("b1-shop-item","b1-shop-offer")'));
 assert.ok(html.includes('const card=getB1Card(id),button=cardButton(id)'));
 assert.ok(html.includes('button.classList.add("b1-shop-purge-card")'));
 assert.match(css,/#shopItems\.b1-shop-items/);
 assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/#shopPurgeCards \.b1-shop-purge-card/);
});

test("buffs and debuffs appear on the player, single enemy and separate enemy actors",()=>{
 assert.ok(html.includes('spot.id=id')); assert.ok(html.includes('"b1HeroEffects"'));
 assert.ok(html.includes('"b1SoloEnemyEffects"'));
 assert.ok(html.includes('b1DisplayConditions(status,b1EnemyConditions(e,s))'));
 assert.ok(html.includes('b1DisplayConditions(el("b1HeroEffects"),b1HeroConditions(s))'));
 assert.ok(html.includes('b1DisplayConditions(el("b1SoloEnemyEffects"),b1EnemyConditions(enemy,s))'));
 for(const status of ["防御","攻撃上昇","弱体","毒","脆弱","混乱","幻覚","呪い","追加ドロー"]){
  assert.ok(html.includes(status),status);
 }
 assert.match(css,/#b1HeroEffects,/);
 assert.match(css,/\.b1-enemy-lineup \.b1-actor-status\.b1-effect-row/);
 assert.match(css,/\.b1-effect-chip\.b1-effect-debuff/);
 assert.match(css,/\.b1-effect-chip\.b1-effect-buff/);
});

test("short landscape viewport has a bounded full-height hand and card choice overlays",()=>{
 assert.match(css,/@media \(orientation:landscape\) and \(max-height:650px\)/);
 assert.match(css,/--b1-hand-dock:clamp\(155px,36dvh,215px\)/);
 assert.match(css,/#playScreen > \.table\{bottom:0\}/);
 assert.match(css,/#journeyPanel \.pilot-overlay-window\{max-height:calc\(100dvh - 16px\)/);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const result=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});
 assert.equal(result.status,0,result.stderr);
});

test("B1 status rows align to the visible head of each sprite, not the puppet slot top",()=>{
 assert.match(html,/function b1PositionRow\(owner,row,img\)/);
 assert.match(html,/const picturedTop=rect\.top\+\(rect\.height-img\.naturalHeight\*scale\)\/2/);
 assert.match(html,/picturedTop-row\.offsetHeight-8/);
 assert.match(html,/figure\.append\(status\)/);
 assert.match(html,/for\(const figure of el\("enemyLineup"\)\.querySelectorAll\("\.b1-actor-figure"\)\)/);
 assert.match(html,/window\.addEventListener\("resize",/);
 assert.match(css,/body\.pilot-mode #playScreen \.b1-effect-chip\{/);
 assert.match(css,/font-size:20px;font-weight:850/);
 assert.match(css,/\.b1-effect-buff\{/);
 assert.match(css,/\.b1-effect-debuff\{/);
});

test("upgrade choice opens fullscreen, independently of regular rest and shop",()=>{
 assert.match(html,/el\("journeyPanel"\)\.classList\.add\("b1-upgrade-open"\)/);
 assert.match(html,/el\("journeyPanel"\)\.classList\.remove\("b1-upgrade-open"\)/);
 assert.match(html,/const panel=el\("journeyPanel"\);panel\.classList\.remove\("b1-upgrade-open"\)/);
 assert.match(css,/#journeyPanel\.b1-upgrade-open/);
 assert.match(css,/height:100dvh;min-height:0;max-height:none/);
 assert.match(css,/#restUpgradeCards\.b1-rest-upgrades/);
 assert.match(css,/grid-template-columns:repeat\(auto-fill,minmax\(176px,1fr\)\)/);
 assert.match(css,/#journeyPanel\.b1-upgrade-open #restBack/);
 assert.match(css,/\.b1-upgrade-image-choice \.b1-upgrade-effects/);
});

test("two enemy art is enlarged in its own layout without intercepting target clicks",()=>{
 assert.match(css,/#playScreen \.b1-enemy-lineup\.b1-two\{/);
 assert.match(css, /max-width:clamp\(155px,28vw,360px\)/);
 assert.match(css,/\.b1-two \.b1-actor-figure img\{/);
 assert.match(css,/pointer-events:none/);
 assert.match(html,/b\.addEventListener\("click",\(\)=>actions\.handleTargetClick\(e\.id\)\)/);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const check=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});
 assert.equal(check.status,0,check.stderr);
});
