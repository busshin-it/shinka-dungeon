import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {b1HandPose,attachB1Actions,needsB1Target} from "../v4-1/underground-b1-actions.mjs";

test("hand fan poses are centered, bounded and symmetric",()=>{
 assert.deepEqual(b1HandPose(0,1),{angle:0,drop:0});
 const poses=Array.from({length:5},(_,i)=>b1HandPose(i,5));
 assert.deepEqual(poses[0],{angle:-3.5,drop:3});
 assert.deepEqual(poses[2],{angle:0,drop:0});
 assert.deepEqual(poses[4],{angle:3.5,drop:3});
 assert.deepEqual(b1HandPose(-5,5),poses[0]);
 assert.deepEqual(b1HandPose(999,5),poses[4]);
 assert.ok(Array.from({length:20},(_,i)=>b1HandPose(i,20)).every(x=>Math.abs(x.angle)<=3.5&&x.drop<=3));
});
test("targeting rules unchanged for attacks and non-attacks",()=>{
 for(const k of ["attack","multi","poison","fragile"])assert.equal(needsB1Target(k),true);
 for(const k of ["guard","heal","energy","draw","power","all","dragonBreath"])assert.equal(needsB1Target(k),false);
});

class FakeNode{
 constructor(tag="div"){
  this.tag=tag;this.dataset={};this.children=[];this.events={};this.attrs={};
  this.flags=new Set();this.classList={
   add:(...s)=>s.forEach(x=>this.flags.add(x)),remove:(...s)=>s.forEach(x=>this.flags.delete(x)),
   contains:s=>this.flags.has(s),toggle:(s,on)=>{const val=on===undefined?!this.flags.has(s):on;if(val)this.flags.add(s);else this.flags.delete(s);return val;}
  };
  this.props={};this.style={
   setProperty:(k,v)=>{this.props[k]=v;},removeProperty:k=>{delete this.props[k];}
  };
  this.hidden=false;this.disabled=false;this.removed=false;this.rect={left:10,top:10,width:90,height:110,right:100,bottom:120};
 }
 addEventListener(k,f){(this.events[k]??=[]).push(f);}
 emit(k,arg){for(const f of this.events[k]||[])f(arg);}
 setAttribute(k,v){this.attrs[k]=v;}
 append(...nodes){this.children.push(...nodes);}
 remove(){this.removed=true;}
 cloneNode(){const clone=new FakeNode(this.tag);clone.dataset={...this.dataset};clone.rect={...this.rect};return clone;}
 getBoundingClientRect(){return {...this.rect};}
 closest(query){
  if(query==="[data-b1-hand]")return this.dataset.b1Hand!==undefined?this:null;
  if(query==="[data-b1-enemy]")return this.dataset.b1Enemy!==undefined?this:null;
  return null;
 }
 querySelectorAll(query){
  if(query==="[data-b1-hand]")return this.children.filter(x=>x.dataset.b1Hand!==undefined);
  if(query==="[data-b1-enemy]")return this.children.filter(x=>x.dataset.b1Enemy!==undefined);
  if(query===".b1-drop-target")return this.children.filter(x=>x.flags.has("b1-drop-target"));
  if(query===".b1-drag-source,.b1-pressing")return this.children.filter(x=>x.flags.has("b1-drag-source")||x.flags.has("b1-pressing"));
  if(query===".b1-hand-focus,.b1-hand-before,.b1-hand-after")return this.children.filter(x=>[...x.flags].some(k=>k.startsWith("b1-hand-")));
  return [];
 }
}
test("mouse hover, touch press, drag cancel, release, and click targeting remain wired",()=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 const winEvents={},docEvents={};
 const appendages=[],hand=new FakeNode("section"),stage=new FakeNode("section"),enemyPuppet=new FakeNode("div"),choices=new FakeNode("div");
 const wrap=new FakeNode("div");stage.parentElement=wrap;
 stage.rect={left:0,top:0,width:500,height:300,right:500,bottom:300};
 const foe=new FakeNode("button");foe.dataset.b1Enemy="rat";choices.append(foe);
 const card0=new FakeNode("button"),card1=new FakeNode("button");hand.append(card0,card1);
 let hit=null;const casts=[];
 const state={phase:"battle",hand:["bolt","guard"],energy:3,enemies:[{id:"rat",hp:42}]};
 try{
  globalThis.window={innerWidth:1200,innerHeight:800,addEventListener(k,f){(winEvents[k]??=[]).push(f);}};
  globalThis.document={
   createElement:k=>new FakeNode(k),createElementNS:(_ns,k)=>new FakeNode(k),
   addEventListener(k,f){(docEvents[k]??=[]).push(f);},
   body:{append:k=>appendages.push(k)},
   elementFromPoint:()=>hit
  };
  const a=attachB1Actions({
   hand,stage,enemyPuppet,choices,cards:{bolt:{cost:1,kind:"attack"},guard:{cost:1,kind:"guard"}},
   read:()=>state,selectedTarget:()=>"rat",cast:(...args)=>{casts.push(args);return true;},inspectTarget:()=>{}
  });
  a.bindHandCard(card0,0,2);a.bindHandCard(card1,1,2);a.sync();
  assert.equal(card0.props["--b1-fan-angle"],"-3.5deg");
  assert.equal(card1.props["--b1-fan-angle"],"3.5deg");
  card0.emit("pointerenter",{pointerType:"mouse"});
  assert.ok(card0.flags.has("b1-hand-focus"));
  assert.ok(card1.flags.has("b1-hand-after"));
  card0.emit("pointermove",{pointerType:"mouse",clientX:85});
  assert.ok(card0.props["--b1-hover-tilt"].endsWith("deg"));
  card0.emit("pointerleave",{});
  assert.ok(!card1.flags.has("b1-hand-after"));
  card0.emit("pointerdown",{target:card0,pointerId:9,pointerType:"touch",button:0,clientX:40,clientY:95});
  // delegated pointerdown belongs on the hand
  hand.emit("pointerdown",{target:card0,pointerId:9,pointerType:"touch",button:0,clientX:40,clientY:95});
  assert.ok(card0.flags.has("b1-pressing"));
  for(const f of winEvents.pointerup)f({pointerId:9,clientX:40,clientY:95});
  assert.ok(!card0.flags.has("b1-pressing"));
  hand.emit("pointerdown",{target:card0,pointerId:10,pointerType:"mouse",button:0,clientX:40,clientY:95});
  for(const f of winEvents.pointermove)f({pointerId:10,clientX:150,clientY:80,cancelable:true,preventDefault(){}});
  assert.ok(stage.flags.has("b1-casting"));
  assert.ok(appendages.some(n=>n.flags?.has("b1-drag-ghost")));
  assert.ok(!card0.flags.has("b1-pressing"));
  for(const f of winEvents.pointercancel)f({pointerId:10});
  assert.ok(!stage.flags.has("b1-casting"));
  assert.ok(!card0.flags.has("b1-drag-source"));
  assert.ok(appendages.some(n=>n.flags?.has("b1-snapback")));
  hand.emit("pointerdown",{target:card0,pointerId:11,pointerType:"mouse",button:0,clientX:40,clientY:95});
  for(const f of winEvents.pointermove)f({pointerId:11,clientX:180,clientY:75,cancelable:true,preventDefault(){}});
  hit=foe;
  for(const f of winEvents.pointerup)f({pointerId:11,clientX:180,clientY:75});
  assert.equal(casts.length,1);
  assert.equal(casts[0][1],"rat");
  assert.ok(!stage.flags.has("b1-casting"));
  a.cancel();
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
test("B1-only animations preserve accessibility and existing battle HTML",()=>{
 const css=readFileSync(new URL("../v4-1/underground-b1-actions.css",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
 for(const required of ["b1-hand-focus","b1-pressing","b1-drag-ghost","b1-snapback","prefers-reduced-motion","b1FanDeal"])assert.ok(css.includes(required),required);
 assert.ok(ui.includes("actions.bindHandCard(b,index,s.hand.length)"));
 assert.ok(ui.includes('src="./assets/hero.webp"'));
 assert.ok(ui.includes('id="heroPuppet"'));
});
