// B1-only pointer/touch/keyboard controls. Game rules remain in underground-b1-engine.
export const needsB1Target=kind=>["attack","multi","poison","fragile"].includes(kind);
export function attachB1Actions({hand,stage,enemyPuppet,choices,cards,read,selectedTarget,cast,inspectTarget}){
 let picked=null,active=null,ghost=null,hovered=null,suppressUntil=0;
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
 function message(t){hint.textContent=t;hint.hidden=!t;}
 function mark(){
  hand.querySelectorAll("[data-b1-hand]").forEach(b=>{const on=Number(b.dataset.b1Hand)===picked;b.classList.toggle("b1-picked",on);b.setAttribute("aria-pressed",String(on));});
  choices.querySelectorAll("[data-b1-enemy]").forEach(b=>b.classList.toggle("b1-pending-target",picked!==null&&b.dataset.b1Enemy===selectedTarget()));
  enemyPuppet.classList.toggle("b1-pending-target",picked!==null&&!stage.classList.contains("b1-multi"));
 }
 function cancel(){picked=null;message("");mark();}
 function select(index){picked=index;message("敵の名前か姿を押して攻撃。ドラッグでも使えます。Escで解除。");mark();}
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
  if(ok){message("");mark();}else{picked=previous;message("このカードはまだ使えません");mark();}
  return ok;
 }
 function handleCardClick(index){
  if(performance.now()<suppressUntil)return;
  const info=usable(index);if(!info)return;
  if(needsB1Target(info.card.kind)){
   if(picked===index)fire(index,selectedTarget(),rect(index));
   else select(index);
  }else fire(index,null,rect(index));
 }
 function handleTargetClick(id){
  const s=read();
  if(s.phase!=="battle"||!s.enemies.some(e=>e.id===id&&e.hp>0))return;
  if(picked!==null)fire(picked,id,rect(picked));
  else{inspectTarget(id);mark();}
 }
 function pointerTarget(x,y){
  const node=document.elementFromPoint(x,y);if(!node)return null;
  const b=node.closest("[data-b1-enemy]");if(b&&!b.disabled)return b.dataset.b1Enemy;
  if(node.closest("#enemyPuppet,#enemyArt,.enemy-hud"))return selectedTarget();
  return null;
 }
 function highlight(id){
  if(hovered===id)return;
  choices.querySelectorAll(".b1-drop-target").forEach(b=>b.classList.remove("b1-drop-target"));enemyPuppet.classList.remove("b1-drop-target");
  hovered=id;
  if(id){targetElement(id)?.classList.add("b1-drop-target");if(id===selectedTarget()&&!stage.classList.contains("b1-multi"))enemyPuppet.classList.add("b1-drop-target");}
 }
 function ghostAt(e){
  if(!active?.moved)return;
  ghost.style.left=(e.clientX-active.rect.width/2)+"px";ghost.style.top=(e.clientY-active.rect.height*.65)+"px";
  const r=stage.getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
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
  ghost=active.button.cloneNode(true);ghost.classList.add("b1-float-card");ghost.style.width=active.rect.width+"px";ghost.style.height=active.rect.height+"px";
  document.body.append(ghost);active.button.classList.add("b1-drag-source");hand.classList.add("b1-hand-dragging");stage.classList.add("b1-casting");
  zone.textContent=active.targeted?"敵の上でカードを離す":"戦闘画面でカードを離す";
  arrow.classList.toggle("b1-visible",active.targeted);ghostAt(e);
 }
 function cleanup(){
  ghost?.remove();ghost=null;hovered=null;hand.classList.remove("b1-hand-dragging");
  stage.classList.remove("b1-casting");zone.classList.remove("b1-valid");arrow.classList.remove("b1-visible");
  hand.querySelectorAll(".b1-drag-source").forEach(b=>b.classList.remove("b1-drag-source"));
  choices.querySelectorAll(".b1-drop-target").forEach(b=>b.classList.remove("b1-drop-target"));
  enemyPuppet.classList.remove("b1-drop-target");active=null;
 }
 hand.addEventListener("pointerdown",e=>{
  const b=e.target.closest("[data-b1-hand]");
  if(!b||b.disabled||read().phase!=="battle"||(e.pointerType==="mouse"&&e.button!==0))return;
  const index=Number(b.dataset.b1Hand),info=usable(index);if(!info)return;
  active={pointerId:e.pointerId,x:e.clientX,y:e.clientY,index,rect:b.getBoundingClientRect(),button:b,moved:false,targeted:needsB1Target(info.card.kind)};
  try{b.setPointerCapture(e.pointerId);}catch{}
 });
 window.addEventListener("pointermove",e=>{
  if(!active||e.pointerId!==active.pointerId)return;
  if(!active.moved&&Math.hypot(e.clientX-active.x,e.clientY-active.y)>10){active.moved=true;beginGhost(e);}
  if(active.moved){if(e.cancelable)e.preventDefault();ghostAt(e);}
 },{passive:false});
 window.addEventListener("pointerup",e=>{
  if(!active||e.pointerId!==active.pointerId)return;
  const item=active;
  if(!item.moved){active=null;return;}
  suppressUntil=performance.now()+420;
  const target=item.targeted?pointerTarget(e.clientX,e.clientY):null;
  const r=stage.getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
  cleanup();
  if(item.targeted){if(target)fire(item.index,target,item.rect);else select(item.index);}
  else if(inside)fire(item.index,null,item.rect);
  else{cancel();message("戦闘画面にカードをドラッグすると使えます");}
 });
 window.addEventListener("pointercancel",e=>{if(active&&e.pointerId===active.pointerId){cleanup();cancel();}});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"){cleanup();cancel();}});
 enemyPuppet.addEventListener("click",()=>handleTargetClick(selectedTarget()));
 function bindHandCard(button,index){button.dataset.b1Hand=String(index);button.draggable=false;button.addEventListener("click",()=>handleCardClick(index));}
 function sync(){if(read().phase!=="battle"||(picked!==null&&!usable(picked))){picked=null;message("");}mark();}
 return{bindHandCard,handleTargetClick,sync,cancel};
}
