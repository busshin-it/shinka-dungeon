// Standalone, opt-in effects pilot. Does not replace the shipped planning engine or saves.
// All damage, energy and card numbers are temporary playtest values.
export const CARDS = Object.freeze({
  bolt:    { name: "魔弾", cost: 1, kind: "spell", description: "4ダメージ。", damage: 4, damageType: "magic" },
  frost:   { name: "氷の矢", cost: 1, kind: "spell", description: "氷の弱体3。次の敵の攻撃行動の合計威力を3下げる。", weaken: 3 },
  poison:  { name: "毒の印", cost: 1, kind: "spell", description: "毒を2蓄積。敵の攻撃行動後に一度だけ発動し、減らない。", poison: 2 },
  strike:  { name: "踏み込み", cost: 0, kind: "pureWeapon", description: "物理4。純物理武器を連続使用した2枚目以降は+2。", damage: 4, damageType: "physical" },
  lunge:   { name: "追い刃", cost: 1, kind: "pureWeapon", description: "物理7。純物理武器の連続使用で+2。", damage: 7, damageType: "physical" },
  guard:   { name: "守り", cost: 1, kind: "guard", description: "防御5。このターンだけ有効。", guard: 5 },
  mirror:  { name: "鏡の結界", cost: 1, kind: "mirror", description: "鏡術防御6。次の敵の攻撃まで持続し、実防御を等倍反射。", mirrorGuard: 6 },
  heal:    { name: "聖癒", cost: 1, kind: "spell", description: "HPを5回復。", heal: 5 },
  burst:   { name: "破滅の魔弾", cost: 3, kind: "spell", description: "12ダメージ。次の敵攻撃で受けるダメージ2倍。", damage: 12, damageType: "magic", exposes: true },
  wolf:    { name: "魔狼召喚", cost: 1, kind: "summon", description: "魔狼を召喚。各ターン最初の攻撃に+3。維持中魔力上限-1。", beast: "wolf" },
  stone:   { name: "石のゴーレム召喚", cost: 1, kind: "summon", description: "守りを使うと各ターン最初の1回だけ防御+4。維持中魔力上限-1。", beast: "stone" },
  sacrifice:{ name: "生贄の儀", cost: 1, kind: "sacrifice", description: "魔獣が必要。魔狼なら物理12、ゴーレムなら防御10。", beastCost: true }
});
export const TALISMANS = Object.freeze({
  sun: {name:"朝日の護符",description:"各戦闘の開始魔力+1。",effect:"energy"},
  moon: {name:"月鏡の護符",description:"各戦闘開始時に鏡術防御4を準備。",effect:"mirror"},
  frost: {name:"氷紋の護符",description:"各戦闘開始時に敵の次の攻撃を3弱体化。",effect:"frost"},
  venom: {name:"毒花の護符",description:"各戦闘開始時に毒を2蓄積。",effect:"poison"},
  wolf: {name:"魔狼の護符",description:"各戦闘開始時に魔狼を召喚（魔力上限-1）。",effect:"wolf"},
  stone: {name:"岩守の護符",description:"各戦闘開始時にゴーレムを召喚（魔力上限-1）。",effect:"stone"},
  shield: {name:"白盾の護符",description:"各戦闘開始時に通常防御5。",effect:"guard"},
  wind: {name:"追い風の護符",description:"各戦闘の最初の手札を6枚にする。",effect:"draw"}
});
export const REWARD_POOL = Object.freeze(["mirror","poison","frost","lunge","heal","burst","wolf","stone","guard","bolt","strike","sacrifice"]);
export const STARTER_DECK = Object.freeze(["bolt","frost","poison","strike","mirror","guard","wolf","strike","burst","heal","stone","sacrifice","lunge","bolt"]);
export const ENEMY = Object.freeze({ name: "試作の番人", maxHp: 65, physicalResist: 20, magicResist: 30 });
export const INTENTS = Object.freeze([
  { kind: "attack", label: "二連撃", hits: 2, perHit: 4, damageType: "physical" },
  { kind: "rest", label: "力を蓄える", heal: 0 },
  { kind: "attack", label: "魔力砲", hits: 1, perHit: 10, damageType: "magic" },
  { kind: "attack", label: "三連撃", hits: 3, perHit: 3, damageType: "physical" }
]);
const copy = value => JSON.parse(JSON.stringify(value));
const round = n => Math.floor(n + 0.5);
export function createPilotGame(options = {}) {
  const deck = options.deck ? [...options.deck] : [...STARTER_DECK];
  const talismanId = options.talismanId ?? null;
  if (talismanId !== null && !Object.hasOwn(TALISMANS,talismanId)) throw new Error("Invalid talisman");
  const intents = options.intents || INTENTS;
  const enemy = { ...ENEMY, ...(options.enemy || {}) };
  const encounterSet = options.encounters ? copy(options.encounters) : null;
  const encounterSetId = options.encounterSetId || null;
  const journey = options.journey === true;
  const maxBattles = journey ? (options.battles ?? (encounterSet ? encounterSet.length : 3)) : 1;
  if (!Number.isInteger(maxBattles) || maxBattles < 1 || maxBattles > 12) throw new Error("Invalid journey length");
  if (!deck.length || deck.some(id => !CARDS[id])) throw new Error("Invalid pilot deck");
  if (encounterSet && (encounterSet.length !== maxBattles || typeof encounterSetId !== "string" || !encounterSetId || encounterSetId.length>80 ||
    encounterSet.some(row=>!row || !row.enemy || typeof row.enemy.name !== "string" ||
      !Number.isInteger(row.enemy.maxHp) || row.enemy.maxHp < 1 || row.enemy.maxHp > 999 ||
      !Number.isInteger(row.enemy.physicalResist) || !Number.isInteger(row.enemy.magicResist) ||
      row.enemy.physicalResist<0 || row.enemy.physicalResist>100 || row.enemy.magicResist<0 || row.enemy.magicResist>100 ||
      !Array.isArray(row.intents) || !row.intents.length ||
      row.intents.some(a=>!a || !["attack","rest"].includes(a.kind) ||
        (a.kind==="attack" && (!Number.isInteger(a.perHit) || a.perHit < 0 || !Number.isInteger(a.hits) || a.hits < 1)))))) {
    throw new Error("Invalid experimental encounter roster");
  }
  if (!intents.length || intents.some(i => !["attack","rest"].includes(i.kind))) throw new Error("Invalid pilot intents");
  const baseEnemy = encounterSet ? encounterSet[0].enemy : enemy;
  const s = {
    battle: 1, deck: [...deck], rewardOffers: [], lastReward: null,
    turn: 1, hp: options.hp ?? 30, maxHp: options.hp ?? 30, enemyHp: baseEnemy.maxHp, enemyMaxHp: baseEnemy.maxHp,
    energy: Math.max(0, Math.min(5, options.initialEnergy ?? 3)), guard: 0, mirrorGuard: 0, mirrorReady: false,
    weaken: 0, poison: 0, beast: null, beastReacted: false,
    usedSpell: false, exposed: false, weaponStreak: 0, turnDamage: 0, turnMaxHit: 0, turnAttackCards: 0, phase: "battle",
    hand: [], draw: [...deck], discard: [], log: ["効果だけの試作です。数値は仮設定。"]
  };
  function maxEnergy() { return s.beast ? 4 : 5; }
  function applyStartingTalisman() {
    if (talismanId===null) return;
    const kind=TALISMANS[talismanId].effect;
    if(kind==="energy") s.energy=Math.min(maxEnergy(),s.energy+1);
    if(kind==="mirror"){s.mirrorGuard+=4;s.mirrorReady=true;}
    if(kind==="frost") s.weaken+=3;
    if(kind==="poison") s.poison+=2;
    if(kind==="wolf" || kind==="stone"){s.beast=kind;s.energy=Math.min(s.energy,maxEnergy());}
    if(kind==="guard") s.guard+=5;
    // Extra opening draw happens after the ordinary refill, in each new encounter.
  }
  function applyOpeningDraw() {
    if(talismanId!=="wind") return;
    if(!s.draw.length && s.discard.length) s.draw=s.discard.splice(0);
    if(s.draw.length) s.hand.push(s.draw.shift());
  }
  function activeEnemy(battle=s.battle) { return encounterSet ? encounterSet[battle-1].enemy : {...enemy,maxHp:enemy.maxHp+10*(battle-1)}; }
  function activeIntents() { return encounterSet ? encounterSet[s.battle-1].intents : intents; }
  function intent() {
    const moves = activeIntents(), action=moves[(s.turn-1)%moves.length];
    if(action.kind!=="attack") return {...action};
    let reduction=0;
    if(action.manaCondition==="bank" && s.energy>=2 || action.manaCondition==="empty" && s.energy===0){
      reduction=action.manaReduction||0;
    } else if(!action.manaCondition){
      if(action.attackCountThreshold) reduction=Math.min(action.attackCountThreshold,s.turnAttackCards)*(action.stepReduction||0);
      else if(action.singleThreshold && s.turnMaxHit >= action.singleThreshold) reduction=action.reduction||0;
      else if(action.threshold && s.turnDamage >= action.threshold) reduction=action.reduction||0;
    }
    return {...action,perHit:Math.max(0,action.perHit-reduction),basePerHit:action.perHit,appliedReduction:reduction};
  }
  function refill() {
    while (s.hand.length < 5) {
      if (!s.draw.length) {
        if (!s.discard.length) break;
        s.draw = s.discard.splice(0);
      }
      s.hand.push(s.draw.shift());
    }
  }
  function deal(raw, type) {
    const e=activeEnemy();
    const resist = type === "physical" ? e.physicalResist : type === "magic" ? e.magicResist : 0;
    const damage = round(Math.max(0, raw) * (1 - resist / 100));
    const actual = Math.min(s.enemyHp, damage);
    s.enemyHp -= actual;
    if (s.enemyHp === 0) s.phase = "victory";
    return actual;
  }
  function canPlay(id) {
    const c = CARDS[id];
    return s.phase === "battle" && !!c && s.energy >= c.cost && (!c.beastCost || !!s.beast);
  }
  function play(index) {
    if (!Number.isInteger(index) || index < 0 || index >= s.hand.length) return false;
    const id = s.hand[index], c = CARDS[id];
    if (!canPlay(id)) return false;
    s.hand.splice(index, 1);
    s.discard.push(id);
    s.energy -= c.cost;
    if (c.kind !== "pureWeapon") s.weaponStreak = 0;
    if (c.kind === "spell") s.usedSpell = true;
    if (c.exposes) s.exposed = true; // High power carries risk until the next enemy action.
    if (c.weaken) s.weaken += c.weaken;
    if (c.poison) s.poison += c.poison;
    if (c.guard) s.guard += c.guard;
    if (c.mirrorGuard) { s.mirrorGuard += c.mirrorGuard; s.mirrorReady = true; }
    if (c.heal) s.hp = Math.min(s.maxHp, s.hp + c.heal);
    if (c.beast) { s.beast = c.beast; s.energy = Math.min(s.energy, maxEnergy()); }
    let extra = 0;
    if (c.damage) {
      if (c.kind === "pureWeapon") {
        if (s.weaponStreak > 0 && !s.usedSpell) extra += 2;
        s.weaponStreak++;
      }
      if (s.beast === "wolf" && !s.beastReacted) { extra += 3; s.beastReacted = true; }
      const n = deal(c.damage + extra, c.damageType);
      s.turnDamage += n;
      s.turnMaxHit = Math.max(s.turnMaxHit,n);
      s.turnAttackCards++;
      s.log.unshift(c.name + "：敵に" + n + "ダメージ。");
    } else if (c.beastCost) {
      const sacrificed = s.beast;
      s.beast = null;
      // Sacrifice is a separate effect; it does not reset the shared reaction limit.
      if (sacrificed === "wolf") {
        const n = deal(12,"physical");
        s.log.unshift("魔狼を生贄にして" + n + "ダメージ。");
      } else {
        s.guard += 10;
        s.log.unshift("ゴーレムを生贄にして防御10。");
      }
    } else {
      if (s.beast === "stone" && !s.beastReacted && ["guard","mirror"].includes(c.kind)) {
        if (c.kind === "mirror") s.mirrorGuard += 4;
        else s.guard += 4;
        s.beastReacted = true;
      }
      s.log.unshift(c.name + "を使用。");
    }
    s.log = s.log.slice(0, 8);
    return true;
  }
  function endTurn() {
    if (s.phase !== "battle") return false;
    const action = intent();
    if (action.kind === "rest") {
      const heal = Math.min(s.enemyMaxHp - s.enemyHp, action.heal || 0);
      s.enemyHp += heal;
      s.log.unshift("敵は" + action.label + "。鏡術防御・氷の弱体・毒は維持。");
    } else {
      const total = Math.max(0, action.hits * action.perHit - s.weaken);
      const normalUsed = Math.min(s.guard, total);
      const mirrorUsed = Math.min(s.mirrorGuard, total - normalUsed);
      const blocked = normalUsed + mirrorUsed;
      const damage = (total - blocked) * (s.exposed ? 2 : 1);
      s.hp = Math.max(0, s.hp - damage);
      s.weaken = 0;
      s.guard = Math.max(0, s.guard - normalUsed);
      // Mirror waits until the entire attack action ends; leftover guard expires.
      const reflected = s.mirrorReady && s.hp > 0 ? blocked : 0;
      s.mirrorReady = false;
      s.mirrorGuard = 0;
      if (s.hp <= 0) {
        s.phase = "defeat";
        s.log.unshift("敵の" + action.label + "でHPが0。反射・毒を使わず敗北。");
      } else {
        const reflectHit = Math.min(s.enemyHp, reflected);
        s.enemyHp -= reflectHit; // typeless; ignores enemy physical/magic resistance
        let poisonHit = 0;
        if (s.enemyHp > 0 && s.poison > 0) {
          poisonHit = Math.min(s.poison, s.enemyHp);
          s.enemyHp -= poisonHit;
        }
        if (s.enemyHp <= 0) s.phase = "victory";
        s.log.unshift("敵の" + action.label + "：防御" + blocked + "、被害" + damage + "、反射" + reflectHit + "、毒" + poisonHit + "。");
      }
    }
    if(action.kind === "attack") s.exposed = false; // Enemy actions, not rests, consume the downside.
    s.guard = 0; // Ordinary guard expires each turn; mirror guard survives only nonattacks.
    s.discard.push(...s.hand.splice(0));
    if (s.phase === "battle") {
      s.turn++;
      s.energy = Math.min(maxEnergy(), s.energy + 3); // Carry energy forward; active beast lowers the cap.
      s.beastReacted = false;
      s.usedSpell = false;
      s.weaponStreak = 0;
      s.turnDamage = s.turnMaxHit = s.turnAttackCards = 0;
      refill();
    } else {
      s.mirrorGuard = 0; s.mirrorReady = false;
    }
    s.log = s.log.slice(0, 8);
    return true;
  }
  function rewardOptions() {
    return s.phase === "reward" ? [...s.rewardOffers] : [];
  }
  function openReward() {
    if (!journey || s.phase !== "victory") return false;
    if (s.battle === maxBattles) {
      s.phase = "complete";
      s.log.unshift("試作の冒険を最後まで進めました。");
      s.log = s.log.slice(0,8);
      return true;
    }
    const start = (s.battle * 3 + s.deck.length) % REWARD_POOL.length;
    s.rewardOffers = Array.from({length: 4}, (_, i) => REWARD_POOL[(start + i) % REWARD_POOL.length]);
    s.phase = "reward";
    return true;
  }
  function chooseReward(id) {
    if (!journey || s.phase !== "reward" || (id !== null && !s.rewardOffers.includes(id))) return false;
    if (id !== null) {
      s.deck.push(id);
      s.draw.unshift(id); // keep the zones valid before entering the next encounter
    }
    s.lastReward = id;
    s.hp = Math.min(s.maxHp, s.hp + 8);
    s.rewardOffers = [];
    s.phase = "ready";
    s.log.unshift(id === null ? "報酬を見送り、HPを回復。" : CARDS[id].name + "を報酬に選び、HPを回復。");
    s.log = s.log.slice(0,8);
    return true;
  }
  function nextBattle() {
    if (!journey || s.phase !== "ready" || s.battle >= maxBattles) return false;
    s.battle++;
    s.turn = 1;
    s.enemyMaxHp = activeEnemy().maxHp; // existing game encounter HP if roster bridge is enabled
    s.enemyHp = s.enemyMaxHp;
    s.energy = 3;
    s.guard = s.mirrorGuard = s.weaken = s.poison = s.weaponStreak = 0;
    s.turnDamage = s.turnMaxHit = s.turnAttackCards = 0;
    s.mirrorReady = s.beastReacted = s.usedSpell = s.exposed = false;
    s.beast = null;
    s.hand = [];
    s.discard = [];
    s.draw = [...s.deck];
    if (s.lastReward !== null) {
      const i = s.draw.lastIndexOf(s.lastReward);
      if (i >= 0) s.draw.unshift(s.draw.splice(i, 1)[0]); // earned card appears in next opening hand
    }
    s.phase = "battle";
    s.log.unshift("第" + s.battle + "戦開始。魔獣・毒・防御はリセット。");
    applyStartingTalisman();
    refill();
    applyOpeningDraw();
    s.log = s.log.slice(0,8);
    return true;
  }
  // Save is isolated from the shipped planning-game saves; never restore a legacy save.
  function exportSave() {
    return journey ? copy({version: 1, mode: "six-paths-journey", battles: maxBattles, ...(encounterSet ? {encounterSetId} : {}), ...(talismanId ? {talismanId} : {}), state: s}) : null;
  }
  function restoreSave(save) {
    if (!journey || !save || save.version !== 1 || save.mode !== "six-paths-journey" || save.battles !== maxBattles ||
      (encounterSet ? save.encounterSetId !== encounterSetId : Object.hasOwn(save,"encounterSetId")) ||
      (talismanId ? save.talismanId !== talismanId : Object.hasOwn(save,"talismanId"))) return false;
    try {
      const x = copy(save.state);
      // Old pilot saves did not persist exposure; preserve them on balance updates.
      if(x && typeof x === "object" && !Array.isArray(x) && !Object.hasOwn(x,"exposed")) x.exposed=false;
      if (!x || typeof x !== "object" || Array.isArray(x)) return false;
      if (Object.keys(x).sort().join("|") !== Object.keys(s).sort().join("|")) return false;
      const integer=(v,min,max)=>Number.isInteger(v) && v>=min && v<=max;
      if (!integer(x.battle,1,maxBattles) || !integer(x.turn,1,10000) || !integer(x.hp,0,x.maxHp) ||
          !integer(x.maxHp,1,999) || !integer(x.enemyMaxHp,1,999) ||
          x.enemyMaxHp !== activeEnemy(x.battle).maxHp ||
          !integer(x.enemyHp,0,x.enemyMaxHp) || !integer(x.energy,0,5) ||
          !integer(x.guard,0,99999) || !integer(x.mirrorGuard,0,99999) ||
          !integer(x.weaken,0,99999) || !integer(x.poison,0,99999) ||
          !integer(x.weaponStreak,0,9999) ||
          !integer(x.turnDamage,0,99999) || !integer(x.turnMaxHit,0,99999) ||
          !integer(x.turnAttackCards,0,9999)) return false;
      if (typeof x.mirrorReady !== "boolean" || typeof x.beastReacted !== "boolean" ||
          typeof x.usedSpell !== "boolean" || typeof x.exposed !== "boolean" || ![null,"wolf","stone"].includes(x.beast) ||
          !["battle","victory","reward","ready","defeat","complete"].includes(x.phase)) return false;
      if (![x.deck,x.hand,x.draw,x.discard,x.rewardOffers,x.log].every(Array.isArray) ||
          x.deck.length < 1 || x.deck.length > 150 || x.rewardOffers.length > 4 ||
          x.log.length > 8 || x.log.some(t=>typeof t!=="string" || t.length>400) ||
          [x.deck,x.hand,x.draw,x.discard,x.rewardOffers].some(a=>a.some(v=>typeof v!=="string" || !CARDS[v]))) return false;
      const order = a => [...a].sort().join("|");
      if (order([...x.hand,...x.draw,...x.discard]) !== order(x.deck)) return false;
      if ((x.phase === "reward" && x.rewardOffers.length !== 4) ||
          (x.phase !== "reward" && x.rewardOffers.length !== 0) ||
          (x.phase === "battle" && (!x.hp || !x.enemyHp)) ||
          (["victory","reward","ready","complete"].includes(x.phase) && x.enemyHp !== 0) ||
          (x.phase === "defeat" && x.hp !== 0) ||
          (x.phase === "complete" && x.battle !== maxBattles) ||
          !(x.lastReward === null || CARDS[x.lastReward])) return false;
      Object.assign(s,copy(x));
      return true;
    } catch { return false; }
  }
  applyStartingTalisman();
  refill();
  applyOpeningDraw();
  return {
    snapshot: () => copy({ ...s, talismanId, enemy: { ...activeEnemy() }, nextIntent: { ...intent() }, maxEnergy: maxEnergy(), journey, maxBattles }),
    card: id => CARDS[id] ? { ...CARDS[id], id } : null,
    canPlay, play, endTurn, rewardOptions, openReward, chooseReward, nextBattle, exportSave, restoreSave
  };
}
