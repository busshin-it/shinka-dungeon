/* Pure gesture state machine. No DOM, engine, storage, timers, or network. */
(() => {
  function createController(callbacks={},threshold=12){
    let active=null;
    const valid=(a,b)=>a&&b&&a.phase==='battle'&&b.phase==='battle'&&a.revision===b.revision&&a.index===b.index&&a.id===b.id;
    const cancel=reason=>{const old=active;active=null;if(old&&old.mode!=='pressed')callbacks.cancel?.(reason);return Boolean(old&&old.mode!=='pressed');};
    return Object.freeze({
      begin(pointerId,x,y,card){if(active&&active.pointerId!==pointerId){cancel('multitouch');return false;}if(active||!card||card.phase!=='battle')return false;active={pointerId,x,y,card:{...card},mode:'pressed'};return true;},
      move(pointerId,x,y,zone,current,pick){if(!active||active.pointerId!==pointerId)return null;if(!valid(active.card,current)){cancel('stale');return null;}const a=active;
        if(a.mode!=='drag'&&a.y-y>=threshold){a.mode='drag';callbacks.lift?.(a.card);}
        else if(a.mode!=='drag'&&Math.abs(x-a.x)>=8){const firstScrub=a.mode!=='scrub';a.mode='scrub';const next=pick?.(x);if(next&&next.phase==='battle'&&next.revision===a.card.revision&&(next.index!==a.card.index||firstScrub)){a.card={...next};callbacks.select?.(a.card);}}
        if(a.mode==='drag')callbacks.move?.(x,y,Boolean(zone&&current.affordable&&a.y-y>=threshold),a.card);return a.mode;
      },
      end(pointerId,x,y,zone,current){if(!active||active.pointerId!==pointerId)return {handled:false,played:false};const a=active;active=null;const handled=a.mode!=='pressed';let played=false;if(a.mode==='drag'&&a.y-y>=threshold&&zone&&valid(a.card,current)&&current.affordable)played=Boolean(callbacks.commit?.(a.card));if(a.mode==='drag'&&!played)callbacks.cancel?.('return');callbacks.finish?.(handled);return {handled,played,mode:a.mode};},
      cancel,
      reconcile(current){if(active&&!valid(active.card,current))return cancel('stale');return false;},
      snapshot(){return active?{...active,card:{...active.card}}:null;}
    });
  }
  globalThis.ShinkaFanGesture=Object.freeze({createController});
})();
