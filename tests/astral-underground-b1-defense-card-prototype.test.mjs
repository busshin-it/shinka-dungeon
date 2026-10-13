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
 assert.match(html,/btn\.dataset\.b1Design="defense-v1"/);
 assert.match(html,/type\.textContent="🛡"/);
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
