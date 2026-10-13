import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {CARDS,STAGES,STARTER,BASIC_B1_STARTER,PHYSICAL_STARTER,getB1RewardPool,createB1Game} from "../v4-1/underground-b1-engine.mjs";

const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");

test("engine detects exhausted, unusable and 0-cost playable hands without changing a turn",()=>{
 const g=createB1Game({seed:101,testDeck:Array(5).fill("charge")});
 assert.equal(g.startBossPractice("test"),true);
 const initial=g.snapshot();
 assert.equal(initial.phase,"battle");
 assert.equal(g.hasPlayableCard(),true);
 for(let i=0;i<5;i++)assert.equal(g.play(0),true);
 assert.equal(g.snapshot().phase,"battle");
 assert.equal(g.hasPlayableCard(),false);
 assert.equal(g.snapshot().turn,initial.turn,"detecting playable moves never advances time");
 assert.equal(g.endTurn(),true);
 assert.equal(g.snapshot().turn,initial.turn+1);
 const dragon=createB1Game({seed:102,testDeck:Array(5).fill("dragonFeed")});
 assert.equal(dragon.startBossPractice("test"),true);
 assert.equal(dragon.hasPlayableCard(),false,"dragon feed cannot be used without a dragon");
});

test("zero-cost spark remains a valid move even when the player's energy is exhausted",()=>{
 const deck=[...Array(8).fill("basicAttack"),...Array(5).fill("spark")];
 let checked=false;
 for(let seed=1;seed<=250&&!checked;seed++){
  const g=createB1Game({seed,testDeck:deck});
  assert.equal(g.startBossPractice("test"),true);
  let state=g.snapshot(),attacks=state.hand.filter(id=>id==="basicAttack").length;
  if(attacks<3||!state.hand.includes("spark"))continue;
  for(let n=0;n<3;n++){
   const i=g.snapshot().hand.indexOf("basicAttack");
   assert.equal(g.play(i,"boss"),true);
  }
  assert.equal(g.snapshot().energy,0);
  assert.equal(g.hasPlayableCard(),true,"spark can still be played at 0 energy");
  const i=g.snapshot().hand.indexOf("spark");
  assert.ok(i>=0);assert.equal(g.play(i,"boss"),true);
  checked=true;
 }
 assert.equal(checked,true,"a test seed must present both attack and spark");
});

test("auto-pass runs only when no card is playable, with time to inspect and a recheck",()=>{
 assert.match(html,/function b1ScheduleAutoEnd\(state\)/);
 assert.match(html,/game\.hasPlayableCard\(\)/);
 assert.match(html,/setTimeout\(check,800\)/);
 assert.match(html,/document\.querySelector\("dialog\[open\]"\)/);
 assert.match(html,/const now=game\.snapshot\(\)/);
 assert.match(html,/now\.stage!==stage\|\|now\.turn!==turn/);
 assert.match(html,/if\(game\.endTurn\(\)\)/);
 assert.match(html,/clearTimeout\(b1AutoEndTimer\)/);
 const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(js);
 const p=spawnSync(process.execPath,["--check","--input-type=module"],{input:js,encoding:"utf8"});
 assert.equal(p.status,0,p.stderr);
});

test("new enemy designs are real role-specific enemies with their own artwork and AI",()=>{
 assert.equal(STAGES.length,12);
 assert.equal(STAGES[8].enemies[0].role,"archer");
 assert.equal(STAGES[8].enemies[0].name,"霧の針獣");
 assert.equal(STAGES[10].enemies[1].role,"watcher");
 assert.equal(STAGES[10].enemies[1].name,"星守りの霊獣");
 assert.match(html,/archer:"bell-spirit\.webp"/);
 assert.match(html,/watcher:"wraith\.webp"/);
 for(const filename of ["bell-spirit.webp","wraith.webp"]){
  assert.ok(readFileSync(new URL("../v4-1/assets/"+filename,import.meta.url)).length>1000,filename);
 }
 const engine=readFileSync(new URL("../v4-1/underground-b1-engine.mjs",import.meta.url),"utf8");
 assert.match(engine,/if\(e\.role==="archer"\)/);
 assert.match(engine,/if\(e\.role==="watcher"\)/);
 assert.match(engine,/hits:2/);
});

test("all 65 cards can be acquired by some existing gameplay route, not necessarily as fight rewards",()=>{
 const g=createB1Game();
 const available=new Set([...STAGES.flatMap((s,i)=>getB1RewardPool(i,["dragonEgg"])),...g.snapshot().shopCatalog.map(i=>i.id),...STARTER,...BASIC_B1_STARTER,...PHYSICAL_STARTER,"dragonEgg","dragonFeed","dragonBreath"]);
 const unavailable=Object.keys(CARDS).filter(id=>!available.has(id));
 assert.deepEqual(unavailable,[]);
 assert.equal(Object.keys(CARDS).length,65);
 assert.equal(new Set(STAGES.flatMap(s=>s.rewards)).size,44);
});

test("reward cards show larger upper-focused images and always retain readable text",()=>{
 assert.match(css,/body\.pilot-mode #rewardCards \.pilot-card\.b1-art-card \.b1-original-card-img/);
 assert.match(css,/object-fit:cover;object-position:50% 14%/);
 assert.match(css,/height:70%;flex:0 0 70%/);
 assert.match(css,/overflow-y:auto;overscroll-behavior:contain/);
 assert.match(css,/\.pilot-card \.pilot-card-copy/);
 assert.match(css,/\.b1-enemy-lineup\.b1-two \.b1-actor-figure img/);
 assert.match(css,/max-width:clamp\(145px,23vw,310px\)/);
 assert.match(css,/height:clamp\(185px,49dvh,400px\)/);
});
