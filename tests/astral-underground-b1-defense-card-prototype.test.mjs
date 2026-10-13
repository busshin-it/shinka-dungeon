import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,getB1Card} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-defense-prototype.css",import.meta.url),"utf8");

test("defense visual experiment only opts in one basicDefense card",()=>{
 assert.match(html,/if\(id==="basicDefense"\)\{/);
 assert.match(html,/btn\.classList\.add\("b1-defense-prototype"\)/);
 assert.match(html,/btn\.dataset\.b1Design="defense-v2"/);
 assert.match(html,/type\.textContent=""/);
 assert.doesNotMatch(html,/if\(id==="guard"\).*b1-defense-prototype/);
 assert.equal(Object.keys(CARDS).length,57);
 assert.equal(getB1Card("basicDefense").name,"防御");
 assert.equal(getB1Card("basicDefense").cost,1);
 assert.equal(getB1Card("basicDefense").text,"防御5");
 assert.equal(getB1Card("basicDefense").block,5);
 assert.equal(getB1Card("guard").name,"守り");
});
test("all preview contexts use the same opt-in protective frame without disturbing hand actions",()=>{
 const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(styles.at(-1),"./underground-b1-defense-prototype.css");
 assert.equal(styles.at(-2),"./underground-b1-reward-shop-status.css");
 for(const selector of [
  ".pilot-card.b1-defense-prototype","body.pilot-mode #playScreen #hand.hand .pilot-card.b1-defense-prototype",
  "body.pilot-mode .b1-card-preview .pilot-card.b1-defense-prototype",
  "body.pilot-mode #rewardCards .pilot-card.b1-defense-prototype",
  "body.pilot-mode .b1-catalog-item .pilot-card.b1-defense-prototype"
 ])assert.ok(css.includes(selector),selector);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/--b1-defense-art-share:65%/);
 assert.match(css,/min-height:0/);
 assert.match(css,/overflow:hidden/);
 assert.match(css,/\.pilot-card-copy \.desc/);
 assert.match(css,/\.pilot-card-copy strong/);
 assert.ok(!css.includes("touch-action:auto"),"do not disable drag actions");
 assert.ok(!css.includes("user-select:text"),"do not change touch selection");
});
test("card renderer module remains parseable and card mechanics unchanged",()=>{
 const src=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(src);
 const res=spawnSync(process.execPath,["--check","--input-type=module"],{input:src,encoding:"utf8"});
 assert.equal(res.status,0,res.stderr);
 assert.match(html,/btn\.setAttribute\("aria-label",c\.name\+"、魔力"\+c\.cost\+"。"\+c\.text\)/);
});

test("V2 art-led hierarchy matches the approved mockup while retaining the real card data",()=>{
 assert.match(css,/--b1-defense-art-share:65%/);
 assert.match(css,/background:radial-gradient\(circle at 35% 20%/);
 assert.match(css,/> \.type::before/);
 assert.match(css,/> \.type::after/);
 assert.match(css,/clip-path:polygon\(50% 0,100% 14%/);
 assert.match(css,/\.pilot-card-copy strong::before/);
 assert.match(css,/content:"✦"/);
 assert.match(css,/\.pilot-card-copy \.desc::before/);
 assert.match(css,/\.pilot-card-copy strong\{/);
 assert.match(css,/\.pilot-card-copy \.desc\{/);
 assert.match(css,/\.pilot-card\.b1-defense-prototype:not\(\.b1-evolution-choice\)/);
 assert.match(css,/background:linear-gradient\(150deg,#0a1b30/);
 assert.ok(!css.includes("overflow:auto"),"no in-card scrollbars for basic defense");
 assert.equal(getB1Card("basicDefense").text,"防御5");
 assert.equal(getB1Card("basicDefense~").text.includes("防御"),true);
});
test("V2 excludes evolution-comparison cards so the approved evolution UI stays independent",()=>{
 const baseline=css.slice(0,css.indexOf("/* Small fanned hand cards"));
 for(const m of baseline.matchAll(/body\.pilot-mode \.pilot-card\.b1-defense-prototype[^\{]*\{/g)){
  assert.ok(m[0].includes(":not(.b1-evolution-choice)"),m[0]);
 }
 assert.match(css,/#playScreen #hand\.hand/);
 assert.match(css,/#rewardCards/);
 assert.match(css,/\.b1-catalog-item/);
 assert.match(css,/#shopItems/);
 assert.match(css,/#shopPurgeCards/);
});

test("hand-size defense card uses flowing title/effect and stays clear of overlap",()=>{
 const hand=css.slice(css.indexOf("/* V3: compact defense card"));
 assert.ok(hand.length>2000,"dedicated compact layout exists");
 assert.match(hand,/#playScreen #hand\.hand \.pilot-card\.b1-defense-prototype:not\(\.b1-evolution-choice\)/);
 assert.match(hand,/--b1-defense-art-share:64%/);
 assert.match(hand,/> \.pilot-card-copy\{/);
 assert.match(hand,/position:relative;display:flex;flex:1 1 0;flex-direction:column/);
 assert.match(hand,/overflow:visible/);
 assert.match(hand,/\.pilot-card-copy strong\{/);
 assert.match(hand,/position:relative;z-index:7;/);
 assert.match(hand,/top:auto;bottom:auto;left:auto;right:auto/);
 assert.match(hand,/margin:-12px -5px 0/);
 assert.match(hand,/\.pilot-card-copy \.desc\{/);
 assert.match(hand,/flex:1 1 auto;min-height:22px/);
 assert.match(hand,/background:transparent;color:#fff0d5!important/);
 assert.match(hand,/@media \(orientation:landscape\) and \(max-height:600px\)/);
 assert.match(hand,/@media \(orientation:landscape\) and \(max-height:350px\)/);
 assert.match(hand,/@media \(orientation:portrait\) and \(max-width:900px\)/);
 assert.ok(!hand.includes("touch-action:")&&!hand.includes("pointer-events:none"),
  "do not disable tap/drag hitboxes");
 assert.ok(!hand.includes("height:100vh")&&!hand.includes("transform:rotate"),
  "do not change arena or hand fan dimensions");
});
test("approved full-size and evolution designs remain intact alongside the hand-only fix",()=>{
 const handStart=css.indexOf("/* V3: compact defense card");
 const original=css.slice(0,handStart);
 assert.match(original,/\.b1-card-preview \.pilot-card\.b1-defense-prototype/);
 assert.match(original,/#rewardCards \.pilot-card\.b1-defense-prototype/);
 assert.match(original,/#shopItems \.pilot-card\.b1-defense-prototype/);
 assert.match(original,/\.b1-evolution-choice/);
 assert.match(html,/if\(id==="basicDefense"\)/);
 assert.match(html,/btn\.dataset\.b1Design="defense-v2"/);
 assert.equal(getB1Card("basicDefense").block,5);
 assert.equal(getB1Card("basicDefense").cost,1);
});
