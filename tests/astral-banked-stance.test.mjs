import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {engine,fixture,plain,step} from './helpers/restitch-fixtures.mjs';
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
