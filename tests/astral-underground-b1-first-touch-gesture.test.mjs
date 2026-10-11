import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {b1PointerIntent} from "../v4-1/underground-b1-actions.mjs";
const css=readFileSync(new URL("../v4-1/underground-b1-overlay-hand.css",import.meta.url),"utf8");
const controls=readFileSync(new URL("../v4-1/underground-b1-actions.mjs",import.meta.url),"utf8");
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
test("browser cannot steal initial touch: card pan is disabled but swipe remains in our pointer handler",()=>{
 assert.match(css,/#playScreen #hand\.hand \.pilot-card\{[\s\S]*?touch-action:none/);
 assert.match(css,/-webkit-user-select:none/);
 assert.match(css,/-webkit-touch-callout:none/);
 assert.match(controls,/scrollOrigin:Number\(hand\.scrollLeft\)\|\|0/);
 assert.match(controls,/hand\.scrollLeft=active\.scrollOrigin-\(e\.clientX-active\.x\)/);
 assert.match(controls,/if\(active\.scrolling\)\{/);
 assert.match(controls,/if\(item\.scrolling\)\{/);
 assert.match(controls,/b\.setPointerCapture\(e\.pointerId\)/);
 assert.match(controls,/if\(intent==="drag"\)\{active\.moved=true;beginGhost\(e\);\}/);
 assert.equal(b1PointerIntent(10,-30,"touch"),"drag");
 assert.equal(b1PointerIntent(55,2,"touch"),"scroll");
});
test("card dimensions match the 25% downsize while the full-height mage scene remains",()=>{
 assert.match(css,/--b1-hand-dock:clamp\(236px,33\.75dvh,319px\)/);
 assert.match(css,/flex:0 0 clamp\(169px,11\.25vw,206px\)/);
 assert.match(css, /margin-inline-start:calc\(-1 \* clamp\(27px,2\.475vw,42px\)\)/);
 assert.match(css,/--b1-hand-dock:clamp\(176px,46\.5dvh,248px\)/);
 assert.match(css,/flex:0 0 clamp\(129px,14\.25vw,158px\)/);
 assert.match(css, /--b1-hand-dock:206px/);
 assert.match(css,/background:transparent/);
 assert.match(css,/#playScreen > \.stage\{[\s\S]*?height:100%/);
 for(const id of ["heroPuppet","enemyPuppet","hand","endTurn","enemyLineup"])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('href="./underground-b1-overlay-hand.css"'));
});
