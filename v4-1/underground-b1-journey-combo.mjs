// Visual only: react to a combo that the combat engine has ALREADY confirmed.
// No card power, HP, targeting, RNG or game state is changed here.
export function getB1JourneyComboTone(event){
 const name=event?.title;
 if(typeof name!=="string"||!event?.detail)return null;
 if(name==="毒炎連携"||name==="余毒の頁連携"||name==="封毒の盾")return "poison";
 if(name==="霜砕き連携")return "frost";
 if(name==="雷連鎖"||name==="連鎖雷連携")return "thunder";
 if(["闇魔法連携","魔装斬連携","返響の盾連携","育竜の護り"].includes(name))return "arcane";
 return null;
}
export function showB1JourneyComboPulse({stage,hero,enemy,choices,event,targetId,card,reduced=false}){
 const tone=getB1JourneyComboTone(event);
 if(!tone||!stage||!hero||!enemy)return false;
 const defensive=["guard","dragon","draw","power"].includes(card?.kind);
 const actor=defensive?hero:(targetId?[...choices?.querySelectorAll?.("[data-b1-enemy]")||[]].find(el=>el.dataset.b1Enemy===targetId):null)||enemy;
 if(!actor)return false;
 const board=stage.getBoundingClientRect(),bounds=actor.getBoundingClientRect();
 if(!board.width||!bounds.width)return false;
 for(const node of stage.querySelectorAll?.(".b1-journey-combo-pulse")||[])node.remove();
 const pulse=document.createElement("span");
 pulse.className="b1-journey-combo-pulse";pulse.dataset.tone=tone;pulse.setAttribute("aria-hidden","true");
 pulse.style.left=(bounds.left-board.left+bounds.width/2)+"px";
 pulse.style.top=(bounds.top-board.top+bounds.height*.44)+"px";
 const size=Math.max(54,Math.min(116,Math.min(bounds.width,bounds.height)*.75));
 pulse.style.width=size+"px";pulse.style.height=size+"px";
 stage.append(pulse);
 if(reduced||!pulse.animate){pulse.remove();return true;}
 const animation=pulse.animate([
  {opacity:0,transform:"translate(-50%,-50%) scale(.55)"},
  {opacity:1,transform:"translate(-50%,-50%) scale(1.08)",offset:.32},
  {opacity:0,transform:"translate(-50%,-50%) scale(1.7)"}
 ],{duration:690,easing:"ease-out"});
 animation.onfinish=()=>pulse.remove();
 return true;
}
