import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createB1Game} from "../v4-1/underground-b1-engine.mjs";
import {showB1SynergyCue} from "../v4-1/underground-b1-feedback.mjs";

function start(deck){
 const game=createB1Game({seed:123,maxHp:999,testDeck:deck});
 assert.equal(game.selectStarter("flow"),true);
 return game;
}
function play(game,id){
 const s=game.snapshot(),index=s.hand.indexOf(id);
 assert.notEqual(index,-1,id+" in hand");
 assert.equal(game.play(index,"rat"),true);
 return game.snapshot();
}
test("combos have exact triggered cues and no false positives",()=>{
 const weak=start(["frost","frostBreak"]);
 assert.equal(play(weak,"frost").lastSynergy,null);
 let s=play(weak,"frostBreak");
 assert.deepEqual(s.lastSynergy,{cardId:"frostBreak",title:"霜砕き連携",detail:"弱体追撃：威力＋7"});

 const plain=start(["frostBreak"]);
 assert.equal(play(plain,"frostBreak").lastSynergy,null);
 const direct=start(["echoGuard"]);assert.equal(play(direct,"echoGuard").lastSynergy,null);
 const unpoisoned=start(["lingeringPoison"]);assert.equal(play(unpoisoned,"lingeringPoison").lastSynergy,null);

 const chain=start(["bolt","chain","guard"]);
 assert.equal(play(chain,"bolt").lastSynergy,null);
 assert.equal(play(chain,"chain").lastSynergy?.title,"連鎖雷連携");
 assert.equal(play(chain,"guard").lastSynergy,null,"ordinary card clears previous combo");
});
test("legacy poison flare also displays an activated combo only when poisoned",()=>{
 const combo=start(["poison","flare"]);
 play(combo,"poison");
 assert.deepEqual(play(combo,"flare").lastSynergy,{cardId:"flare",title:"毒炎連携",detail:"毒の敵へ：威力＋6"});
 assert.equal(play(start(["flare"]),"flare").lastSynergy,null);
});
test("ending a turn discards the transient combo cue",()=>{
 const game=start(["bolt","chain"]);
 play(game,"bolt");
 assert.ok(play(game,"chain").lastSynergy);
 assert.equal(game.endTurn(),true);
 assert.equal(game.snapshot().lastSynergy,null);
});
test("combo display is scoped, accessible, and uses the engine event text",()=>{
 const originalDocument=globalThis.document;
 try{
  const nodes=[];
  globalThis.document={createElement(tag){
   return {tag,className:"",children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v;},append(...children){this.children.push(...children);},remove(){this.removed=true;},animate(){return {}}};
  }};
  const stage={querySelectorAll(selector){assert.equal(selector,".b1-synergy-toast");return nodes.filter(n=>!n.removed);},append(node){nodes.push(node);}};
  assert.equal(showB1SynergyCue(stage,null),false);
  assert.equal(showB1SynergyCue(stage,{title:"返響の盾連携",detail:"攻撃後：実際に1枚ドロー"}),true);
  assert.equal(nodes.length,1);
  assert.equal(nodes[0].attributes.role,"status");
  assert.equal(nodes[0].children[0].textContent,"連携！ 返響の盾連携");
  assert.equal(nodes[0].children[1].textContent,"攻撃後：実際に1枚ドロー");
  assert.equal(showB1SynergyCue(stage,{title:"霜砕き連携",detail:"弱体追撃：威力＋7"}),true);
  assert.equal(nodes[0].removed,true,"new cue replaces the old cue without stacking");
 }finally{globalThis.document=originalDocument;}
 const css=readFileSync(new URL("../v4-1/underground-b1-actions.css",import.meta.url),"utf8");
 const feedback=readFileSync(new URL("../v4-1/underground-b1-feedback.mjs",import.meta.url),"utf8");
 assert.ok(css.includes(".b1-synergy-toast"));
 assert.ok(css.includes("prefers-reduced-motion"));
 assert.ok(feedback.includes("if(card&&after.lastSynergy)showB1SynergyCue"));
});
