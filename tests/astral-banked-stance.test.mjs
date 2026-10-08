import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {engine,fixture,plain,step,base,restore,win} from './helpers/restitch-fixtures.mjs';
import {createHash} from 'node:crypto';
import {validateSet,loadGame} from '../tools/astral-card-production.mjs';

const {format}=loadGame();

test('Banked Stance production specification validates',()=>{
  const spec=JSON.parse(fs.readFileSync(new URL('../design/production/banked-stance.json',import.meta.url)));
  assert.equal(validateSet(spec,{stage:'release'}).scenarios,3);
});

test('Banked Stance checks mana after payment and upgrades block/focus only',()=>{
  for(const suffix of ['', '+']) for(const origin of ['frost','storm','mirror']) for(const energy of [0,1,2,3,4,5]){
    const g=fixture(['bankedStance'+suffix],{origin,energy,block:1,focus:0});
    const before=plain(g.exportSave());
    const p=g.previewCard(0);
    const baseBlock=suffix?5:2;
    const focus=suffix?5:3;
    const bank=energy>=3?5:0;
    assert.equal(p.actualBlock,baseBlock+bank);
    assert.equal(p.focus,focus);
    assert.equal(p.bankBlockCondition,energy>=3);
    assert.deepEqual(plain(g.exportSave()),before);
    const text=format(p);
    assert(text.summary.includes('防御'+(baseBlock+bank)));
    assert(text.rules.includes('支払い直後の魔力2以上'));
    if(energy===0){
      assert.equal(g.play(0),false);
      assert.deepEqual(plain(g.exportSave()),before);
      continue;
    }
    step(g,'play',0);
    const s=g.snapshot();
    assert.equal(s.block,1+baseBlock+bank);
    assert.equal(s.focus,focus);
    assert.equal(s.energy,energy-1);
    assert.equal(s.spellCount,0);
    assert.equal(s.enemyHp,before.state.enemyHp);
  }
});

test('using the stance before an attack can preserve the bank condition while attacking first can lose it',()=>{
  const stanceFirst=fixture(['bankedStance','basicStrike'],{energy:3});
  step(stanceFirst,'play',0);
  assert.equal(stanceFirst.snapshot().block,7);
  assert.equal(stanceFirst.previewCard(0).actualDamage,6);
  step(stanceFirst,'play',0);
  assert.equal(stanceFirst.snapshot().energy,1);

  const strikeFirst=fixture(['bankedStance','basicStrike'],{energy:3});
  assert.equal(strikeFirst.previewCard(1).actualDamage,3);
  step(strikeFirst,'play',1);
  assert.equal(strikeFirst.snapshot().energy,2);
  step(strikeFirst,'play',0);
  assert.equal(strikeFirst.snapshot().block,2);
});

test('Banked Stance is a current growth reward only and does not enter the first reward',()=>{
  const source=fs.readFileSync(new URL('../v4-1/planning-engine.js',import.meta.url),'utf8');
  assert.match(source,/CURRENT_REWARD_ONLY = Object\.freeze\(\[[^\]]*'bankedStance'/);
  assert.doesNotMatch(source,/FIRST_REWARD_POOLS[\s\S]*?bankedStance/);
});

test('stance focus expires unused, adds to existing focus, and only buffs the first attack',()=>{
  const g=fixture(['bankedStance','basicStrike','basicStrike'],{energy:4,focus:2,pendingFocus:4,pendingBlock:3,origin:'mirror'});
  step(g,'play',0);assert.equal(g.snapshot().focus,5);assert.equal(g.snapshot().reflect,2);
  assert.equal(g.previewCard(0).actualDamage,8);step(g,'play',0);
  assert.equal(g.previewCard(0).actualDamage,3);step(g,'play',0);
  assert.equal(g.snapshot().focus,0);step(g,'endTurn');
  assert.equal(g.snapshot().focus,4);assert.equal(g.snapshot().block,3);
  const unused=fixture(['bankedStance'],{energy:3});step(unused,'play',0);step(unused,'endTurn');
  assert.equal(unused.snapshot().focus,0);assert.equal(unused.snapshot().block,0);
});

test('same hand supports skipping stance for lethal and retaining mana against the scale blade',()=>{
  const lethal=fixture(['bankedStance','basicStrike'],{energy:2,enemyHp:3});
  step(lethal,'play',1);assert.equal(lethal.snapshot().phase,'victory');assert.equal(lethal.snapshot().energy,1);
  const held=fixture(['bankedStance','bolt'],{origin:'frost',energy:2,turn:2},{battle:4});
  const spent=restore(held.exportSave());step(spent,'play',0);
  assert.equal(held.intent().hpLoss,6);assert.equal(spent.intent().hpLoss,10);
  for(const g of [held,spent]){const before=g.snapshot().hp,predicted=g.intent().hpLoss;step(g,'endTurn');assert.equal(before-g.snapshot().hp,predicted);}
});

test('actual old offers/RNG and opened rewards remain pinned; current later offers contain stance',()=>{
  const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/astral-v421-stance-synthetic.json',import.meta.url))),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
  assert.equal(baseline.sourceCommit,'36430590d91ce82b38063c06cf12f286617c2a8f');
  for(const [id,c]of Object.entries(baseline.cards))assert.deepEqual(plain(engine.CARDS[id]),c);
  for(const [id,c]of Object.entries(baseline.upgrades))assert.deepEqual(plain(engine.card(id+'+')),c);
  let seen=false;
  for(const row of baseline.rows){
    const saved=plain(baseline.bases[row.key]);saved.rngState=row.seed;const g=restore(saved);step(g,'openReward');const open=plain(g.exportSave());
    if(saved.state.ruleset!=='growth-v2'||saved.state.battle===1){assert.equal(hash(open),row.openedSha256);assert(!g.rewardOptions().includes('bankedStance'));}
    else seen ||= g.rewardOptions().includes('bankedStance');
    open.state.rewardOffers=row.offers;open.rngState=row.openRng;
    assert.equal(hash(open),row.openedSha256);const old=restore(open);step(old,'chooseReward',null);assert.equal(hash(old.exportSave()),row.skippedSha256);
  }
  assert.equal(baseline.rows.length,360);assert(seen);
});

test('stance acquisition, removal, evolution and next-fight use roundtrip through the real growth flow',()=>{
  let g;
  for(let seed=1;seed<=512&&!g;seed++){
    const c=restore(base(2));win(c);const save=plain(c.exportSave());save.rngState=seed;assert(c.restoreSave(save));step(c,'openReward');
    if(c.rewardOptions().includes('bankedStance'))g=c;
  }
  assert(g);step(g,'chooseReward','bankedStance');
  const remove=restore(g.exportSave());step(remove,'chooseSanctuary','remove');step(remove,'removeCard','bankedStance');step(remove,'nextBattle');assert(!remove.snapshot().deck.includes('bankedStance'));
  step(g,'chooseSanctuary','evolve');step(g,'evolve','bankedStance');step(g,'nextBattle');
  const index=g.snapshot().hand.indexOf('bankedStance+');assert(index>=0);step(g,'play',index);assert.equal(g.exportSave().version,5);
});

test('ten isolated display scenes restore without exposing player storage or PWA registration',()=>{
  const scenes=JSON.parse(fs.readFileSync(new URL('../ui-qa/banked-stance-fixtures.json',import.meta.url)));
  assert.equal(Object.keys(scenes).length,10);
  for(const wrapped of Object.values(scenes))restore(wrapped.engine);
  const html=fs.readFileSync(new URL('../ui-qa/banked-stance.html',import.meta.url),'utf8');
  assert(html.includes('sandbox="allow-scripts"'));assert(!html.includes('allow-same-origin'));
  assert(html.includes("Object.defineProperty(window,'localStorage'"));assert(html.includes('script[src="./pwa.js"]'));
  assert(html.includes('banked-stance-fixtures.json'));
});
