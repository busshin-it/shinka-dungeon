import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {b1PointerIntent,attachB1Actions} from "../v4-1/underground-b1-actions.mjs";

test("touch scroll wins for horizontal swipes; vertical lift and mouse drag remain available",()=>{
 assert.equal(b1PointerIntent(5,4,"touch"),"wait");
 assert.equal(b1PointerIntent(32,5,"touch"),"scroll");
 assert.equal(b1PointerIntent(-27,10,"pen"),"scroll");
 assert.equal(b1PointerIntent(7,-25,"touch"),"drag");
 assert.equal(b1PointerIntent(32,5,"mouse"),"drag");
 assert.equal(b1PointerIntent(5,15,"touch"),"drag");
});
test("B1-only styles have fan, press, release and reduced-motion guard",()=>{
 const css=readFileSync(new URL("../v4-1/underground-b1-actions.css",import.meta.url),"utf8");
 for(const token of ["--b1-fan-angle","b1-pressing","--b1-tilt-x","b1-drag-source","b1-float-card","prefers-reduced-motion","touch-action:pan-x"])assert.ok(css.includes(token),token);
});

function createFixture(cardKind="attack"){
 const listeners=new Map(),winListeners=new Map(),docListeners=new Map();
 const classes=()=>{
  const set=new Set();
  return {add(...items){items.forEach(x=>set.add(x));},remove(...items){items.forEach(x=>set.delete(x));},contains(x){return set.has(x);},toggle(x,on){if(on===undefined)on=!set.has(x);on?set.add(x):set.delete(x);return on;}};
 };
 const rect=(left=0,top=0,width=100,height=130)=>({left,top,width,height,right:left+width,bottom:top+height});
 function element(tag="div",bounds=rect()){
  const events=new Map();
  const node={tag,children:[],dataset:{},attributes:{},disabled:false,hidden:false,classList:classes(),style:{setProperty(k,v){this[k]=v;}},rect:bounds,
   addEventListener(name,fn){events.set(name,fn);},emit(name,e){events.get(name)?.(e);},
   setAttribute(k,v){this.attributes[k]=v;},append(...children){this.children.push(...children);},remove(){this.removed=true;},
   getBoundingClientRect(){return this.rect;},setPointerCapture(){this.captured=true;},releasePointerCapture(){this.captured=false;},
   cloneNode(){return element(tag,{...this.rect});},closest(selector){if(selector==="[data-b1-hand]")return this.isHand?this:null;if(selector==="[data-b1-enemy]")return this.isEnemy?this:null;return null;},
   querySelectorAll(){return []},animate(){return {onfinish:null,oncancel:null}},
   get textContent(){return this._text||"";},set textContent(v){this._text=v;}
  };return node;
 }
 const wrap=element(),stage=element("section",rect(0,0,600,400)),hand=element(),choices=element(),enemyPuppet=element();
 stage.parentElement=wrap;
 const button=element("button",rect(70,440,110,140));button.isHand=true;
 hand.querySelectorAll=selector=>selector.includes("[data-b1-hand]")?[button]:selector.includes("b1-pressing")?(button.classList.contains("b1-pressing")?[button]:[]):selector.includes("b1-drag-source")?(button.classList.contains("b1-drag-source")?[button]:[]):[];
 const enemy=element("button",rect(350,120,110,145));enemy.isEnemy=true;enemy.dataset.b1Enemy="rat";
 choices.querySelectorAll=selector=>selector.includes("[data-b1-enemy]")?[enemy]:selector.includes("b1-drop-target")?(enemy.classList.contains("b1-drop-target")?[enemy]:[]):[];
 const body=element("body");
 const oldDocument=globalThis.document,oldWindow=globalThis.window;
 globalThis.document={body,createElement:tag=>element(tag),createElementNS:(_,tag)=>element(tag),addEventListener:(n,fn)=>docListeners.set(n,fn),elementFromPoint:(x,y)=>y<=400&&x>=300?enemy:null};
 globalThis.window={innerWidth:900,innerHeight:700,addEventListener:(n,fn)=>winListeners.set(n,fn),matchMedia:()=>({matches:false})};
 const casts=[];
 const read=()=>({phase:"battle",energy:3,hand:["bolt"],enemies:[{id:"rat",hp:42}]});
 const actions=attachB1Actions({hand,stage,enemyPuppet,choices,cards:{bolt:{kind:cardKind,cost:1}},read,selectedTarget:()=>"rat",cast:(...args)=>{casts.push(args);return true;},inspectTarget:()=>{}});
 actions.bindHandCard(button,0);actions.sync();
 const touch=(type,x,y,pointerId=1)=>{
  const event={target:button,pointerId,pointerType:"touch",button:0,clientX:x,clientY:y,cancelable:true,preventDefault(){this.prevented=true;}};
  if(type==="pointerdown")hand.emit(type,event);else winListeners.get(type)?.(event);
  return event;
 };
 return {button,hand,stage,casts,actions,touch,winListeners,docListeners,restore(){globalThis.document=oldDocument;globalThis.window=oldWindow;}};
}
test("horizontal touch scrolling does not create a ghost or cast a card",()=>{
 const f=createFixture();
 try{
  f.touch("pointerdown",120,500);
  assert.equal(f.button.classList.contains("b1-pressing"),true);
  f.touch("pointermove",169,502);
  assert.equal(f.stage.classList.contains("b1-casting"),false);
  assert.equal(f.button.classList.contains("b1-pressing"),false);
  f.touch("pointerup",169,502);
  assert.equal(f.casts.length,0);
 }finally{f.restore();}
});
test("upward touch creates lift then casts at chosen enemy without duplicate click",()=>{
 const f=createFixture();
 try{
  f.touch("pointerdown",120,500);
  f.touch("pointermove",140,465);
  assert.equal(f.stage.classList.contains("b1-casting"),true);
  assert.equal(f.button.classList.contains("b1-drag-source"),true);
  f.touch("pointermove",360,190);
  f.touch("pointerup",360,190);
  assert.equal(f.casts.length,1);
  assert.equal(f.casts[0][1],"rat");
  assert.equal(f.stage.classList.contains("b1-casting"),false);
  assert.equal(f.button.classList.contains("b1-drag-source"),false);
  f.button.emit("click",{});
  assert.equal(f.casts.length,1,"synthetic post-drag click is suppressed");
 }finally{f.restore();}
});
test("missed attack drop returns card for click targeting; Esc clears pending selection",()=>{
 const f=createFixture();
 try{
  f.touch("pointerdown",120,500);
  f.touch("pointermove",150,450);
  f.touch("pointerup",80,420);
  assert.equal(f.casts.length,0);
  assert.equal(f.button.classList.contains("b1-picked"),true);
  f.docListeners.get("keydown")({key:"Escape"});
  assert.equal(f.button.classList.contains("b1-picked"),false);
 }finally{f.restore();}
});
test("quick tap retains original click and keyboard activation semantics",()=>{
 const f=createFixture("guard");
 try{
  f.touch("pointerdown",120,500);
  f.touch("pointerup",120,500);
  f.button.emit("click",{});
  assert.equal(f.casts.length,1);
  assert.equal(f.casts[0][1],null);
 }finally{f.restore();}
});
