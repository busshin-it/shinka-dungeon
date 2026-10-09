// Experimental bridge: reuse the existing six-encounter roster without changing
// ShinkaV43, its combat engine, rewards, release metadata or any legacy save.
const ORDER = Object.freeze(["skeleton","wraith","trial","archive","elite","moth"]);
export const CLASSIC_ENCOUNTER_IDS = ORDER;
export function classicSixEncounters(gameData) {
  if (!gameData || !gameData.GROWTH_ENEMIES || !gameData.CURRENT_ENEMIES) {
    throw new Error("Existing game enemy definitions are required");
  }
  return ORDER.map((id,index)=>{
    const fromGrowth = index < 3;
    const source = fromGrowth ? gameData.GROWTH_ENEMIES[id] : gameData.CURRENT_ENEMIES[id];
    if (!source || !Number.isInteger(source.hp) || source.hp <= 0 || !Array.isArray(source.moves) || !source.moves.length) {
      throw new Error("Missing existing encounter: "+id);
    }
    const intents=source.moves.map(move=>{
      if (move.type==="recover") return Object.freeze({
        kind:"rest", label:move.label, heal:move.heal||0
      });
      if (move.type!=="attack" || !Number.isInteger(move.power) || !Number.isInteger(move.hits) || move.hits<1) {
        throw new Error("Unsupported existing enemy intent in "+id);
      }
      return Object.freeze({
        kind:"attack",label:move.label,perHit:move.power,hits:move.hits,
        // Legacy enemies do not have physical/magic attributes. Never invent one.
        damageType:"untyped",threshold:move.threshold||0,
        singleThreshold:move.singleThreshold||0,
        attackCountThreshold:move.attackCountThreshold||0,
        reduction:move.reduction||0,stepReduction:move.stepReduction||0,
        manaCondition:move.manaCondition||null,manaReduction:move.manaReduction||0
      });
    });
    return Object.freeze({
      id, enemy:Object.freeze({
        name:source.name,maxHp:source.hp,physicalResist:0,magicResist:0
      }),intents:Object.freeze(intents)
    });
  });
}
