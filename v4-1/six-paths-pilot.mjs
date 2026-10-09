// Standalone, opt-in effects pilot. Does not replace the shipped planning engine or saves.
// All damage, energy and card numbers are temporary playtest values.
export const CARDS = Object.freeze({
  bolt:    { name: "魔弾", cost: 1, kind: "spell", description: "魔法6ダメージ。", damage: 6, damageType: "magic" },
  frost:   { name: "氷の矢", cost: 1, kind: "spell", description: "氷の弱体3。次の敵の攻撃行動の合計威力を3下げる。", weaken: 3 },
  poison:  { name: "毒の印", cost: 1, kind: "spell", description: "毒を2蓄積。敵の攻撃行動後に一度だけ発動し、減らない。", poison: 2 },
  strike:  { name: "踏み込み", cost: 0, kind: "pureWeapon", description: "物理4。純物理武器を連続使用した2枚目以降は+2。", damage: 4, damageType: "physical" },
  lunge:   { name: "追い刃", cost: 1, kind: "pureWeapon", description: "物理7。純物理武器の連続使用で+2。", damage: 7, damageType: "physical" },
  guard:   { name: "守り", cost: 1, kind: "guard", description: "防御5。このターンだけ有効。", guard: 5 },
  mirror:  { name: "鏡の結界", cost: 1, kind: "mirror", description: "鏡術防御6。次の敵の攻撃まで持続し、実防御を等倍反射。", mirrorGuard: 6 },
  heal:    { name: "聖癒", cost: 1, kind: "spell", description: "HPを5回復。", heal: 5 },
  burst:   { name: "破滅の魔弾", cost: 2, kind: "spell", description: "全防御と鏡術待機を捨て、魔法15ダメージ。", damage: 15, damageType: "magic", sacrificesGuard: true },
  wolf:    { name: "魔狼召喚", cost: 1, kind: "summon", description: "魔狼を召喚。各ターン最初の攻撃に+3。維持中魔力上限-1。", beast: "wolf" },
  stone:   { name: "石のゴーレム召喚", cost: 1, kind: "summon", description: "守りを使うと各ターン最初の1回だけ防御+4。維持中魔力上限-1。", beast: "stone" },
  sacrifice:{ name: "生贄の儀", cost: 1, kind: "sacrifice", description: "魔獣が必要。魔狼なら物理12、ゴーレムなら防御10。", beastCost: true }
});
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
  const intents = options.intents || INTENTS;
  const enemy = { ...ENEMY, ...(options.enemy || {}) };
  if (!deck.length || deck.some(id => !CARDS[id])) throw new Error("Invalid pilot deck");
  if (!intents.length || intents.some(i => !["attack","rest"].includes(i.kind))) throw new Error("Invalid pilot intents");
  const s = {
    turn: 1, hp: options.hp ?? 30, maxHp: options.hp ?? 30, enemyHp: enemy.maxHp,
    energy: 3, guard: 0, mirrorGuard: 0, mirrorReady: false,
    weaken: 0, poison: 0, beast: null, beastReacted: false,
    usedSpell: false, weaponStreak: 0, phase: "battle",
    hand: [], draw: [...deck], discard: [], log: ["効果だけの試作です。数値は仮設定。"]
  };
  function maxEnergy() { return s.beast ? 4 : 5; }
  function intent() { return intents[(s.turn - 1) % intents.length]; }
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
    const resist = type === "physical" ? enemy.physicalResist : type === "magic" ? enemy.magicResist : 0;
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
    if (c.sacrificesGuard) { s.guard = 0; s.mirrorGuard = 0; s.mirrorReady = false; }
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
      const heal = Math.min(enemy.maxHp - s.enemyHp, action.heal || 0);
      s.enemyHp += heal;
      s.log.unshift("敵は" + action.label + "。鏡術防御・氷の弱体・毒は維持。");
    } else {
      const total = Math.max(0, action.hits * action.perHit - s.weaken);
      const normalUsed = Math.min(s.guard, total);
      const mirrorUsed = Math.min(s.mirrorGuard, total - normalUsed);
      const blocked = normalUsed + mirrorUsed;
      const damage = total - blocked;
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
    s.guard = 0; // Ordinary guard expires each turn; mirror guard survives only nonattacks.
    s.discard.push(...s.hand.splice(0));
    if (s.phase === "battle") {
      s.turn++;
      s.energy = Math.min(maxEnergy(), s.energy + 3); // Carry energy forward; active beast lowers the cap.
      s.beastReacted = false;
      s.usedSpell = false;
      s.weaponStreak = 0;
      refill();
    } else {
      s.mirrorGuard = 0; s.mirrorReady = false;
    }
    s.log = s.log.slice(0, 8);
    return true;
  }
  refill();
  return {
    snapshot: () => copy({ ...s, enemy: { ...enemy }, nextIntent: { ...intent() }, maxEnergy: maxEnergy() }),
    card: id => CARDS[id] ? { ...CARDS[id], id } : null,
    canPlay, play, endTurn
  };
}
