import test from "node:test";import assert from "node:assert/strict";import {CARDS,STARTER,BASIC_B1_STARTER,STAGES,createB1Game} from "../v4-1/underground-b1-engine.mjs";import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
test("ten-card beginner starter with five 5-damage attacks and five 5-block defenses",()=>{
 assert.deepEqual(BASIC_B1_STARTER,[...Array(5).fill("basicAttack"),...Array(5).fill("basicDefense")]);
 assert.equal(CARDS.basicAttack.damage,5);assert.equal(CARDS.basicAttack.cost,1);
 assert.equal(CARDS.basicDefense.block,5);assert.equal(CARDS.basicDefense.cost,1);
 const game=createB1Game({seed:1});assert.equal(game.selectStarter("basic"),true);
 assert.deepEqual(game.snapshot().deck,BASIC_B1_STARTER);
 assert.equal(game.snapshot().stage,0);
});
test("first three rooms become easier and originals remain separate from boss practice",()=>{
 assert.equal(STAGES.length,12);
 assert.equal(STAGES[0].enemies[0].maxHp,42);
 assert.ok(STAGES[1].enemies.every(e=>e.maxHp<=17));
 assert.equal(STAGES[2].enemies[0].maxHp,52);
 const g=createB1Game({seed:2});g.selectStarter("basic");assert.equal(g.snapshot().intents[0].damage,5); assert.ok(g.snapshot().enemies[0].maxHp<STAGES[0].enemies[0].maxHp);
});
test("browser starts standard run immediately; old physical option is still available",()=>{
 assert.ok(html.includes('game.selectStarter("basic")'));
 assert.ok(html.includes('game.selectStarter("physical")'));
 for(const [art,path]of [["starter-basic-attack","b1-starter-attack.webp"],["starter-basic-defense","b1-starter-defense.webp"]])assert.ok(html.includes('"'+art+'":"'+path+'"'));
});
