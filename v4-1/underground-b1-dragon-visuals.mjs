// Visual-only mapping: the B1 combat engine keeps its existing nine growth steps.
// Eight supplied artworks are packed as one 4-by-2 sprite to avoid multiple heavy downloads.
export const DRAGON_VISUAL_SPRITE="./assets/b1-dragon-evolution.avif";
export const DRAGON_VISUAL_LABELS=Object.freeze(["竜の卵","幼竜","小さな竜","成竜","中竜","大竜","巨竜","神龍"]);
export const DRAGON_VISUAL_STAGE_MAP=Object.freeze([0,1,1,2,3,4,5,6,7]);
export function getB1DragonVisual(stage){
 if(!Number.isInteger(stage)||stage<0||stage>=DRAGON_VISUAL_STAGE_MAP.length)return null;
 const index=DRAGON_VISUAL_STAGE_MAP[stage];
 const column=index%4,row=Math.floor(index/4);
 return Object.freeze({
  label:DRAGON_VISUAL_LABELS[index],
  spriteIndex:index,
  sprite:DRAGON_VISUAL_SPRITE,
  position:(column*100/3).toFixed(3)+"% "+(row*100).toFixed(0)+"%"
 });
}
