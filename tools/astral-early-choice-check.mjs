// Small deterministic comparison, not a balance/fun benchmark.
// node tools/astral-early-choice-check.mjs > design/production/early-choice-results.json
import assert from 'node:assert/strict';
import {loadEngine, restored, fight, DEFAULTS} from './astral-growth-balance.mjs';
import {pathToFileURL} from 'node:url';
export const OPTIONS = {...DEFAULTS, beam:3, maxCards:5, maxTurns:24};
export function compareEarlyChoices(E=loadEngine()) {
 const rows=[],opening=[];
 for(const seed of [1,7]) {
  const g=E.createGame(E.seededRandom(seed),{ruleset:E.EARLY_CHOICE_RULESET});g.selectOrigin('frost');g.start();
  const first=fight(E,g,OPTIONS);assert(first.win);g.openReward();const save=g.exportSave();
  opening.push({seed,firstBattle:first,offers:g.rewardOptions()});
  for(const route of ['moon','forge'])for(const choice of [...g.rewardOptions(),null]) {
   const branch=restored(E,save);assert(branch.chooseReward(choice));assert(branch.chooseRoute(route));assert(branch.nextBattle());
   const second=fight(E,branch,OPTIONS);assert(second.win);branch.openReward();
   const offers=branch.rewardOptions();const secondChoice=offers[1];assert(branch.chooseReward(secondChoice));assert(branch.chooseSanctuary('rest'));assert(branch.nextBattle());
   const third=fight(E,branch,OPTIONS);assert(third.win);
   rows.push({seed,route,choice,second,secondOffers:offers,secondChoice,third});
  }
 }
 return {purpose:'Limited beam search, two seeds, one charm, 16 branches. Does not establish fun, optimal play or balance.',ruleset:E.EARLY_CHOICE_RULESET,options:OPTIONS,opening,rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareEarlyChoices(),null,2));
