// Optional pre-run talisman + opening-hand forge. Draft offers are not saved
// before the run begins. Callers may inject a random function for deterministic tests.
import { CARDS, TALISMANS } from "./six-paths-pilot.mjs";
export const FORGE_FIXED_DECK = Object.freeze(["bolt","strike","guard","guard","mirror","heal"]);
export const FORGE_DRAFT_ROUNDS = Object.freeze([
  Object.freeze(["bolt","strike","lunge","burst"]),
  Object.freeze(["guard","mirror","heal","frost"]),
  Object.freeze(["poison","frost","wolf","stone"]),
  Object.freeze(["lunge","burst","heal","wolf","stone","bolt"])
]);
export const FORGE_PICK_COUNT = FORGE_DRAFT_ROUNDS.length;
export function randomOffer(pool,count=3,random=Math.random) {
  if (!Array.isArray(pool) || count<1 || count>pool.length || new Set(pool).size!==pool.length) throw new Error("Invalid candidate pool");
  const shuffled=[...pool];
  for (let i=shuffled.length-1;i>0;i--){
    const n=random();
    if (!Number.isFinite(n) || n<0 || n>=1) throw new Error("Invalid random source");
    const j=Math.floor(n*(i+1));
    [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
  }
  return shuffled.slice(0,count);
}
export function talismanCandidates(random=Math.random) {
  return randomOffer(Object.keys(TALISMANS),4,random);
}
export function starterChoices(round,random=Math.random) {
  if (!Number.isInteger(round) || round<0 || round>=FORGE_PICK_COUNT) throw new Error("Invalid draft round");
  return randomOffer(FORGE_DRAFT_ROUNDS[round],3,random);
}
export function forgeDeck(picks) {
  if (!Array.isArray(picks) || picks.length!==FORGE_PICK_COUNT) throw new Error("Four choices required");
  for (let i=0;i<picks.length;i++){
    if (!FORGE_DRAFT_ROUNDS[i].includes(picks[i]) || !CARDS[picks[i]]) throw new Error("Invalid drafted card");
  }
  // Four player-picked cards and one guaranteed bolt are the opening 5 cards.
  return [...picks, FORGE_FIXED_DECK[0], ...FORGE_FIXED_DECK.slice(1)];
}
