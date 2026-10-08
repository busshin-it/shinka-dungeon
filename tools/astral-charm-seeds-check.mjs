// Bounded counterfactual comparison of six charms, not a natural reward/build or fun benchmark.
import {loadEngine,restored,fight} from './astral-growth-balance.mjs';
import {OPTIONS} from './astral-early-choice-check.mjs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const plain=x=>JSON.parse(JSON.stringify(x));
const profiles={sequence:['chain','charge'],guard:['guard','shieldStrike'],prepare:['starWait','bolt']};
function result(E,g){const before=g.snapshot().stats.played,b=fight(E,g,OPTIONS),after=g.snapshot().stats.played;b.usedCards=Object.fromEntries(Object.entries(after).map(([id,n])=>[id,n-(before[id]||0)]).filter(([,n])=>n));return b;}
export function compareCharms(E=loadEngine()){
 const rows=[];
 for(const seed of [1,7]){
  const source=E.createGame(E.seededRandom(seed),{ruleset:E.EARLY_CHOICE_RULESET});source.start();const firstSave=plain(source.exportSave());
  for(const [profile,cards]of Object.entries(profiles))for(const origin of [...Object.keys(E.ORIGINS),...Object.keys(E.TRIAL_ORIGINS)]){
   // Same starting HP, deck, hand and RNG. Only origin changes.
   const save=plain(firstSave);save.state.origin=origin;const g=restored(E,save),first=result(E,g),battles=[first];
   if(first.win){g.openReward();g.chooseReward(null);g.chooseRoute('moon');g.nextBattle();
    // Two controlled reward cards replace two basics. This is not an obtainable battle-2 reward history.
    const second=plain(g.exportSave()),s=second.state;s.deck=[...cards,...E.BASIC_STARTER.slice(2)];s.hand=[...cards,...E.BASIC_STARTER.slice(2,5)];s.draw=E.BASIC_STARTER.slice(5);s.discard=[];s.exhaust=[];assert(g.restoreSave(second));
    const b=result(E,g);battles.push(b);if(b.win){g.openReward();g.chooseReward(null);g.chooseSanctuary('rest');g.nextBattle();battles.push(result(E,g));}
   }
   rows.push({seed,profile,cards,origin,battles});
  }
 }
 return {sourceCommit:'fc157e7e14b789d34940394ef56a2415f116fba2',purpose:'2 fixed seeds × 6 charms × 3 controlled two-card decks, moon route, at most 108 battles. Counterfactual initial origins and synthetic battle-2 decks; not natural reward frequency or optimal/human play. Later HP and draw/RNG may differ as an actual consequence of actions.',options:OPTIONS,rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareCharms(),null,2));
