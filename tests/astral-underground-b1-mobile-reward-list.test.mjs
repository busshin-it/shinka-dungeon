import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CARDS,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const file=new URL("../v4-1/underground-b1-playtest.html",import.meta.url);
const html=readFileSync(file,"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-phone-hand-visibility.css",import.meta.url),"utf8");

test("phone portrait and landscape use a readable single-column reward list",()=>{
 assert.match(css,/@media \(orientation:landscape\) and \(max-width:1100px\) and \(max-height:620px\),/);
 assert.match(css,/\(orientation:portrait\) and \(max-width:760px\)/);
 assert.match(css,/#journeyPanel\.b1-reward-open #rewardCards\.pilot-rewards\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/grid-template-columns:clamp\(92px,17vw,155px\) minmax\(0,1fr\)/);
 assert.match(css,/height:auto;min-height:112px;max-height:none/);
 assert.match(css,/flex:1 1 0;min-height:0/);
 assert.match(css,/overflow-y:auto;overflow-x:hidden;touch-action:pan-y/);
 assert.match(css,/#skipReward\{/);
 assert.match(css,/min-height:36px;padding:7px 16px/);
});

test("real card name and FULL effect stay in document flow, away from the art",()=>{
 assert.match(css,/\.pilot-card-copy strong\{[\s\S]*?position:static;inset:auto/);
 assert.match(css,/\.pilot-card-copy strong::before\{\s*content:none/);
 assert.match(css,/\.pilot-card-copy \.desc\{[\s\S]*?white-space:normal;overflow:visible/);
 assert.match(css,/-webkit-line-clamp:unset;line-clamp:unset/);
 assert.match(css,/overflow-wrap:anywhere;color:#f3e9d6/);
 const rewardRender=html.slice(html.indexOf('if(s.phase==="reward"){'),html.indexOf('}else if(s.phase==="between"){'));
 assert.match(rewardRender,/const btn=cardButton\(id\)/);
 assert.match(rewardRender,/btn\.classList\.add\("b1-reward-choice"\)/);
 assert.match(rewardRender,/game\.chooseReward\(id\)/);
 assert.match(html,/desc\.textContent=c\.text/);
 assert.match(html,/skip\.hidden=false/);
});

test("unchanged battle reward keeps exactly three choices",()=>{
 const g=createB1Game({seed:108,testDeck:Array(9).fill("thunderLarge")});
 assert.equal(Object.keys(CARDS).length,85);
 assert.equal(g.selectStarter("scatter"),true);
 let safety=0;
 while(g.snapshot().phase==="battle"&&safety++<60){
  const st=g.snapshot(),idx=st.hand.indexOf("thunderLarge"),target=st.enemies.find(x=>x.hp>0);
  if(idx>=0&&st.energy>=3&&target)g.play(idx,target.id);
  else g.endTurn();
 }
 assert.equal(g.snapshot().phase,"reward");
 assert.equal(g.snapshot().rewards.length,3);
});
