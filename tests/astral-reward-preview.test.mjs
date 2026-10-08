import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {engine,base,restore,win,plain} from './helpers/restitch-fixtures.mjs';
const source=fs.readFileSync(new URL('../v4-1/journey-visual.js',import.meta.url),'utf8');
const ctx={window:{}};vm.runInNewContext(source,ctx);const J=ctx.window.ShinkaJourney;
function reward(battle,ruleset='growth-v2'){const g=restore(base(battle,ruleset));win(g);assert(g.openReward());return g;}
for(const ruleset of ['classic','growth-v1','growth-v2'])test(`${ruleset} reward preview matches actual next enemies on every route without changing saves or RNG`,()=>{
 for(let battle=1;battle<=5;battle++){
  const g=reward(battle,ruleset),before=plain(g.exportSave()),s=g.snapshot(),E=engine.enemiesFor(s),candidates=plain(J.rewardOpponents(s,E));
  assert.equal(candidates.length,battle===1?2:battle===3?3:1);
  const html=J.rewardPreview(s,E,id=>engine.enemyPattern(id,s));assert(html.includes(`次の第${battle+1}戦`));assert(html.includes('基本威力'));assert(!html.includes('data-action='));
  for(const c of candidates){
   assert(html.includes(c.name));assert(html.includes(engine.enemyPattern(c.id,s)));
   const copy=restore(before);assert(copy.chooseReward(null));
   if(battle===1)assert(copy.chooseRoute(c.path));else if(battle===3)assert(copy.chooseChapter(c.path));else if(battle===5)assert(copy.chooseCamp('rest'));else assert(copy.chooseSanctuary('rest'));
   assert(copy.nextBattle());const next=copy.snapshot();assert.equal(next.enemyId,c.id);assert.equal(next.enemyHp,c.hp);assert.equal(engine.enemiesFor(next)[next.enemyId].name,c.name);
  }
  assert.deepEqual(plain(g.exportSave()),before);
 }
});
test('saved previous library candidate stays Star Dial instead of being advertised as Star Scale',()=>{
 const g=reward(3),save=plain(g.exportSave());save.state.chapter2Options.library='starDial';const old=restore(save),s=old.snapshot(),c=J.rewardOpponents(s,engine.enemiesFor(s));assert.equal(c[0].id,'starDial');
 assert(old.chooseReward(null));assert(old.chooseChapter('library'));assert(old.nextBattle());assert.equal(old.snapshot().enemyId,c[0].id);
});
test('preview is absent outside reward and after final victory; rendered strings escape markup',()=>{
 for(const phase of ['battle','intro','ready','complete','defeat','victory']){const s={phase,battle:3};assert.deepEqual(plain(J.rewardOpponents(s,{})),[]);assert.equal(J.rewardPreview(s,{},()=>''),'');}
 assert.equal(J.rewardPreview({phase:'reward',battle:6},{},()=>''),'');
 const E={trial:{name:'<enemy & "name">',hp:48}},s={phase:'reward',battle:2};const html=J.rewardPreview(s,E,()=>'<script>alert(1)</script>');assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('&amp;'));assert(html.includes('&quot;'));
});

test('reward forecast does not inherit the rulebook class hidden on landscape layouts',()=>{
 const s=reward(2).snapshot();const html=J.rewardPreview(s,engine.enemiesFor(s),id=>engine.enemyPattern(id,s));assert(html.includes('class="reward-forecast"'));assert(!html.includes('class="rules'));
 const css=fs.readFileSync(new URL('../v4-1/planning.css',import.meta.url),'utf8');assert.match(css,/\.dialog-inner \.reward-forecast\{display:block/);
});
