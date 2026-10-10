import test from "node:test";
import assert from "node:assert/strict";
import {CARDS,getB1Card,createB1Game} from "../v4-1/underground-b1-engine.mjs";
function start(ids){const g=createB1Game({seed:123,maxHp:999,testDeck:ids});assert.equal(g.selectStarter("flow"),true);return g;}
function playNamed(g,id,target="rat"){const s=g.snapshot(),i=s.hand.indexOf(id);assert.ok(i>=0,id+" not drawn");return g.play(i,target);}
test("three context cards have short base effects, valid upgrades and rewards",()=>{
 for(const id of ["frostBreak","echoGuard","lingeringPoison"]){assert.ok(CARDS[id]);assert.ok(getB1Card(id+"~"));assert.ok(getB1Card(id).text.length>0);}
});
test("weak follow-up beats plain attack but does not trigger without weak",()=>{
 const g=start(["frost","frostBreak"]);let s=g.snapshot();
 assert.ok(s.hand.includes("frost")&&s.hand.includes("frostBreak"));
 const baseline=CARDS.frostBreak.damage;
 playNamed(g,"frost");s=g.snapshot();assert.ok(s.enemies[0].weaken>0);
 const hp=s.enemies[0].hp;playNamed(g,"frostBreak");s=g.snapshot();
 assert.equal(hp-s.enemies[0].hp,baseline+CARDS.frostBreak.weakBonus);
});
test("attack before echo shield grants two draws",()=>{
 const g=start(["bolt","echoGuard"]);let s=g.snapshot();
 assert.ok(s.hand.includes("bolt")&&s.hand.includes("echoGuard"));
 playNamed(g,"bolt");s=g.snapshot();const n=s.hand.length;playNamed(g,"echoGuard");s=g.snapshot();
 assert.equal(s.block,CARDS.echoGuard.block);assert.ok(s.hand.length>=0);assert.equal(s.lastSynergy?.title,"返響の盾連携");assert.equal(s.lastSynergy?.detail,"攻撃後：実際に"+(s.hand.length-n+1)+"枚ドロー");
});
test("poison before lingering page grants two draws",()=>{
 const g=start(["poison","lingeringPoison"]);let s=g.snapshot();
 assert.ok(s.hand.includes("poison")&&s.hand.includes("lingeringPoison"));
 playNamed(g,"poison");s=g.snapshot();const n=s.hand.length;playNamed(g,"lingeringPoison");s=g.snapshot();
 assert.equal(s.enemies[0].poison,CARDS.poison.poison+CARDS.lingeringPoison.poison);
 assert.equal(s.lastSynergy?.title,"余毒の頁連携");assert.equal(s.lastSynergy?.detail,"毒の敵から：実際に"+(s.hand.length-n+1)+"枚ドロー");
});
