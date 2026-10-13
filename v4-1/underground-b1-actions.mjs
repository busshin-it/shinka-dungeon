// B1-only pointer/touch/keyboard controls. Game rules remain in underground-b1-engine.
export const needsB1Target=kind=>["attack","multi","poison","fragile","confuse","curse","hallucinate"].includes(kind);
// Centered fan. Maximum 7 degrees; outer cards are lower than the center.
export function b1HandFanPose(index,total){
 const count=Math.max(1,Math.floor(Number(total)||1));
 const i=Math.max(0,Math.min(count-1,Math.floor(Number(index)||0)));
 const t=count===1?0:(i-(count-1)/2)/((count-1)/2);
 return {angle:Math.round(t*7*10)/10,drop:Math.round(Math.abs(t)*6)};
}
// Let touch users swipe sideways through the hand while upward gestures lift cards.
export function b1PointerIntent(dx,dy,pointerType="mouse"){
 const distance=Math.hypot(dx,dy);
 if(distance<8)return "wait";
 // Upward diagonals are intentional casts, even if the thumb moves sideways.
 // Near-horizontal swipes still scroll the hand.
 if(pointerType!=="mouse"&&dy<-17&&Math.abs(dy)>=Math.abs(dx)*.32)return "drag";
 if(pointerType!=="mouse"&&Math.abs(dx)>Math.abs(dy)*1.35)return "scroll";
 return "drag";
}
export function b1IsBattleDrop(x,y,stageRect,handRect){
 if(x<stageRect.left||x>stageRect.right||y<stageRect.top||y>stageRect.bottom)return false;
 // In the overlaid hand layout, do not cast by dropping back on the hand dock.
 const dockOverArena=handRect&&handRect.top>stageRect.top+(stageRect.bottom-stageRect.top)*.45;
 return !dockOverArena||y<handRect.top-7;
}
export function attachB1Actions({hand,stage,enemyPuppet,choices,cards,read,selectedTarget,cast,inspectTarget}){
 let picked=null,active=null,ghost=null,hovered=null,suppressUntil=0;
 let ghostFrame=0,ghostX=0,ghostY=0,desiredX=0,desiredY=0,previewIndex=null;
 const wrap=stage.parentElement;wrap.classList.add("b1-gesture-stage");
 const hint=document.createElement("div");
 hint.className="b1-hand-help";hint.hidden=true;hint.setAttribute("role","status");hint.setAttribute("aria-live","polite");wrap.append(hint);
 const zone=document.createElement("div");zone.className="b1-cast-zone";zone.textContent="ここに離すと発動";stage.append(zone);
 const ns="http://www.w3.org/2000/svg";
 const arrow=document.createElementNS(ns,"svg");arrow.classList.add("b1-arrow");arrow.setAttribute("aria-hidden","true");
 const defs=document.createElementNS(ns,"defs"),marker=document.createElementNS(ns,"marker");
 marker.setAttribute("id","b1-aim-tip");marker.setAttribute("markerWidth","9");marker.setAttribute("markerHeight","9");marker.setAttribute("refX","6");marker.setAttribute("refY","3");marker.setAttribute("orient","auto");
 const tip=document.createElementNS(ns,"path");tip.setAttribute("d","M0 0 L6 3 L0 6");tip.setAttribute("stroke","#f9d48a");tip.setAttribute("stroke-width","1.7");tip.setAttribute("fill","none");marker.append(tip);defs.append(marker);
 const curve=document.createElementNS(ns,"path");curve.setAttribute("stroke","#f9d48a");curve.setAttribute("stroke-width","3");curve.setAttribute("stroke-linecap","round");curve.setAttribute("fill","none");curve.setAttribute("stroke-dasharray","7 5");curve.setAttribute("marker-end","url(#b1-aim-tip)");
 arrow.append(defs,curve);document.body.append(arrow);
 const targetElement=id=>[...choices.querySelectorAll("[data-b1-enemy]")].find(x=>x.dataset.b1Enemy===id);
 // Real card previews live OUTSIDE the clipped hand scroll area.
 // They do not steal pointer events, so touch scrolling and aiming continue to work.
 const preview=document.createElement("div");
 preview.className="b1-card-preview";preview.hidden=true;
 preview.setAttribute("aria-hidden","true");document.body.append(preview);
 function hidePreview(){preview.hidden=true;previewIndex=null;preview.textContent="";}
 function showPreview(button){
  if(!button||active?.moved||read().phase!=="battle")return;
  const index=Number(button.dataset.b1Hand);
  // Inspection remains available even without enough energy to PLAY.
  // A compact 1.2-1.5x peek is enough. 390px overlaid the entire arena at
  // Chrome/OS zoom; keep it to at most 280 CSS pixels and 58% viewport height.
  const r=button.getBoundingClientRect();
  const heightBound=Math.max(170,Math.min(window.innerHeight*.58,400));
  const width=Math.round(Math.min(280,window.innerWidth*.60,heightBound/1.39));
  const height=Math.round(width*1.39);
  const left=Math.max(6,Math.min(window.innerWidth-width-6,r.left+r.width/2-width/2));
  const top=Math.max(6,Math.min(window.innerHeight-height-6,r.top-height-18));
  preview.style.width=width+"px";preview.style.height=height+"px";
  preview.style.left=left+"px";preview.style.top=top+"px";
  if(previewIndex!==index||preview.hidden){
   const copy=button.cloneNode(true);
   copy.classList.remove("b1-picked","b1-pressing","b1-dealt","b1-drag-source");
   copy.removeAttribute?.("data-b1-hand");
   // Expand the concise hand caption back to the complete effect in this
   // floating preview. The real card stays short and is never re-rendered.
   const fullDescription=copy.querySelector?.(".desc");
   if(fullDescription?.dataset?.b1FullDesc)fullDescription.textContent=fullDescription.dataset.b1FullDesc;
   copy.disabled=false;copy.setAttribute("tabindex","-1");
   copy.style.setProperty("--b1-fan-angle","0deg");
   copy.style.setProperty("--b1-fan-drop","0px");
   preview.textContent="";preview.append(copy);previewIndex=index;
  }
  preview.hidden=false;
 }
 function message(t){hint.textContent=t;hint.hidden=!t;}
 function mark(){
  hand.querySelectorAll("[data-b1-hand]").forEach(b=>{const on=Number(b.dataset.b1Hand)===picked;b.classList.toggle("b1-picked",on);b.setAttribute("aria-pressed",String(on));});
  choices.querySelectorAll("[data-b1-enemy]").forEach(b=>b.classList.toggle("b1-pending-target",picked!==null&&b.dataset.b1Enemy===selectedTarget()));
  enemyPuppet.classList.toggle("b1-pending-target",picked!==null&&!stage.classList.contains("b1-multi"));
 }
 function cancel(){picked=null;hidePreview();message("");mark();}
 function select(index){
  picked=index;showPreview(hand.querySelector('[data-b1-hand="'+index+'"]'));
  message(needsB1Target(usable(index)?.card?.kind)?"敵を1回タップして発動。ドラッグでも使えます。":"戦闘画面を1回タップして発動。ドラッグでも使えます。");
  mark();
 }
 function usable(index){
  const s=read(),id=s.hand[index];return s.phase==="battle"&&id&&cards[id]&&cards[id].cost<=s.energy?{id,card:cards[id]}:null;
 }
 function rect(index){return hand.querySelector('[data-b1-hand="'+index+'"]')?.getBoundingClientRect()||null;}
 function fire(index,target,source){
  const info=usable(index);if(!info)return false;
  if(needsB1Target(info.card.kind)&&!target){message("攻撃する敵を選んでください");return false;}
  // Clear pending selection before render() runs inside cast(), preventing stale highlights.
  const previous=picked;picked=null;
  const ok=cast(index,target,info.id,source||rect(index),read());
  if(ok){hidePreview();message("");mark();}else{picked=previous;message("このカードはまだ使えません");mark();}
  return ok;
 }
 function handleCardClick(index){
  if(performance.now()<suppressUntil)return;
  if(!usable(index))return;
  // First click lifts the card. The next click on the same card cancels it.
  if(picked===index)cancel();else select(index);
 }
 // Non-targeted spells cast by tapping the arena after one card selection.
 stage.addEventListener("click",e=>{
  if(picked===null)return;
  const info=usable(picked);
  if(!info||needsB1Target(info.card.kind)||e.target.closest?.("button,[data-b1-enemy]"))return;
  fire(picked,null,rect(picked));
 });
 function handleTargetClick(id){
  const s=read();
  if(s.phase!=="battle"||!s.enemies.some(e=>e.id===id&&e.hp>0))return;
  if(picked!==null)fire(picked,id,rect(picked));
  else{inspectTarget(id);mark();}
 }
 function pointerTarget(x,y){
  const node=document.elementFromPoint(x,y);
  const b=node?.closest?.("[data-b1-enemy]");if(b&&!b.disabled)return b.dataset.b1Enemy;
  if(node?.closest?.("#enemyPuppet,#enemyArt,.enemy-hud"))return selectedTarget();
  // Enlarged but bounded target hit zones make a direct drag-release forgiving,
  // without selecting a different enemy across the room.
  for(const enemy of choices.querySelectorAll("[data-b1-enemy]")){
   if(enemy.disabled)continue;
   const r=enemy.getBoundingClientRect();
   if(x>=r.left-18&&x<=r.right+18&&y>=r.top-18&&y<=r.bottom+18)
    return enemy.dataset.b1Enemy;
  }
  if(!stage.classList.contains("b1-multi")){
   const r=enemyPuppet.getBoundingClientRect();
   if(x>=r.left-18&&x<=r.right+18&&y>=r.top-18&&y<=r.bottom+18)
    return selectedTarget();
  }
  return null;
 }
 function highlight(id){
  if(hovered===id)return;
  choices.querySelectorAll(".b1-drop-target").forEach(b=>b.classList.remove("b1-drop-target"));enemyPuppet.classList.remove("b1-drop-target");
  hovered=id;
  if(id){targetElement(id)?.classList.add("b1-drop-target");if(id===selectedTarget()&&!stage.classList.contains("b1-multi"))enemyPuppet.classList.add("b1-drop-target");}
 }
 function glideGhost(){
  ghostFrame=0;
  if(!ghost)return;
  ghostX+=(desiredX-ghostX)*.44;
  ghostY+=(desiredY-ghostY)*.44;
  ghost.style.left=ghostX+"px";ghost.style.top=ghostY+"px";
  if(Math.abs(desiredX-ghostX)+Math.abs(desiredY-ghostY)>1.2)
   ghostFrame=window.requestAnimationFrame?.(glideGhost)||0;
 }
 function ghostAt(e){
  if(!active?.moved||!ghost)return;
  desiredX=e.clientX-active.rect.width/2;desiredY=e.clientY-active.rect.height*.65;
  if(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||!window.requestAnimationFrame){
   ghostX=desiredX;ghostY=desiredY;ghost.style.left=ghostX+"px";ghost.style.top=ghostY+"px";
  }else if(!ghostFrame)ghostFrame=window.requestAnimationFrame(glideGhost);
  const tilt=Math.max(-10,Math.min(10,(e.clientX-active.x)*.065));
  ghost.style.transform="rotate("+tilt+"deg) scale(1.09)";
  const inside=b1IsBattleDrop(e.clientX,e.clientY,stage.getBoundingClientRect(),hand.getBoundingClientRect());
  zone.classList.toggle("b1-valid",inside&&!active.targeted);
  if(active.targeted){
   arrow.setAttribute("viewBox","0 0 "+window.innerWidth+" "+window.innerHeight);
   const x=active.rect.left+active.rect.width/2,y=active.rect.top+active.rect.height*.1;
   const cx=(x+e.clientX)/2,cy=Math.min(y,e.clientY)-75;
   curve.setAttribute("d","M"+x+" "+y+" Q"+cx+" "+cy+" "+e.clientX+" "+e.clientY);
   highlight(pointerTarget(e.clientX,e.clientY));
  }
 }
 function beginGhost(e){
  hidePreview();
  ghost=active.button.cloneNode(true);ghost.classList.remove("b1-pressing","b1-picked");ghost.classList.add("b1-float-card");
  ghost.style.width=active.rect.width+"px";ghost.style.height=active.rect.height+"px";
  ghostX=desiredX=active.rect.left;ghostY=desiredY=active.rect.top;
  ghost.style.left=ghostX+"px";ghost.style.top=ghostY+"px";
  active.button.classList.remove("b1-pressing");
  document.body.append(ghost);active.button.classList.add("b1-drag-source");hand.classList.add("b1-hand-dragging");stage.classList.add("b1-casting");
  zone.textContent=active.targeted?"敵にドラッグして離すと発動":"戦闘画面へドラッグして離すと発動";
  arrow.classList.toggle("b1-visible",active.targeted);ghostAt(e);
 }
 function cleanup(returnHome=false){
  if(ghostFrame)window.cancelAnimationFrame?.(ghostFrame);
  ghostFrame=0;hidePreview();
  if(returnHome&&ghost&&active){
   const node=ghost,item=active,originalTransform=node.style.transform||"none";
   const dx=item.rect.left-parseFloat(node.style.left),dy=item.rect.top-parseFloat(node.style.top);
   const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
   if(!reduced&&node.animate){
    const motion=node.animate([{transform:originalTransform,opacity:.95},{transform:"translate("+dx+"px,"+dy+"px) rotate(0deg) scale(1)",opacity:.12}],{duration:240,easing:"cubic-bezier(.18,.8,.22,1)"});
    motion.onfinish=()=>node.remove();motion.oncancel=()=>node.remove();
   }else node.remove();
  }else ghost?.remove();
  ghost=null;hovered=null;hand.classList.remove("b1-hand-dragging");
  stage.classList.remove("b1-casting");zone.classList.remove("b1-valid");arrow.classList.remove("b1-visible");
  hand.querySelectorAll(".b1-drag-source,.b1-pressing").forEach(b=>b.classList.remove("b1-drag-source","b1-pressing"));
  choices.querySelectorAll(".b1-drop-target").forEach(b=>b.classList.remove("b1-drop-target"));
  enemyPuppet.classList.remove("b1-drop-target");active=null;
 }
 // Never allow a nested card image to initiate browser-native dragging.
 hand.addEventListener("dragstart",e=>e.preventDefault());
 hand.addEventListener("pointerdown",e=>{
  const b=e.target.closest("[data-b1-hand]");
  if(!b||b.disabled||read().phase!=="battle"||(e.pointerType==="mouse"&&e.button!==0))return;
  const index=Number(b.dataset.b1Hand),info=usable(index);if(!info)return;
  active={pointerId:e.pointerId,pointerType:e.pointerType,x:e.clientX,y:e.clientY,index,rect:b.getBoundingClientRect(),button:b,moved:false,scrolling:false,scrollOrigin:Number(hand.scrollLeft)||0,targeted:needsB1Target(info.card.kind)};
  b.classList.add("b1-pressing");
  if(e.pointerType!=="mouse")showPreview(b);
  // Capture immediately, before the finger travels: no first tap or double click.
  try{b.setPointerCapture(e.pointerId);}catch{}
 });
 window.addEventListener("pointermove",e=>{
  if(!active||e.pointerId!==active.pointerId)return;
  // The card captures touch input from the FIRST press. Horizontal swipes
  // scroll the hand manually instead of letting the browser cancel the pointer.
  if(active.scrolling){
   hand.scrollLeft=active.scrollOrigin-(e.clientX-active.x);
   if(e.cancelable)e.preventDefault();
   return;
  }
  if(!active.moved){
   const intent=b1PointerIntent(e.clientX-active.x,e.clientY-active.y,active.pointerType);
   if(intent==="scroll"){
    active.scrolling=true;active.button.classList.remove("b1-pressing");hidePreview();
    hand.scrollLeft=active.scrollOrigin-(e.clientX-active.x);
    if(e.cancelable)e.preventDefault();
    return;
   }
   if(intent==="drag"){active.moved=true;beginGhost(e);}
  }
  if(active.moved){if(e.cancelable)e.preventDefault();ghostAt(e);}
 },{passive:false});
 window.addEventListener("pointerup",e=>{
  if(!active||e.pointerId!==active.pointerId)return;
  const item=active;
  if(item.scrolling){
   item.button.classList.remove("b1-pressing");
   suppressUntil=performance.now()+420;
   active=null;hidePreview();
   return;
  }
  if(!item.moved){
   item.button.classList.remove("b1-pressing");
   active=null;
   if(item.pointerType!=="mouse"){
    handleCardClick(item.index);
    suppressUntil=performance.now()+240;
   }
   if(picked===null)hidePreview();
   return;
  }
  suppressUntil=performance.now()+420;
  const target=item.targeted?pointerTarget(e.clientX,e.clientY):null;
  const inside=b1IsBattleDrop(e.clientX,e.clientY,stage.getBoundingClientRect(),hand.getBoundingClientRect());
  cleanup(item.targeted?!target:!inside);
  if(item.targeted){if(inside&&target)fire(item.index,target,item.rect);else{select(item.index);message("敵の上までカードを動かして離してください");}}
  else if(inside)fire(item.index,null,item.rect);
  else{cancel();message("戦闘エリアまでカードをドラッグして離してください");}
 });
 window.addEventListener("pointercancel",e=>{if(active&&e.pointerId===active.pointerId){cleanup(!active.scrolling);cancel();}});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"){cleanup(true);cancel();}});
 enemyPuppet.addEventListener("click",()=>handleTargetClick(selectedTarget()));
 function bindHandCard(button,index){
  button.dataset.b1Hand=String(index);button.draggable=false;
  button.addEventListener("click",()=>handleCardClick(index));
  // Desktop hover opens the LARGE floating copy immediately; a click still
  // selects the original playable card and all drag/target rules remain.
  button.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse"&&!active)showPreview(button);});
  button.addEventListener("pointerleave",()=>{if(picked!==index&&!active)hidePreview();});
  button.addEventListener("focus",()=>showPreview(button));
  button.addEventListener("blur",()=>{if(picked!==index&&!active)hidePreview();});
 }
 hand.addEventListener("scroll",()=>{if(!active?.moved)hidePreview();},{passive:true});
 hand.addEventListener("pointermove",e=>{
  if(e.pointerType!=="mouse"||active)return;
  const button=e.target.closest?.("[data-b1-hand]");if(!button||button.disabled)return;
  const r=button.getBoundingClientRect();
  const x=(e.clientX-r.left)/Math.max(1,r.width)-.5;
  const y=(e.clientY-r.top)/Math.max(1,r.height)-.5;
  button.style.setProperty("--b1-tilt-x",(-y*8).toFixed(1)+"deg");
  button.style.setProperty("--b1-tilt-y",(x*8).toFixed(1)+"deg");
 });
 function sync(){
  if(read().phase!=="battle"||(picked!==null&&!usable(picked))){picked=null;hidePreview();message("");}
  const buttons=[...hand.querySelectorAll("[data-b1-hand]")];
  buttons.forEach((b,i)=>{
   const pose=b1HandFanPose(i,buttons.length);
   b.style.setProperty("--b1-fan-angle",pose.angle+"deg");
   b.style.setProperty("--b1-fan-drop",pose.drop+"px");
  });
  mark();
  if(picked!==null){
   const selected=hand.querySelector('[data-b1-hand="'+picked+'"]');
   if(selected)showPreview(selected);
  }
 }
 return{bindHandCard,handleTargetClick,sync,cancel};
}
