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


// Twelve-stage effect-only experiment, NOT changes to the canonical six-encounter game.
// Six fresh enemies are inserted before existing milestones, so rewards can shape the deck
// before harder opponents. New enemy names, HP and resistances are provisional.
const newEnemy = (id,name,hp,physicalResist,magicResist,intents) => Object.freeze({
  id, enemy:Object.freeze({name,maxHp:hp,physicalResist,magicResist}),
  intents:Object.freeze(intents.map(row=>Object.freeze(row)))
});
export const EXTRA_SIX = Object.freeze([
  newEnemy("mistRogue","霧道の盗賊",23,0,0,[
    {kind:"attack",label:"小刀",perHit:4,hits:1,damageType:"physical"},
    {kind:"rest",label:"間合いを測る",heal:0},
    {kind:"attack",label:"二本の短剣",perHit:3,hits:2,damageType:"physical"}
  ]),
  newEnemy("mossSentinel","苔の守り手",32,10,0,[
    {kind:"attack",label:"つるの一撃",perHit:6,hits:1,damageType:"physical"},
    {kind:"rest",label:"苔を育てる",heal:2},
    {kind:"attack",label:"根の双撃",perHit:4,hits:2,damageType:"physical"}
  ]),
  newEnemy("ashLancer","灰鎧の槍兵",43,20,0,[
    {kind:"attack",label:"二段突き",perHit:5,hits:2,damageType:"physical"},
    {kind:"rest",label:"槍を構える",heal:0},
    {kind:"attack",label:"渾身の突き",perHit:12,hits:1,damageType:"physical"}
  ]),
  newEnemy("frostDancer","凍星の舞姫",57,0,20,[
    {kind:"rest",label:"氷の舞を整える",heal:0},
    {kind:"attack",label:"氷の三連舞",perHit:4,hits:3,damageType:"magic"},
    {kind:"attack",label:"凍風の刃",perHit:10,hits:1,damageType:"magic"}
  ]),
  newEnemy("shadowScribe","影綴りの術士",70,0,25,[
    {kind:"attack",label:"影文字の詠唱",perHit:14,hits:1,damageType:"magic",threshold:12,reduction:6},
    {kind:"rest",label:"影を編む",heal:3},
    {kind:"attack",label:"二重詠唱",perHit:5,hits:2,damageType:"magic"}
  ]),
  newEnemy("bellWarden","鐘楼の護衛",85,25,0,[
    {kind:"attack",label:"鐘楼の二段斬り",perHit:7,hits:2,damageType:"physical"},
    {kind:"rest",label:"構えを改める",heal:0},
    {kind:"attack",label:"鐘の大振り",perHit:16,hits:1,damageType:"physical",singleThreshold:12,reduction:6}
  ])
]);
export const TWELVE_ENCOUNTER_IDS = Object.freeze([
  "skeleton","mistRogue","wraith","mossSentinel","trial","ashLancer",
  "archive","frostDancer","elite","shadowScribe","bellWarden","moth"
]);
export function longTwelveEncounters(gameData) {
  const canonical=classicSixEncounters(gameData);
  const extra=EXTRA_SIX;
  const result=[
    canonical[0],extra[0],canonical[1],extra[1],canonical[2],extra[2],
    canonical[3],extra[3],canonical[4],extra[4],extra[5],canonical[5]
  ];
  if(result.map(row=>row.id).join("|")!==TWELVE_ENCOUNTER_IDS.join("|")) {
    throw new Error("Experimental twelve-encounter order mismatch");
  }
  return result;
}
