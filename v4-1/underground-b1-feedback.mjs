// B1-only visual feedback; never changes HP, card state, or turn order.
export function showB1Feedback({stage,hero,enemy,choices,before,after,card,targetId,sourceRect,turnEnded=false}){
 if(!before||!after)return;
 const reduced=!!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 const result=new Map(after.enemies.map(e=>[e.id,e]));
 const buttonFor=id=>[...choices.querySelectorAll("[data-b1-enemy]")].find(b=>b.dataset.b1Enemy===id);
 const anchorFor=id=>buttonFor(id)||enemy;
 function pop(target,label,kind){
  if(!target||!label)return;
  const box=target.getBoundingClientRect(),board=stage.getBoundingClientRect();
  const node=document.createElement("span");node.className="b1-number"+(kind?" "+kind:"");
  node.style.left=(box.left-board.left+box.width/2)+"px";
  node.style.top=(box.top-board.top+box.height*.26)+"px";
  node.textContent=label;stage.append(node);
  if(reduced){setTimeout(()=>node.remove(),350);return;}
  const motion=node.animate([{opacity:0,transform:"translate(-50%,0) scale(.7)"},{opacity:1,transform:"translate(-50%,-24px) scale(1.12)",offset:.2},{opacity:0,transform:"translate(-50%,-66px) scale(.98)"}],{duration:900,easing:"ease-out"});
  motion.onfinish=()=>node.remove();
 }
 function shake(target){
  if(reduced||!target)return;
  target.animate([{transform:"translateX(0)"},{transform:"translateX(-9px)"},{transform:"translateX(7px)"},{transform:"translateX(-4px)"},{transform:"translateX(0)"}],{duration:320,easing:"ease-out"});
 }
 function fly(target){
  if(!sourceRect||!card||reduced||!target)return;
  const end=target.getBoundingClientRect(),node=document.createElement("div");
  node.className="b1-float-card";node.textContent=card.name;
  node.style.left=sourceRect.left+"px";node.style.top=sourceRect.top+"px";
  node.style.width=sourceRect.width+"px";node.style.height=sourceRect.height+"px";
  node.style.background="#e8dfcb";node.style.color="#192f3b";node.style.border="1px solid #dcb56a";
  node.style.borderRadius="7px";node.style.display="grid";node.style.placeItems="center";node.style.fontWeight="800";
  document.body.append(node);
  const dx=end.left+end.width/2-sourceRect.left-sourceRect.width/2;
  const dy=end.top+end.height/2-sourceRect.top-sourceRect.height/2;
  const m=node.animate([{transform:"translate(0,0) scale(1)",opacity:.95},{transform:"translate("+dx+"px,"+dy+"px) scale(.25)",opacity:.12}],{duration:300,easing:"ease-in"});
  m.onfinish=()=>node.remove();
 }
 const harmful=card&&["attack","multi","all","poison","fragile"].includes(card.kind);
 if(card)fly(harmful?anchorFor(targetId):hero);
 for(const old of before.enemies){
  const newer=result.get(old.id);if(!newer)continue;
  const lost=Math.max(0,old.hp-newer.hp);
  if(lost){pop(anchorFor(old.id),"-"+lost);if(old.id===targetId||before.enemies.length===1)shake(enemy);}
  else if(newer.block<old.block&&harmful)pop(anchorFor(old.id),"防御","b1-block");
  else if(newer.poison>old.poison||newer.weaken>old.weaken||newer.vulnerable>old.vulnerable)pop(anchorFor(old.id),"状態異常","b1-status");
 }
 const pain=Math.max(0,before.hp-after.hp);
 const heal=Math.max(0,after.hp-before.hp);
 const block=Math.max(0,after.block-before.block);
 if(pain){pop(hero,"-"+pain);shake(hero);}
 else if(heal)pop(hero,"+"+heal,"b1-heal");
 else if(block)pop(hero,"防御+"+block,"b1-block");
 else if(card?.kind==="power"||card?.kind==="energy")pop(hero,card.kind==="power"?"強化":"魔力+1","b1-status");
 if(turnEnded&&pain&&!reduced){
  stage.classList.remove("b1-turn-flash");void stage.offsetWidth;stage.classList.add("b1-turn-flash");
 }
}
