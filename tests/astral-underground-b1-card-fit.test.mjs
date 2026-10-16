import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../v4-1/underground-b1-journey.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-card-fit.css",import.meta.url),"utf8");

test("15-floor layout fix is loaded last and leaves the other game untouched",()=>{
 const link='<link rel="stylesheet" href="./underground-b1-card-fit.css">';
 assert.ok(html.includes(link));
 assert.ok(html.indexOf(link)>html.indexOf("underground-b1-reward-weapon-affinity.css"));
 assert.ok(html.indexOf(link)<html.indexOf("</head>"));
 assert.ok(css.includes("body.pilot-mode #journeyPanel"));
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test("four early choices have two mobile landscape columns and a scrollable grid",()=>{
 const landscape=css.slice(css.indexOf("@media (orientation:landscape) and (max-width:1100px)"));
 assert.match(landscape,/#rewardCards\.b1-early-double-draft\s*\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(landscape,/grid-template-rows:none;grid-auto-rows:max-content/);
 assert.match(landscape,/max-height:none;height:auto;min-height:0;overflow-y:auto;overflow-x:hidden/);
 assert.match(css,/#rewardCards\.b1-early-double-draft\{/);
});

test("full effect and name remain readable without a scroll trap in reward cards",()=>{
 assert.match(css,/#rewardCards \.b1-reward-choice > \.pilot-card-copy\{[^}]*overflow:visible/s);
 assert.match(css,/#rewardCards \.b1-reward-choice \.pilot-card-copy strong\{[^}]*position:static/s);
 assert.match(css,/#rewardCards \.b1-reward-choice \.pilot-card-copy \.desc\{[^}]*max-height:none/s);
 assert.match(css,/#rewardCards \.b1-reward-choice \.pilot-card-copy \.desc\{[^}]*-webkit-line-clamp:unset/s);
 assert.match(css,/#rewardCards\.pilot-rewards\{[^}]*overflow-y:auto/s);
});

test("event rewards and shop cards let longer effects expand",()=>{
 assert.match(css,/#b1EventOptions\.b1-event-blood-grid \.b1-blood-choice\{[^}]*height:auto/s);
 assert.match(css,/#b1EventOptions\.b1-event-blood-grid \.b1-blood-choice \.pilot-card-copy\{[^}]*overflow:visible/s);
 assert.match(css,/#shopItems \.b1-shop-offer\{[^}]*height:auto/s);
 assert.match(css,/#shopItems \.b1-shop-offer \.pilot-card-copy \.desc\{[^}]*-webkit-line-clamp:unset/s);
});
