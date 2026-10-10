// B1-only visual feedback; never changes HP, card state, or turn order.
export function showB1SynergyCue(stage,event,{reduced=false}={}){
 if(!stage||!event||!event.title||!event.detail)return false;
 for(const old of stage.querySelectorAll?.(".b1-synergy-toast")||[])old.remove();
 const cue=document.createElement("div");cue.className="b1-synergy-toast";
 cue.setAttribute("role","status");cue.setAttribute("aria-live","polite");
 const heading=document.createElement("strong");heading.textContent="連携！ "+event.title;
 const detail=document.createElement("span");detail.textContent=event.detail;
 cue.append(heading,detail);stage.append(cue);
 if(reduced||!cue.animate){setTimeout(()=>cue.remove(),1350);return true;}
 const motion=cue.animate([
  {opacity:0,transform:"translate(-50%,10px) scale(.92)"},
  {opacity:1,transform:"translate(-50%,0) scale(1.04)",offset:.20},
  {opacity:1,transform:"translate(-50%,0) scale(1)",offset:.68},
  {opacity:0,transform:"translate(-50%,-12px) scale(.98)"}
 ],{duration:1350,easing:"ease-out"});
 motion.onfinish=()=>cue.remove();
 return true;
}
export function showB1Feedback({stage,hero,enemy,choices,before,after,card,targetId,sourceRect,turnEnded=false}){
 if(!before||!after)return;
 const reduced=!!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 if(card&&after.lastSynergy)showB1SynergyCue(stage,after.lastSynergy,{reduced});
 const result=new Map(after.enemies.map(e=>[e.id,e]));
 const buttonFor=id=>[...choices.querySelectorAll("[data-b1-enemy]")].find(b=>b.dataset.b1Enemy===id);
 const anchorFor=id=>buttonFor(id)||enemy;
 const multi=before.enemies.length>1;
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
 function spellImpact(target,delay=0){
  if(reduced||!target)return;
  const origin=hero.getBoundingClientRect(),goal=target.getBoundingClientRect(),board=stage.getBoundingClientRect();
  const x1=origin.left+origin.width*.58-board.left,y1=origin.top+origin.height*.5-board.top;
  const x2=goal.left+goal.width*.5-board.left,y2=goal.top+goal.height*.43-board.top;
  const length=Math.hypot(x2-x1,y2-y1),angle=Math.atan2(y2-y1,x2-x1)*180/Math.PI;
  if(length<5)return;
  const beam=document.createElement("i");beam.className="b1-spell-trail";
  beam.style.left=x1+"px";beam.style.top=y1+"px";
  beam.style.width=length+"px";beam.style.transform="rotate("+angle+"deg)";
  stage.append(beam);
  const anim=beam.animate([
   {opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0 0 0)",offset:.45},
   {opacity:0,clipPath:"inset(0 0 0 0)"}
  ],{duration:480,delay,easing:"ease-out"});
  anim.onfinish=()=>beam.remove();
 }
 const harmful=card&&["attack","multi","all","poison","fragile","dragonBreath"].includes(card.kind);
 if(card)fly(harmful?(targetId?anchorFor(targetId):(multi?choices:enemy)):hero);
 if(harmful){
  const hits=(card?.kind==="all"||card?.kind==="dragonBreath")?before.enemies.filter(e=>e.hp>0).map(e=>e.id):[targetId].filter(Boolean);
  hits.forEach((id,i)=>spellImpact(anchorFor(id),i*75));
 }
 for(const old of before.enemies){
  const newer=result.get(old.id);if(!newer)continue;
  const lost=Math.max(0,old.hp-newer.hp);
  if(lost){pop(anchorFor(old.id),"-"+lost);shake(anchorFor(old.id));}
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
 if(turnEnded&&!reduced){
  // Damage is already resolved by the engine; these motions are visual only.
  // Poison may kill an enemy or interrupt the boss before its planned attack.
  before.enemies.forEach((e,i)=>{
   const next=result.get(e.id),a=before.intents?.find(it=>it.id===e.id);
   if(e.hp<=0||!next||next.hp<=0||a?.kind!=="attack"||(e.role==="boss"&&next.channelBroken))return;
   const actor=anchorFor(e.id),figure=actor.querySelector?.(".b1-actor-figure img")||actor;
   figure.animate([
    {transform:"translateX(0) scale(1)",filter:"brightness(1)"},
    {transform:"translateX(-13%) scale(1.08)",filter:"brightness(1.35)",offset:.45},
    {transform:"translateX(0) scale(1)",filter:"brightness(1)"}
   ],{duration:400,delay:i*130,easing:"ease-in-out"});
  });
 }
 if(turnEnded&&pain&&!reduced){
  stage.classList.remove("b1-turn-flash");void stage.offsetWidth;stage.classList.add("b1-turn-flash");
 }
}
