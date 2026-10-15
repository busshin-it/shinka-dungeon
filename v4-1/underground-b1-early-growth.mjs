// Only the separate 15-floor trial uses this helper.
// Input order is already shuffled by the B1 engine's seeded RNG.
// Keep the same eligible pool and never change the card or its effect.
function family(card) {
 if (!card) return [];
 const tags=[];
 if (card.lightning) tags.push("lightning");
 if (card.kind==="dragon"||card.kind==="dragonFeed"||card.kind==="dragonBreath"||card.shieldDragonGrowth||card.dragonBlockPerStage) tags.push("dragon");
 if (card.weapon && ["attack","multi","all","physicalPower"].includes(card.kind)) tags.push("physical");
 if (card.poison||card.poisonOnBlock||card.kind==="allPoison"||card.kind==="decayRitual") tags.push("poison");
 if (card.kind==="guard"&&card.block>0) tags.push("guard");
 if (card.draw||card.powerDraw||card.afterAttackDraw||card.poisonDraw) tags.push("draw");
 if (card.school==="dark"||card.curseTurns||card.curseOnHitTurns) tags.push("dark");
 return tags;
}

export function selectB1EarlyGrowthOffers(shuffledPool, deck, weaponId, readCard, limit=4) {
 const selected=[],seen=new Set();
 const existing=new Set(deck.flatMap(id=>family(readCard(id))));
 const favored={thunderStaff:"lightning",oldClub:"physical",mirrorStaff:"guard",dragonStaff:"dragon"}[weaponId];
 const pick=(matches)=>{
  const id=shuffledPool.find(id=>!seen.has(id)&&readCard(id)&&matches(readCard(id)));
  if(id!==undefined){selected.push(id);seen.add(id);}
 };
 // One familiar card, one different but usable direction, then fair random choices.
 if(favored)pick(card=>family(card).includes(favored));
 if(selected.length===0&&existing.size)pick(card=>family(card).some(tag=>existing.has(tag)));
 pick(card=>family(card).some(tag=>!existing.has(tag)&&tag!==favored));
 for(const id of shuffledPool) {
  if(selected.length>=limit)break;
  if(!seen.has(id)&&readCard(id)){selected.push(id);seen.add(id);}
 }
 return selected;
}
