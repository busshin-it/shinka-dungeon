import test from "node:test";
import assert from "node:assert/strict";
import {CARDS,getB1Card,STAGES,createB1Game} from "../v4-1/underground-b1-engine.mjs";
function start(ids){const g=createB1Game({seed:123,maxHp:999,testDeck:ids});assert.equal(g.selectStarter("flow"),true);return g;}
function playNamed(g,id,target="rat"){const s=g.snapshot(),i=s.hand.indexOf(id);assert.ok(i>=0,id+" not drawn");return g.play(i,target);}
test("three context cards have short base effects, valid upgrades and rewards",()=>{
 for(const id of ["frostBreak","echoGuard","lingeringPoison"]){assert.ok(CARDS[id]);assert.ok(getB1Card(id+"~"));assert.ok(STAGES.some(stage=>stage.rewards.includes(id)));}
});
test("weak follow-up beats plain attack but does not trigger without weak",()=>{
 const g=start([...Array(4).fill("frost"),...Array(5).fill("frostBreak")]);let s=g.snapshot();
 assert.ok(s.hand.includes("frost")&&s.hand.includes("frostBreak"));
 const baseline=CARDS.frostBreak.damage;
 playNamed(g,"frost");s=g.snapshot();assert.ok(s.enemies[0].weaken>0);
 const hp=s.enemies[0].hp;playNamed(g,"frostBreak");s=g.snapshot();
 assert.equal(hp-s.enemies[0].hp,baseline+CARDS.frostBreak.weakBonus);
});
test("attack before echo shield grants two draws",()=>{
 const g=start([...Array(4).fill("bolt"),...Array(5).fill("echoGuard")]);let s=g.snapshot();
 assert.ok(s.hand.includes("bolt")&&s.hand.includes("echoGuard"));
 playNamed(g,"bolt");s=g.snapshot();const n=s.hand.length;playNamed(g,"echoGuard");s=g.snapshot();
 assert.equal(s.block,CARDS.echoGuard.block);assert.equal(s.hand.length,n-1+2);
});
test("poison before lingering page grants two draws",()=>{
 const g=start([...Array(4).fill("poison"),...Array(5).fill("lingeringPoison")]);let s=g.snapshot();
 assert.ok(s.hand.includes("poison")&&s.hand.includes("lingeringPoison"));
 playNamed(g,"poison");s=g.snapshot();const n=s.hand.length;playNamed(g,"lingeringPoison");s=g.snapshot();
 assert.equal(s.enemies[0].poison,CARDS.poison.poison+CARDS.lingeringPoison.poison);
 assert.equal(s.hand.length,n-1+2);
});
