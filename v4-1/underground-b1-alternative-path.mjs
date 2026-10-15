// Step 84: optional, informational labels for exploring an alternative strategy.
// Never modify the reward pool, game state, probabilities, or card effects.
export function getB1AlternativePathHint(weaponId, card, hasWeaponAffinity) {
  if (!weaponId || hasWeaponAffinity || !card) return null;
  if (card.lightning === true) return {label:"別軸：雷", detail:"装備とは別に雷カードの連続使用を育てる選択肢"};
  if (card.kind === "guard" && Number(card.block) > 0) return {label:"別軸：防御", detail:"装備以外の防御手段を増やす選択肢"};
  if (card.kind === "dragon") return {label:"別軸：竜", detail:"卵から竜を育てる戦術へ広げる選択肢"};
  if (card.kind === "dragonFeed") return {label:"別軸：育竜", detail:"竜を育てるカード。使用には竜の卵が必要"};
  if (card.kind === "draw") return {label:"別軸：ドロー", detail:"手札の選択肢を増やす戦術"};
  return null;
}
