import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,getB1Card,STAGES,getB1RewardPool,createB1Game} from "../v4-1/underground-b1-engine.mjs";
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");

const start=html.indexOf("function b1EvolutionEffectText(");
const end=html.indexOf("\nfunction b1EvolutionCompareBlock(",start);
assert.ok(start>=0&&end>start,"upgrade formatter present");
const formatter=Function("return ("+html.slice(start,end).trim()+")")();

test("every one of 65 existing upgrades has a Japanese, readable full effect, not raw internal stat keys",()=>{
 assert.equal(Object.keys(CARDS).length,85);
 for(const id of Object.keys(CARDS)){
  const current=getB1Card(id),future=getB1Card(id+"~");
  assert.ok(current&&future,id);
  const effect=formatter(current,future);
  assert.ok(effect&&effect.length>2,id);
  assert.ok(!/（(?:damage|block|heal|poison|weaken|vulnerable|energyGain|draw|strengthGain|powerDraw)＋\d+）/.test(effect),id+" has internal key");
  assert.ok(!effect.includes("（魔力－1）"),id+" has a duplicated mana note");
 }
});
test("representative before/after comparisons reflect the exact engine upgrades",()=>{
 for(const [id,expected] of Object.entries({
  basicAttack:"8ダメージ",basicDefense:"防御8",spark:"6ダメージ",
  focus:"ドロー＋2",flow:"3枚引く",charge:"魔力＋2",
  strength:"攻撃威力＋3",poison:"毒6",frost:"6ダメージ"
 })){
  const out=formatter(getB1Card(id),getB1Card(id+"~"));
  assert.ok(out.includes(expected),id+": "+out);
 }
 const costCard=formatter(getB1Card("adversity"),getB1Card("adversity~"));
 assert.equal(costCard,getB1Card("adversity").text);
 assert.equal(getB1Card("adversity~").cost,0);
});

test("full-screen gold upgrade choices contain actual current and evolved effects and remain selectable",()=>{
 assert.match(html,/card\.classList\.add\("b1-rest-upgrade-card","b1-upgrade-image-choice","b1-evolution-choice"\)/);
 assert.match(html,/b1EvolutionCompareBlock\("現在の効果",current\.text,current\.cost,"before"\)/);
 assert.match(html,/b1EvolutionCompareBlock\(upgraded\?"進化済み":"✦ 進化後の効果",futureText,future\.cost,"after"\)/);
 assert.match(html,/copy\.append\(name,before,meta\)/);
 assert.match(html,/card\.disabled=upgraded/);
 assert.match(html,/game\.chooseRest\("upgrade",index\)/);
 assert.match(css,/#journeyPanel\.b1-upgrade-open \.b1-evolution-choice/);
 assert.match(css,/\.b1-evolution-choice \.b1-evolution-after/);
 assert.match(css,/\.b1-evolution-choice \.b1-evolution-text/);
 assert.match(css,/minmax\(255px,1fr\)/);
});
test("reward visual overhaul preserves exactly three legal choices from expanded stage pools",()=>{
 assert.match(html,/panel\.classList\.toggle\("b1-reward-open",s\.phase==="reward"\)/);
 assert.match(html,/btn\.classList\.add\("b1-reward-choice"\)/);
 assert.match(html,/game\.chooseReward\(id\)/);
 assert.match(css,/#journeyPanel\.b1-reward-open #rewardCards \.b1-reward-choice/);
 assert.match(css,/height:clamp\(390px,65dvh,565px\)/);
 assert.match(css,/\.b1-reward-choice \.pilot-card-copy strong/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 const g=createB1Game({seed:101,testDeck:Array(12).fill("thunderLarge")});
 assert.equal(g.selectStarter("scatter"),true);
 while(g.snapshot().phase==="battle"){
  const s=g.snapshot(),index=s.hand.indexOf("thunderLarge"),target=s.enemies.find(e=>e.hp>0);
  if(index>=0&&s.energy>=3)g.play(index,target.id);
  else g.endTurn();
 }
 assert.equal(g.snapshot().phase,"reward");
 assert.equal(g.snapshot().rewards.length,3);
 assert.deepEqual(g.snapshot().rewards.filter(x=>getB1RewardPool(0,g.snapshot().deck).includes(x)),g.snapshot().rewards);
 assert.equal(g.chooseReward(g.snapshot().rewards[0]),true);
});
test("game inline module and stylesheet references stay syntactically valid",()=>{
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const res=spawnSync(process.execPath,["--input-type=module","--check"],{input:script,encoding:"utf8"});
 assert.equal(res.status,0,res.stderr);
 assert.ok(html.includes('href="./underground-b1-reward-shop-status.css"'));
});
