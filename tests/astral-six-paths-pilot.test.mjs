import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createPilotGame, CARDS, STARTER_DECK } from "../v4-1/six-paths-pilot.mjs";

const attack = (perHit,hits=1,damageType="physical") => ({kind:"attack",label:"試験攻撃",perHit,hits,damageType});
const rest = () => ({kind:"rest",label:"準備",heal:0});
const pilot = (deck,intents=[attack(8)],overrides={}) => createPilotGame({
  deck,intents,hp:30,enemy:{maxHp:100,physicalResist:0,magicResist:0},...overrides
});
function play(g,id) {
  const index=g.snapshot().hand.indexOf(id);
  assert(index>=0,"hand must contain "+id);
  assert.equal(g.play(index),true,"must play "+id);
}
test("text-only pilot defines a small set across six tactical directions",()=>{
  for(const id of STARTER_DECK) assert(CARDS[id],id);
  assert(Object.keys(CARDS).length>=10);
  const html=fs.readFileSync(new URL("../v4-1/six-paths-pilot.html",import.meta.url),"utf8");
  assert.match(html,/six-paths-pilot\.mjs/);
  assert.match(html,/id="hand"/);
  assert.doesNotMatch(html,/<img\b/i);
});
test("non-attacking turns retain mirror protection, ice weakness and poison but expire ordinary guard",()=>{
  const g=pilot(["mirror","guard","poison","frost","bolt"],[rest(),attack(6,2)]);
  play(g,"mirror");play(g,"guard");play(g,"poison");play(g,"frost");
  let s=g.snapshot();
  assert.equal(s.mirrorGuard,6);
  assert.equal(s.guard,5);
  assert.equal(s.poison,2);
  assert.equal(s.weaken,3);
  g.endTurn();s=g.snapshot();
  assert.equal(s.guard,0);
  assert.equal(s.mirrorGuard,6);
  assert.equal(s.mirrorReady,true);
  assert.equal(s.weaken,3);
  assert.equal(s.poison,2);
  assert.equal(s.enemyHp,100);
  g.endTurn();s=g.snapshot();
  // 2x6 - 3 weakness = 9; mirror blocks 6, player takes 3.
  assert.equal(s.hp,27);
  assert.equal(s.enemyHp,92); // mirror reflection 6, then poison 2
  assert.equal(s.mirrorGuard,0);
  assert.equal(s.mirrorReady,false);
  assert.equal(s.weaken,0);
  assert.equal(s.poison,2);
});
test("multiple mirror cards add defense but reflect only once and discard unused defense",()=>{
  const g=pilot(["mirror","mirror","guard","poison","strike"],[attack(4,2)]);
  play(g,"mirror");play(g,"mirror");play(g,"guard");play(g,"poison");
  g.endTurn();
  const s=g.snapshot();
  assert.equal(s.hp,30);
  assert.equal(s.enemyHp,90); // actual block 8 -> reflection 8 + poison 2, not 16
  assert.equal(s.mirrorGuard,0);
  assert.equal(s.guard,0);
  assert.equal(s.mirrorReady,false);
});
test("player reaches HP zero: loss happens before mirror reflection and poison",()=>{
  const g=pilot(["mirror","poison","bolt","guard","strike"],[attack(10)],{hp:3});
  play(g,"mirror");play(g,"poison");
  g.endTurn();
  const s=g.snapshot();
  assert.equal(s.phase,"defeat");
  assert.equal(s.hp,0);
  assert.equal(s.enemyHp,100);
  assert.equal(s.mirrorReady,false);
});
test("ice weakness stacks, applies to one whole multi-hit action and expires after attacking",()=>{
  const g=pilot(["frost","frost","bolt","strike","guard"],[rest(),attack(5,3)]);
  play(g,"frost");play(g,"frost");
  assert.equal(g.snapshot().weaken,6);
  g.endTurn();
  assert.equal(g.snapshot().weaken,6);
  g.endTurn();
  assert.equal(g.snapshot().hp,21); // 15 total - 6 once, not each hit
  assert.equal(g.snapshot().weaken,0);
});
test("poison ticks once after all hits, never on enemy rest, and never decreases",()=>{
  const g=pilot(["poison","poison","bolt","guard","strike"],[rest(),attack(1,3),attack(2)]);
  play(g,"poison");play(g,"poison");
  g.endTurn();assert.equal(g.snapshot().enemyHp,100);
  g.endTurn();assert.equal(g.snapshot().enemyHp,96);
  assert.equal(g.snapshot().poison,4);
  g.endTurn();assert.equal(g.snapshot().enemyHp,92);
});
test("pure-physical consecutive weapons grow from the second card, nonweapon breaks streak",()=>{
  const g=pilot(["strike","strike","guard","strike","lunge"],[rest()]);
  play(g,"strike");assert.equal(g.snapshot().enemyHp,96);
  play(g,"strike");assert.equal(g.snapshot().enemyHp,90); // bonus 2
  play(g,"guard");
  play(g,"strike");assert.equal(g.snapshot().enemyHp,86); // reset by guard
  play(g,"lunge");assert.equal(g.snapshot().enemyHp,77); // bonus 2 again
});
test("using a spell suppresses the pure-weapon bonus for the rest of that turn",()=>{
  const g=pilot(["strike","bolt","strike","strike","guard"],[rest()]);
  play(g,"strike");play(g,"bolt");play(g,"strike");play(g,"strike");
  assert.equal(g.snapshot().enemyHp,82); // 4+6+4+4
  assert.equal(g.snapshot().usedSpell,true);
});
test("enemy physical and magic resistance use half-up rounding",()=>{
  const g=pilot(["strike","bolt","guard","poison","heal"],[rest()],{enemy:{maxHp:100,physicalResist:25,magicResist:30}});
  play(g,"strike");assert.equal(g.snapshot().enemyHp,97); // 4 * .75 = 3
  play(g,"bolt");assert.equal(g.snapshot().enemyHp,93); // 6 * .7 = 4.2 -> 4
});
test("wolf triggers only once per turn, even after swapping summons",()=>{
  const g=pilot(["wolf","strike","strike","stone","lunge"],[rest()]);
  play(g,"wolf");
  assert.equal(g.snapshot().beast,"wolf");
  assert.equal(g.snapshot().maxEnergy,4);
  play(g,"strike");assert.equal(g.snapshot().enemyHp,93); // 4+3 wolf
  play(g,"strike");assert.equal(g.snapshot().enemyHp,87); // 4+2 chain; no wolf again
  play(g,"stone");
  assert.equal(g.snapshot().beast,"stone");
  assert.equal(g.snapshot().beastReacted,true); // swap does not reset shared limit
  g.endTurn();
  assert.equal(g.snapshot().beastReacted,false);
});
test("stone reacts once to guarding, mirror bonus is retained until the next enemy attack",()=>{
  const g=pilot(["stone","mirror","guard","strike","bolt"],[rest(),attack(7)]);
  play(g,"stone");play(g,"mirror");
  assert.equal(g.snapshot().mirrorGuard,10); // mirror6 + stone4
  play(g,"guard");assert.equal(g.snapshot().guard,5); // no extra reaction
  g.endTurn();
  assert.equal(g.snapshot().mirrorGuard,10);
  g.endTurn();
  assert.equal(g.snapshot().enemyHp,93); // reflect actual blocked7
});
test("sacrifice requires active beast, consumes it, and is independent of reaction count",()=>{
  const g=pilot(["sacrifice","wolf","strike","guard","bolt"],[rest()]);
  const before=g.snapshot();
  assert.equal(g.canPlay("sacrifice"),false);
  assert.equal(g.play(0),false);
  assert.deepEqual(g.snapshot(),before);
  play(g,"wolf");play(g,"strike");assert.equal(g.snapshot().beastReacted,true);
  play(g,"sacrifice");
  assert.equal(g.snapshot().beast,null);
  assert.equal(g.snapshot().beastReacted,true);
  assert.equal(g.snapshot().enemyHp,81); // wolf attack7 + sacrifice12
});
test("burst spends current guards for high spell damage; no lingering mirror reflection",()=>{
  const g=pilot(["mirror","guard","burst","strike","poison"],[attack(8)]);
  play(g,"mirror");play(g,"guard");
  play(g,"burst");
  const s=g.snapshot();
  assert.equal(s.enemyHp,85);
  assert.equal(s.guard,0);
  assert.equal(s.mirrorGuard,0);
  assert.equal(s.mirrorReady,false);
});
test("wolf energy cap is effective when carrying unspent mana between turns",()=>{
  const g=pilot(["wolf","guard","mirror","strike","bolt"],[rest(),rest()]);
  play(g,"wolf");
  g.endTurn();assert.equal(g.snapshot().energy,4);
  g.endTurn();assert.equal(g.snapshot().energy,4);
});
