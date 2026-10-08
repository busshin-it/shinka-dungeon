/* Astral Planning mode. Independent engine/save format; stable V4 is unchanged. */
(() => {
  const CARDS = Object.freeze({
    basicStrike: { name: '小さな魔弾', cost: 0, damage: 3, family: 'basic', art: 'dark', starterOnly: true },
    basicWard: { name: '薄い守り', cost: 0, block: 3, family: 'basic', art: 'guard', starterOnly: true },
    ice: { name: '氷の矢', cost: 1, damage: 6, weaken: 2, family: 'ice', art: 'ice' },
    guard: { name: '光壁', cost: 1, block: 8, family: 'guard', art: 'guard' },
    bolt: { name: '雷撃', cost: 2, damage: 14, family: 'thunder', art: 'bolt' },
    dark: { name: '闇弾', cost: 1, damage: 5, draw: 1, family: 'dark', art: 'dark' },
    focus: { name: '集中', cost: 0, focus: 4, family: 'focus', art: 'focus' },
    frostNova: { name: '霜の輪', cost: 1, damage: 4, weaken: 4, family: 'ice', art: 'frostNova' },
    mirror: { name: '鏡の結界', cost: 1, block: 5, reflect: 3, family: 'guard', art: 'manaBarrier' },
    chain: { name: '連鎖雷', cost: 1, damage: 7, combo: 5, family: 'thunder', art: 'chainBolt' },
    renew: { name: '星の護り', cost: 1, block: 5, draw: 1, family: 'guard', art: 'manaBarrier' },
    meditate: { name: 'ひらめき', cost: 0, draw: 2, exhaust: true, family: 'focus', art: 'manaBurst' },
    iceSpear: { name: '氷晶槍', cost: 2, damage: 12, weaken: 3, family: 'ice', art: 'ice' },
    frostWard: { name: '霜の盾', cost: 1, block: 5, weaken: 2, family: 'ice', art: 'frostNova' },
    shatter: { name: '砕氷', cost: 1, damage: 5, weakBonus: 8, consumeWeak: true, family: 'ice', art: 'shatter' },
    winter: { name: '冬の結界', cost: 2, block: 10, weaken: 3, exhaust: true, family: 'ice', art: 'manaBarrier' },
    spark: { name: '火花', cost: 0, damage: 2, emptyBonus: 4, family: 'thunder', art: 'bolt' },
    charge: { name: '蓄電', cost: 0, energy: 1, exhaust: true, family: 'thunder', art: 'charge' },
    thunderCrash: { name: '轟雷', cost: 2, damage: 8, combo: 8, family: 'thunder', art: 'chainBolt' },
    surge: { name: '雷の奔流', cost: 2, damage: 9, draw: 2, family: 'thunder', art: 'chainBolt' },
    reflectShield: { name: '反照の盾', cost: 1, block: 3, reflect: 6, exhaust: true, family: 'guard', art: 'manaBarrier' },
    shieldStrike: { name: '鏡撃', cost: 1, damage: 3, blockDamage: 12, consumeBlock: true, family: 'guard', art: 'shieldStrike' },
    drain: { name: '吸光', cost: 1, damage: 6, heal: 3, exhaust: true, family: 'dark', art: 'abyss' },
    light: { name: '小さな灯火', cost: 1, heal: 6, exhaust: true, family: 'focus', art: 'focus' },
    stillness: { name: '静心', cost: 1, block: 3, focus: 7, family: 'focus', art: 'manaBurst' },
    starWait: { name: '星待ち', cost: 1, block: 3, nextFocus: 8, family: 'focus', art: 'focus' },
    zenithBolt: { name: '天頂の雷', cost: 3, damage: 20, bankBonus: 6, family: 'thunder', art: 'bolt' },
    emberVeil: { name: '残火の帳', cost: 0, block: 2, prevEmptyBlock: 5, family: 'guard', art: 'manaBarrier' },
    fadingStar: { name: '燃え残る星', cost: 1, damage: 5, emptyNextBlock: 5, family: 'dark', art: 'manaBurst' },
    memoryArrow: { name: '追憶の矢', cost: 1, damage: 4, memoryCap: 6, family: 'dark', art: 'dark' },
    ashWard: { name: '灰の守り', cost: 1, block: 4, exhaustBlock: 4, exhaustReflect: 2, family: 'guard', art: 'manaBarrier' },
    frostPierce: { name: '霜穿ち', cost: 2, damage: 10, weakThreshold: 3, thresholdBonus: 7, family: 'ice', art: 'frostPierce' },
    chantWard: { name: '詠止の結界', cost: 1, block: 4, breakBlock: 6, breakDraw: 1, family: 'guard', art: 'chantWard' },
    starFerryWard: { name: '星舟の結界', cost: 1, block: 4, bankBlock: 6, family: 'guard', art: 'starFerryWard' },
    ebbArrow: { name: '潮引きの矢', cost: 1, damage: 5, emptyWeak: 3, family: 'dark', art: 'ebbArrow' },
    starRelay: { name: '星継ぎ', cost: 0, transferBlockCap: 10, family: 'focus', art: 'starRelay' },
    quietComet: { name: '凪の彗星', cost: 2, damage: 10, recoverBonus: 10, family: 'dark', art: 'quietComet' },
    mirrorLance: { name: '鏡頁の槍', cost: 1, damage: 4, reflectDamageMultiplier: 2, reflectDamageCap: 10, consumeReflect: true, family: 'guard', art: 'mirrorLance' },
    starBookmark: { name: '星の栞', cost: 0, block: 2, recycleAttack: true, exhaust: true, family: 'guard', art: 'starBookmark' },
    marginLight: { name: '余白の灯', cost: 0, nextFocus: 4, exhaust: true, family: 'focus', art: 'marginLight' },
    quietScript: { name: '休符の星', cost: 1, damage: 4, recoverBonus: 4, nextFocus: 3, family: 'dark', art: 'quietScript' },
    mirrorNote: { name: '鏡頁の一閃', cost: 1, damage: 4, reflect: 3, family: 'guard', art: 'mirrorNote' },
    returnPage: { name: '返しの頁', cost: 1, block: 4, recycleAttack: true, family: 'guard', art: 'returnPage' },
    starlitPin: { name: '星屑の瞬き', cost: 0, damage: 1, weaken: 1, exhaust: true, family: 'ice', art: 'starlitPin' },
    shutterWard: { name: '閉じる星環', cost: 1, block: 3, emptyNextBlock: 6, family: 'guard', art: 'shutterWard' },
    orbitEcho: { name: '星軌の追撃', cost: 2, damage: 9, memoryCap: 8, family: 'dark', art: 'orbitEcho' },
    tuningNote: { name: '調律の頁', cost: 1, nextFocus: 6, draw: 1, exhaust: true, family: 'focus', art: 'tuningNote' },
    frostRecall: { name: '氷写しの頁', cost: 1, weaken: 2, recycleAttack: true, family: 'ice', art: 'frostRecall' },
    bankedEcho: { name: '蓄光の残響', cost: 1, damage: 4, bankBonus: 6, nextFocus: 3, family: 'thunder', art: 'bankedEcho' },
    ashStudy: { name: '灰読み', cost: 0, draw: 1, exhaustBlock: 4, exhaustReflect: 2, exhaust: true, family: 'focus', art: 'ashStudy' },
    mirrorRelay: { name: '渡り鏡', cost: 0, transferBlockCap: 6, reflect: 2, exhaust: true, family: 'guard', art: 'mirrorRelay' },
    rimeMirror: { name: '霜鏡', cost: 1, weaken: 2, reflect: 2, family: 'ice', art: 'rimeMirror' },
    frostOmen: { name: '霜刻の予告', cost: 1, damage: 3, weakThreshold: 3, thresholdBonus: 5, nextFocus: 3, family: 'ice', art: 'frostOmen' },
    restitch: { name: '綴じ直し', cost: 1, recycleAttack: true, draw: 1, exhaust: true, family: 'focus', art: 'restitch' },
    frostCrossing: { name: '霜渡り', cost: 1, weaken: 2, emptyNextBlock: 5, family: 'ice', art: 'frostCrossing' },
    starFrostLetter: { name: '星霜の便り', cost: 1, weaken: 2, nextFocus: 4, family: 'ice', art: 'starFrostLetter' },
    stillMirror: { name: '静鏡', cost: 1, reflect: 4, nextFocus: 3, family: 'guard', art: 'stillMirror' },
    afterglowWard: { name: '余熱の結界', cost: 1, block: 3, reflect: 1, prevEmptyBlock: 5, family: 'guard', art: 'afterglowWard' },
    bankedStarBlade: { name: '蓄星の刃', cost: 2, damage: 8, bankBonus: 8, nextFocus: 2, family: 'thunder', art: 'bankedStarBlade' },
    rimeThaw: { name: '霜解き', cost: 1, block: 6, weakBlockMultiplier: 2, weakBlockCap: 6, consumeWeak: true, family: 'ice', art: 'rimeThaw' },
    bankedStance: { name: '星留めの構え', cost: 1, block: 2, bankBlock: 5, focus: 3, family: 'focus', art: 'bankedStance' },
    echo: { name: '返照', cost: 0, reflect: 2, exhaust: true, family: 'guard', art: 'manaBarrier' }
  });
  function card(id, state) {
    if (typeof id !== 'string') return null;
    const base = id.endsWith('+') ? id.slice(0, -1) : id;
    if (!Object.hasOwn(CARDS, base)) return null;
    const c = { ...CARDS[base], id, base, isAttack: Object.hasOwn(CARDS[base],'damage'), upgraded: id.endsWith('+') };
    if (c.starterOnly && state?.ruleset === STARTER_COST_RULESET) c.cost = 1;
    if (c.upgraded) {
      c.name += '＋';
      if (c.isAttack) c.damage += c.base === 'basicStrike' ? 2 : c.cost === 0 ? 1 : 3;
      if (c.block) c.block += ['basicWard','emberVeil'].includes(c.base) ? 2 : 3;
      if (c.nextFocus) c.nextFocus += 2;
      if (c.transferBlockCap) c.transferBlockCap += 4;
      if (c.weaken) c.weaken++;
      if (c.emptyWeak) c.emptyWeak++;
      if (c.reflect) c.reflect++;
      if (c.focus) c.focus += 2;
      if (c.heal) c.heal += 2;
      if (c.energy) c.energy++;
      if (c.exhaust && c.draw) c.draw++;
    }
    c.text = [c.isAttack && `${c.damage}ダメージ`, c.combo && `このターン2枚目以降の攻撃なら＋${c.combo}`,
      c.block && `${c.block}ブロック`, c.weaken && `次の敵の攻撃行動の各打撃 −${c.weaken}`,
      c.focus && `このターン、次の攻撃＋${c.focus}`, c.reflect && `打撃ごとに${c.reflect}反射`,
      c.transferBlockCap && `今のブロックをすべて失う。失った量だけ次ターンにブロック（最大${c.transferBlockCap}）`,
      c.recoverBonus && `敵の今の行動が攻撃なしなら追加${c.recoverBonus}`,
      c.reflectDamageCap && `反射の${c.reflectDamageMultiplier}倍を追加（最大${c.reflectDamageCap}）。反射をすべて消費`,
      c.recycleAttack && '捨て札のいちばん新しい攻撃札1枚を山札の一番上へ戻す',
      c.weakBonus && `敵に弱体があれば＋${c.weakBonus}。その弱体をすべて消費`,
      c.weakBlockCap && `敵の弱体の${c.weakBlockMultiplier}倍を追加ブロック（最大${c.weakBlockCap}）。弱体をすべて消費`,
      c.weakThreshold && `敵の弱体が${c.weakThreshold}以上なら＋${c.thresholdBonus}。弱体は消費しない`,
      c.breakBlock && `このターン、すでに詠唱を崩していれば追加${c.breakBlock}ブロック${c.breakDraw?`、さらに${c.breakDraw}枚引く`:""}`,
      c.bankBlock && `支払い直後に魔力2以上なら追加${c.bankBlock}ブロック`,
      c.emptyWeak && `支払い直後に魔力0なら弱体${c.emptyWeak}（次の敵の各打撃を軽減）`,
      c.emptyBonus && `魔力0で使うと＋${c.emptyBonus}`,
      c.bankBonus && `使用前の魔力4以上なら＋${c.bankBonus}`,
      c.memoryCap && `前ターン最後の手札攻撃の実ダメージ半分を追加（切捨て、最大${c.memoryCap}）`,
      c.exhaustBlock && `このターン先に消滅カードを使っていれば追加${c.exhaustBlock}ブロック・反射${c.exhaustReflect}`,
      c.prevEmptyBlock && `前ターンを魔力0で終えていれば追加${c.prevEmptyBlock}ブロック`,
      c.nextFocus && `次の自分のターンだけ、最初の攻撃＋${c.nextFocus}`,
      c.emptyNextBlock && `支払い直後に魔力0なら、次の自分のターンに${c.emptyNextBlock}ブロック`,
      c.blockDamage && `今のブロック分を追加（最大${c.blockDamage}）。ブロックをすべて消費`,
      c.heal && `HPを${c.heal}回復`, c.energy && `魔力＋${c.energy}（上限5）`,
      c.draw && `${c.draw}枚引く`, c.exhaust && '消滅：この戦闘中は戻らない'].filter(Boolean).join('。') + '。';
    return c;
  }
  const ORIGINS = Object.freeze({
    frost: { name: '氷晶の護符', symbol: '❄', short: '氷で制する', effect: '毎ターン、最初の弱体を持つ氷カードの弱体＋1。',
      deck: ['ice','guard','focus','spark','shatter','fadingStar','starWait','charge','meditate','frostWard'] },
    storm: { name: '雷鳴の護符', symbol: 'ϟ', short: '雷で崩す', effect: '毎ターン、最初の魔力2の攻撃＋3。',
      deck: ['ice','guard','focus','spark','bolt','fadingStar','starWait','charge','meditate','chain'] },
    mirror: { name: '月鏡の護符', symbol: '◈', short: '鏡で返す', effect: '毎ターン、最初の防御カードで反射＋2。',
      deck: ['ice','guard','focus','spark','mirror','fadingStar','starWait','charge','meditate','shieldStrike'] }
  });
  const ENEMIES = Object.freeze({
    skeleton: { name: '蒼鎧の門番', hp: 48, art: 'skeleton', lesson: '溜めの間に攻め、次の強打に備えよう。', moves: [
      { type: 'attack', label: '剣のひと振り', power: 6, hits: 1 }, { type: 'recover', label: '剣を構える' }, { type: 'attack', label: '振り下ろし', power: 12, hits: 1 }] },
    wraith: { name: '鏡の亡霊', hp: 58, art: 'wraith', lesson: '弱体と反射は連撃の1発ごとに効く。', moves: [
      { type: 'attack', label: '水鏡の双刃', power: 5, hits: 2 }, { type: 'attack', label: '霊刃', power: 10, hits: 1 }] },
    stone: { name: '星塔の番兵', hp: 62, art: 'stone', lesson: '詠唱中に10ダメージ与えると、強打16→8。', moves: [
      { type: 'attack', label: '炉の強打', power: 16, hits: 1, threshold: 10, reduction: 8 }, { type: 'attack', label: '石の拳', power: 9, hits: 1 }, { type: 'recover', label: '炉を冷やす' }] },
    trial: { name: '守護者の幻影', hp: 70, art: 'moth', lesson: '第1章の試練。溜めの間に魔力を残し、強打を崩そう。', moves: [
      { type: 'attack', label: '星の双刃', power: 4, hits: 2 }, { type: 'attack', label: '試練の詠唱', power: 16, hits: 1, threshold: 12, reduction: 8 }, { type: 'recover', label: '幻影が揺らぐ' }] },
    bowWatcher: { name: '星弓の番人', hp: 76, art: 'bowWatcher', lesson: '一撃12以上で詠唱18→8。小さな攻撃の合計では崩れない。防御や弱体も通る。', moves: [
      { type: 'recover', label: '弓を引き絞る' }, { type: 'attack', label: '星を射る詠唱', power: 18, hits: 1, singleThreshold: 12, reduction: 10 }, { type: 'attack', label: '弦の返し', power: 9, hits: 1 }] },
    bellSpirit: { name: '鈴鏡の精', hp: 76, art: 'bellSpirit', lesson: '詠唱中は手札の攻撃1枚ごとに威力−2。3枚で12→6。反射は枚数に数えない。', moves: [
      { type: 'attack', label: '三つ鈴の詠唱', power: 12, hits: 1, attackCountThreshold: 3, stepReduction: 2, reduction: 6 }, { type: 'recover', label: '鈴を整える', heal: 4 }, { type: 'attack', label: '鏡の振り子', power: 10, hits: 1 }] },
    starDial: { name: '星儀の調律者', hp: 74, art: 'starDial', lesson: '三連撃は攻撃札1枚ごとに各打撃−1（3枚まで）。次の強打は一撃12で18→8。弱体・反射・防御も有効。', moves: [
      { type: 'recover', label: '星儀を合わせる' }, { type: 'attack', label: '三連星の詠唱', power: 4, hits: 3, attackCountThreshold: 3, stepReduction: 1, reduction: 3 }, { type: 'attack', label: '星軸の詠唱', power: 18, hits: 1, singleThreshold: 12, reduction: 10 }] },
    archive: { name: '書庫の観測者', hp: 68, art: 'wraith', lesson: '三連撃と一撃が交互。手札を増やしても使い切る必要はない。', moves: [
      { type: 'attack', label: '星屑の三連撃', power: 4, hits: 3 }, { type: 'attack', label: '頁の刃', power: 14, hits: 1 }, { type: 'recover', label: '頁をめくる' }] },
    wind: { name: '嵐をまとう甲冑', hp: 76, art: 'skeleton', lesson: '重い連撃と詠唱。魔力を残すか、使い切って火花につなぐか。', moves: [
      { type: 'attack', label: '嵐の双刃', power: 7, hits: 2 }, { type: 'attack', label: '雷雲の詠唱', power: 20, hits: 1, threshold: 14, reduction: 12 }, { type: 'recover', label: '風が止む' }] },
    tideStarSentinel: { name: '潮星の番人', hp: 72, art: 'tideStarSentinel', lesson: '引き潮は魔力2以上、満ち潮は魔力0で軽減。敵が動く直前の魔力で決まる。', moves: [
      { type: 'recover', label: '星の潮を読む' }, { type: 'attack', label: '引き潮', power: 14, hits: 1, manaCondition: 'bank', manaReduction: 8 }, { type: 'attack', label: '満ち潮', power: 16, hits: 1, manaCondition: 'empty', manaReduction: 8 }] },
    elite: { name: '鏡像の双衛', hp: 82, art: 'wraith', lesson: '連撃を守り、回復の前に押し切る。魔力を貯めた一撃も有効。', moves: [
      { type: 'attack', label: '鏡の三連撃', power: 4, hits: 3 }, { type: 'attack', label: '鏡像の一閃', power: 16, hits: 1, threshold: 13, reduction: 10 }, { type: 'recover', label: '鏡を繕う', heal: 4 }] },
    moth: { name: '星環の守護者', hp: 112, art: 'moth', lesson: '最終戦。三連撃と詠唱強打。14ダメージで強打21→9。', moves: [
      { type: 'attack', label: '星刃の三連撃', power: 5, hits: 3 }, { type: 'attack', label: '星環の詠唱', power: 21, hits: 1, threshold: 14, reduction: 12 }, { type: 'recover', label: '星を集める', heal: 6 }] }
  });
  // Saved rulesets pin their economy; fresh version-5 runs use paid starters.
  const GROWTH_RULESET = 'growth-v1';
  const STARTER_COST_RULESET = 'growth-v2';
  const isGrowthRun = state => [GROWTH_RULESET, STARTER_COST_RULESET].includes(state?.ruleset);
  const manaRegenFor = state => state?.ruleset === STARTER_COST_RULESET ? 3 : 1;
  // New growth rewards only: preserve every classic reward pool and its RNG calls.
  const GROWTH_REWARD_ONLY = Object.freeze(['frostRecall','bankedEcho','ashStudy','mirrorRelay']);
  // These cards enter only the current paid-starter ruleset, never legacy rewards.
  const CURRENT_REWARD_ONLY = Object.freeze(['rimeMirror','frostOmen','restitch','frostCrossing','starFrostLetter','stillMirror','afterglowWard','bankedStarBlade','rimeThaw','bankedStance']);
  const BASIC_STARTER = Object.freeze(['basicStrike','basicWard','basicStrike','basicWard','basicStrike','basicWard','basicStrike','basicWard','basicStrike','basicWard']);
  const GROWTH_ENEMIES = Object.freeze({ ...ENEMIES,
    skeleton: { ...ENEMIES.skeleton, hp: 15, moves: [
      { type: 'attack', label: '剣のひと振り', power: 4, hits: 1 }, { type: 'recover', label: '剣を構える' }, { type: 'attack', label: '振り下ろし', power: 8, hits: 1 }] },
    wraith: { ...ENEMIES.wraith, hp: 36, moves: [
      { type: 'attack', label: '水鏡の双刃', power: 3, hits: 2 }, { type: 'attack', label: '霊刃', power: 8, hits: 1 }] },
    stone: { ...ENEMIES.stone, hp: 38, lesson: '詠唱中に8ダメージ与えると、強打12→6。', moves: [
      { type: 'attack', label: '炉の強打', power: 12, hits: 1, threshold: 8, reduction: 6 }, { type: 'attack', label: '石の拳', power: 6, hits: 1 }, { type: 'recover', label: '炉を冷やす' }] },
    trial: { ...ENEMIES.trial, hp: 52, moves: [
      { type: 'attack', label: '星の双刃', power: 3, hits: 2 }, { type: 'attack', label: '試練の詠唱', power: 14, hits: 1, threshold: 10, reduction: 8 }, { type: 'recover', label: '幻影が揺らぐ' }] }
  });
  // New encounters are pinned in chapter2Options at run creation. Restoring a saved
  // growth-v2 journey never replaces its options, current enemy, HP or history.
  const CURRENT_ENEMIES = Object.freeze({ ...GROWTH_ENEMIES,
    starScaleGuard: { name: '星秤の衛兵', hp: 70, art: 'starDial', lesson: '秤の刃は敵行動直前の魔力2以上で12→6。次の詠唱はこのターン合計12ダメージで18→8。弱体・防御も有効。', moves: [
      { type: 'recover', label: '星秤を合わせる' }, { type: 'attack', label: '秤の刃', power: 12, hits: 1, manaCondition: 'bank', manaReduction: 6 }, { type: 'attack', label: '重星の詠唱', power: 18, hits: 1, threshold: 12, reduction: 10 }] }
  });
  const enemiesFor = state => state?.ruleset === STARTER_COST_RULESET ? CURRENT_ENEMIES : isGrowthRun(state) ? GROWTH_ENEMIES : ENEMIES;
  const FIRST_REWARD_POOLS = Object.freeze([
    ['ice','bolt','dark','quietComet'],
    ['chain','shieldStrike','focus','starWait'],
    ['guard','frostWard','mirror','renew'],
    ['meditate','charge','light','starBookmark','spark','frostNova']
  ]);
  const RELICS = Object.freeze({
    emberCore: { name: '残火の芯', symbol: '✦', effect: '各戦闘1回。魔力0でターンを終えると、次ターンに4ブロック。' },
    starBottle: { name: '星砂の小瓶', symbol: '✧', effect: '各戦闘1回。自然回復後の魔力が4以上なら、そのターン最初の攻撃＋5。' }
  });
  function breakRule(m) { return m.singleThreshold ? {kind:'single',threshold:m.singleThreshold} : m.attackCountThreshold ? {kind:'count',threshold:m.attackCountThreshold} : m.threshold ? {kind:'total',threshold:m.threshold} : {kind:null,threshold:0}; }
  function manaRuleText(m) { return m.manaCondition ? `魔力${m.manaCondition === 'bank' ? '2以上' : '0'}で${m.power}→${m.power-m.manaReduction}` : ''; }
  function describeMove(m) {
    if(m.type==='recover')return `${m.label}${m.heal?`（最大${m.heal}回復）`:'（攻撃なし）'}`;
    const r=breakRule(m),condition=m.manaCondition?manaRuleText(m):r.kind==='single'?`一撃${r.threshold}で${m.power-m.reduction}`:r.kind==='count'?`攻撃札${r.threshold}枚で${m.power-m.reduction}`:r.kind==='total'?`合計${r.threshold}で${m.power-m.reduction}`:'';
    return `${m.label} ${m.power}${m.hits>1?`×${m.hits}`:''}${condition?`〔${condition}${m.hits>1?`×${m.hits}`:''}〕`:''}`;
  }
  function enemyPattern(id, state) { return enemiesFor(state)[id]?.moves.map(describeMove).join(' → ') || ''; }
  const MAX_HP = 60;
  const MAX_ENERGY = 5;
  const RUN_LENGTH = 6;
  const REWARD_POOLS = Object.freeze({ frost: ['iceSpear','frostWard','shatter','winter','frostNova','frostPierce'], storm: ['spark','charge','thunderCrash','surge','chain'], mirror: ['reflectShield','shieldStrike','drain','echo','mirror'] });
  const seededRandom = seed => { let x = seed >>> 0; const next = () => ((x = Math.imul(x, 1664525) + 1013904223 >>> 0) / 4294967296); next.state = () => x; return next; };
  function resolveAttack(s, action) {
    let hp = s.hp, enemyHp = s.enemyHp, block = s.block, taken = 0, blocked = 0, reflected = 0, resolvedHits = 0;
    for (let i = 0; i < action.hits && hp > 0 && enemyHp > 0; i++) {
      const stop = Math.min(block, action.perHit), hurt = Math.min(hp, action.perHit - stop), back = Math.min(enemyHp, s.reflect);
      block -= stop; hp -= hurt; enemyHp -= back; taken += hurt; blocked += stop; reflected += back; resolvedHits++;
    }
    return { hp, enemyHp, taken, blocked, reflected, resolvedHits };
  }
  function createGame(random = Math.random, { ruleset = STARTER_COST_RULESET } = {}) {
    if (![GROWTH_RULESET,STARTER_COST_RULESET,'classic'].includes(ruleset)) throw new Error('Unknown run ruleset');
    let s, rng = random;
    const snapshot = () => JSON.parse(JSON.stringify(s));
    const isGrowth = () => isGrowthRun(s);
    const runCard = id => card(id, s);
    const starter = origin => isGrowth() ? BASIC_STARTER : ORIGINS[origin].deck;
    const enemy = () => enemiesFor(s)[s.enemyId];
    const moveAt = turn => enemy().moves[(turn - 1) % enemy().moves.length];
    const move = () => moveAt(s.turn);
    const note = text => { s.log = [text, ...s.log].slice(0, 5); };
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function draw(n) { while (n-- > 0) { if (!s.draw.length) s.draw = shuffle(s.discard.splice(0)); if (!s.draw.length) break; s.hand.push(s.draw.shift()); } }
    function reset() {
      s = { phase: 'intro', origin: 'frost', battle: 1, turn: 1, hp: MAX_HP, maxHp: MAX_HP, enemyId: 'skeleton', enemyHp: 48, enemyMaxHp: 48,
        energy: 2, maxEnergy: MAX_ENERGY, pendingFocus: 0, pendingBlock: 0, prevEndEmpty: false, turnLastAttack: 0, prevLastAttack: 0, usedExhaustThisTurn: false, relics: [], relicUsed: {emberCore:false,starBottle:false}, removalSource: null, block: 0, focus: 0, weaken: 0, reflect: 0, turnDamage: 0, spellCount: 0, interrupted: false, flags: {},
        deck: [...ORIGINS.frost.deck], hand: [], draw: [], discard: [], exhaust: [], route: null, route2: null, chapter2Options: {library:'starDial',wind:'bellSpirit'}, chapter2Encounter: null, forge: false, insight: false, sanctuary: null, camp: null,
        lastReward: null, lastUpgrade: null, pendingUpgrade: null, upgrades: [], removed: [], rewards: [], rewardOffers: [], history: [], wins: 0,
        stats: { played: {}, dealt: 0, taken: 0, healed: 0, energyGained: 0, blocked: 0, reflected: 0, interrupts: 0, relics: 0 },
        log: ['護符を選んで、蒼星の回廊へ。'] };
      if (isGrowthRun({ruleset})) { s.ruleset = ruleset; s.earlyRemoval = null; s.deck = [...BASIC_STARTER]; s.enemyHp = s.enemyMaxHp = GROWTH_ENEMIES.skeleton.hp; }
      if (ruleset === STARTER_COST_RULESET) s.chapter2Options.library = 'starScaleGuard';
      return snapshot();
    }
    function selectOrigin(id) { if (s.phase !== 'intro' || !Object.hasOwn(ORIGINS, id)) return false; s.origin = id; s.deck = [...starter(id)]; return true; }
    function prepare() {
      s.phase = 'battle'; s.turn = 1; s.energy = s.route2 === 'causeway' && s.battle >= 4 ? 3 : 2; s.block = s.focus = s.weaken = s.reflect = s.turnDamage = s.spellCount = 0; s.flags = {}; s.interrupted = false; s.pendingFocus = s.pendingBlock = 0; s.prevEndEmpty = false; s.turnLastAttack = s.prevLastAttack = 0; s.usedExhaustThisTurn = false; s.relicUsed = {emberCore:false,starBottle:false}; s.removalSource = null;
      s.enemyId = s.battle === 1 ? 'skeleton' : s.battle === 2 ? (s.route === 'moon' ? 'wraith' : 'stone') : s.battle === 3 ? 'trial' : s.battle === 4 ? s.chapter2Encounter : s.battle === 5 ? 'elite' : 'moth';
      if (isGrowth() && s.battle === 3) s.sanctuary = null;
      s.enemyMaxHp = s.enemyHp = enemy().hp;
      s.rewardOffers = [];
      s.hand = []; s.discard = []; s.exhaust = []; s.draw = shuffle([...s.deck]);
      const opening = s.battle === 1 ? starter(s.origin).slice(0, 5) : [s.lastReward, s.pendingUpgrade].filter(Boolean);
      for (const id of opening) { const index = s.draw.indexOf(id); if (index >= 0) { s.draw.splice(index, 1); s.hand.push(id); } }
      draw((s.insight ? 6 : 5) - s.hand.length); s.pendingUpgrade = null; note(enemy().lesson);
    }
    function start() { if (s.phase !== 'intro') return false; prepare(); return true; }
    function intent() {
      const m = move();
      if (m.type === 'recover') {
        const healing = Math.min(m.heal || 0, s.enemyMaxHp - s.enemyHp);
        return { type: 'recover', label: m.label, damage: 0, hpLoss: 0, heal: healing, detail: `攻撃しない。${healing ? `敵HPが${healing}回復。` : ''}` };
      }
      const rule = breakRule(m);
      const manaConditionMet = m.manaCondition === 'bank' ? s.energy >= 2 : m.manaCondition === 'empty' ? s.energy === 0 : false;
      const reduction = m.manaCondition ? (manaConditionMet ? m.manaReduction : 0) : rule.kind === 'count' ? Math.min(rule.threshold,s.spellCount)*m.stepReduction : s.interrupted ? m.reduction || 0 : 0;
      const perHit = Math.max(0, m.power - reduction - s.weaken);
      const a = { type: 'attack', label: m.label, perHit, hits: m.hits, damage: perHit * m.hits };
      const result = resolveAttack(s, a);
      const progress = rule.kind === 'count' ? Math.min(rule.threshold,s.spellCount) : rule.kind === 'single' ? (s.interrupted?rule.threshold:0) : Math.min(rule.threshold,s.turnDamage);
      const extra = rule.threshold ? { threshold:rule.threshold,progress,remaining:Math.max(0,rule.threshold-progress),broken:s.interrupted,breakKind:rule.kind } : {};
      const tip = m.manaCondition ? `${manaRuleText(m)}。敵行動直前に判定。${manaConditionMet ? '現在は条件成立。' : ''}` : !rule.threshold ? '' : rule.kind==='count' ? `攻撃札${progress}/${rule.threshold}。基本威力${m.power}→${m.power-reduction}${m.hits>1?'（各打撃）':''}。${s.interrupted?'最大軽減。':`あと${rule.threshold-progress}枚で最大軽減。`}` : s.interrupted ? `詠唱崩し成功。基本威力${m.power}→${m.power-m.reduction}。` : rule.kind==='single' ? `一撃${rule.threshold}以上で威力−${m.reduction}。合計では不可。` : `あと${extra.remaining}ダメージで威力−${m.reduction}。`;
      return { ...a, ...extra, ...(m.manaCondition ? {manaCondition:m.manaCondition,manaConditionMet} : {}), hpLoss: result.taken, reflected: result.reflected, resolvedHits: result.resolvedHits,
        detail: `今の守りで HP −${result.taken}。${result.reflected ? `反射${result.reflected}。` : ''}${tip}${result.resolvedHits < m.hits && result.enemyHp === 0 && result.hp > 0 ? '反射で残りの打撃を止める。' : ''}` };
    }
    // Future entries are base actions, not predicted HP loss. No current guard/weakness is projected.
    function futureIntents(count = 2) {
      if (s.phase !== 'battle') return [];
      return Array.from({length: Math.max(0,Math.min(2,Number.isInteger(count)?count:2))},(_,i)=>{
        const turn=s.turn+i+1,m=moveAt(turn),rule=breakRule(m);
        return {turn,type:m.type,label:m.label,power:m.power||0,hits:m.hits||0,heal:m.heal||0,
          threshold:rule.threshold,breakKind:rule.kind,reduction:m.reduction||0,stepReduction:m.stepReduction||0,conditional:true, ...(m.manaCondition ? {manaCondition:m.manaCondition,manaReduction:m.manaReduction} : {}),
          detail:`${describeMove(m)}。基本値で、弱体や各条件により変化。`};
      });
    }
    function latestDiscardAttackIndex() {
      for (let i = s.discard.length - 1; i >= 0; i--) if (runCard(s.discard[i]).isAttack) return i;
      return -1;
    }
    function previewCard(index) {
      const c = runCard(s.hand[index] || ''); if (!c) return null;
      const charm = c.isAttack && s.origin === 'storm' && c.cost === 2 && !s.flags.storm ? 3 : 0;
      const forge = c.isAttack && s.forge && !s.flags.forge ? 2 : 0;
      const recoverCondition = Boolean(c.recoverBonus && move().type === 'recover');
      const actualReflectDamage = c.reflectDamageCap ? Math.min(c.reflectDamageCap, s.reflect * c.reflectDamageMultiplier) : 0;
      const recycleIndex = c.recycleAttack ? latestDiscardAttackIndex() : -1;
      const recycleTargetId = recycleIndex >= 0 ? s.discard[recycleIndex] : null;
      return { ...c, recoverCondition, actualReflectDamage,
        ...(c.weakBlockCap ? {actualConsumedWeak:s.weaken,actualWeakBlockBonus:Math.min(c.weakBlockCap,s.weaken*c.weakBlockMultiplier)} : {}),
        actualTransferredBlock: c.transferBlockCap ? Math.min(c.transferBlockCap, s.block) : 0,
        actualConsumedBlock: c.transferBlockCap || c.consumeBlock ? s.block : 0,
        actualConsumedReflect: c.consumeReflect ? s.reflect : 0,
        recycleTargetId, recycleTargetName: recycleTargetId ? runCard(recycleTargetId).name : '',
        actualDamage: c.isAttack ? c.damage + s.focus + (recoverCondition ? c.recoverBonus : 0) + actualReflectDamage + (c.combo && s.spellCount > 0 ? c.combo : 0) + (c.weakBonus && s.weaken > 0 ? c.weakBonus : 0) + (c.emptyBonus && s.energy === 0 ? c.emptyBonus : 0) + (c.bankBonus && s.energy >= 4 ? c.bankBonus : 0) + (c.memoryCap ? Math.min(c.memoryCap,Math.floor(s.prevLastAttack/2)) : 0) + (c.weakThreshold && s.weaken >= c.weakThreshold ? c.thresholdBonus : 0) + Math.min(c.blockDamage || 0, s.block) + charm + forge : 0,
        actualBlock: (c.block || 0) + (c.weakBlockCap ? Math.min(c.weakBlockCap,s.weaken*c.weakBlockMultiplier) : 0) + (c.prevEmptyBlock && s.prevEndEmpty ? c.prevEmptyBlock : 0) + (c.exhaustBlock && s.usedExhaustThisTurn ? c.exhaustBlock : 0) + (c.breakBlock && s.interrupted ? c.breakBlock : 0) + (c.bankBlock && s.energy - c.cost >= 2 ? c.bankBlock : 0),
        bankBlockCondition: Boolean(c.bankBlock && s.energy - c.cost >= 2), emptyWeakCondition: Boolean(c.emptyWeak && s.energy === c.cost),
        weakThresholdCondition: Boolean(c.weakThreshold && s.weaken >= c.weakThreshold), breakCondition: Boolean(c.breakBlock && s.interrupted),
        actualDraw: (c.draw || 0) + (c.breakDraw && s.interrupted ? c.breakDraw : 0),
        actualMemory: c.memoryCap ? Math.min(c.memoryCap,Math.floor(s.prevLastAttack/2)) : 0, exhaustCondition: Boolean(c.exhaustBlock && s.usedExhaustThisTurn),
        actualNextFocus: c.nextFocus || 0, actualNextBlock: (c.emptyNextBlock && s.energy === c.cost ? c.emptyNextBlock : 0) + (c.transferBlockCap ? Math.min(c.transferBlockCap, s.block) : 0),
        actualWeak: c.emptyWeak ? (s.energy === c.cost ? c.emptyWeak : 0) : c.weaken ? c.weaken + (s.origin === 'frost' && c.family === 'ice' && !s.flags.frost ? 1 : 0) : 0,
        actualReflect: (c.reflect || 0) + (c.exhaustReflect && s.usedExhaustThisTurn ? c.exhaustReflect : 0) + (c.block && s.origin === 'mirror' && !s.flags.mirror ? 2 : 0),
        actualHeal: Math.min(c.heal || 0, s.maxHp - s.hp), actualEnergy: Math.min(c.energy || 0, MAX_ENERGY - s.energy + c.cost) };
    }
    function finish() {
      if (s.phase !== 'battle') return;
      if (s.hp <= 0) { s.phase = 'defeat'; note('灯りが消えた。同じ山札で別の選択を試そう。'); }
      else if (s.enemyHp <= 0) { s.phase = 'victory'; s.wins++; note(`${enemy().name}を越えた。`); }
      if (s.phase !== 'battle') { s.pendingFocus = s.pendingBlock = 0; s.prevEndEmpty = false; s.turnLastAttack = s.prevLastAttack = 0; s.usedExhaustThisTurn = false; s.turnDamage = s.spellCount = 0; s.interrupted = false; s.history.push({ enemy: enemy().name, battle: s.battle, turns: s.turn, hp: s.hp, result: s.phase }); }
    }
    function play(index) {
      if (s.phase !== 'battle' || !Number.isInteger(index)) return false;
      const c = previewCard(index); if (!c || c.cost > s.energy) return false;
      s.energy -= c.cost; s.hand.splice(index, 1); s.stats.played[c.base] = (s.stats.played[c.base] || 0) + 1;
      let damage = 0;
      if (c.isAttack) {
        damage = Math.min(s.enemyHp, c.actualDamage); s.turnLastAttack = damage; s.enemyHp -= damage; s.turnDamage += damage; s.stats.dealt += damage; s.focus = 0; s.spellCount++;
        if (s.origin === 'storm' && c.cost === 2 && !s.flags.storm) { s.flags.storm = true; s.stats.relics++; }
        if (s.forge && !s.flags.forge) s.flags.forge = true;
      }
      if (s.origin === 'frost' && c.weaken && !s.flags.frost) { s.flags.frost = true; s.stats.relics++; }
      if (s.origin === 'mirror' && c.block && !s.flags.mirror) { s.flags.mirror = true; s.stats.relics++; }
      if (c.consumeWeak) s.weaken = 0;
      if (c.consumeBlock || c.transferBlockCap) s.block = 0;
      if (c.consumeReflect) s.reflect = 0;
      s.block += c.actualBlock; s.focus += c.focus || 0; s.pendingFocus += c.actualNextFocus; s.pendingBlock += c.actualNextBlock; s.weaken = Math.max(s.weaken, c.actualWeak); s.reflect += c.actualReflect;
      s.hp += c.actualHeal; s.stats.healed += c.actualHeal;
      s.energy = Math.min(MAX_ENERGY, s.energy + (c.energy || 0)); s.stats.energyGained += c.actualEnergy;
      if (c.recycleAttack) {
        const targetIndex = latestDiscardAttackIndex();
        if (targetIndex >= 0) s.draw.unshift(s.discard.splice(targetIndex, 1)[0]);
      }
      if (c.actualDraw && s.enemyHp > 0) draw(c.actualDraw);
      (c.exhaust ? s.exhaust : s.discard).push(c.id); if (c.exhaust) s.usedExhaustThisTurn = true;
      note(`${c.name}：${damage ? `${damage}ダメージ。` : ''}${c.actualBlock ? `${c.actualBlock}ブロック。` : ''}${c.actualNextFocus ? `次ターン攻撃＋${c.actualNextFocus}を予約。` : ''}${c.actualNextBlock ? `次ターン防御${c.actualNextBlock}を予約。` : ''}${c.actualWeak ? `各打撃−${c.actualWeak}。` : ''}${c.focus ? `次の攻撃＋${c.focus}。` : ''}${c.actualReflect ? `反射＋${c.actualReflect}。` : ''}${c.heal ? `HP＋${c.actualHeal}。` : ''}${c.energy ? `魔力＋${c.actualEnergy}。` : ''}${c.consumeWeak ? '弱体を消費。' : ''}${c.consumeBlock ? 'ブロックを消費。' : c.transferBlockCap ? 'ブロックをすべて消費。' : ''}${c.consumeReflect ? '反射をすべて消費。' : ''}${c.recycleAttack ? (c.recycleTargetId ? `${c.recycleTargetName}を山札の一番上へ。` : '捨て札に戻せる攻撃札なし。') : ''}${c.actualDraw && s.enemyHp > 0 ? `${c.actualDraw}枚引く。` : ''}${c.exhaust ? '消滅。' : ''}`);
      if (!s.interrupted && s.enemyHp > 0 && ((move().threshold && s.turnDamage >= move().threshold) || (move().singleThreshold && damage >= move().singleThreshold) || (move().attackCountThreshold && s.spellCount >= move().attackCountThreshold))) { s.interrupted = true; s.stats.interrupts++; note(`詠唱を崩した！ 残る攻撃にも備えよう。`); }
      finish(); return true;
    }
    function endTurn() {
      if (s.phase !== 'battle') return false;
      const a = intent(), endedEmpty = s.energy === 0;
      if (a.type === 'attack') {
        const r = resolveAttack(s, a); s.hp = r.hp; s.enemyHp = r.enemyHp; s.stats.taken += r.taken; s.stats.blocked += r.blocked;
        s.stats.reflected += r.reflected; s.stats.dealt += r.reflected; s.weaken = 0;
        note(`${a.label}${a.hits > 1 ? ` ${r.resolvedHits}回` : ''}。${r.blocked}防ぎ、HP −${r.taken}${r.reflected ? `。反射 ${r.reflected}` : ''}。`);
      } else { s.enemyHp += a.heal; note(a.detail); }
      s.discard.push(...s.hand.splice(0)); s.block = s.focus = s.reflect = 0; finish();
      if (s.phase === 'battle') {
        s.prevEndEmpty = endedEmpty; s.prevLastAttack = s.turnLastAttack; s.turnLastAttack = 0; s.usedExhaustThisTurn = false;
        if (s.relics.includes('emberCore') && !s.relicUsed.emberCore && endedEmpty) { s.pendingBlock += 4; s.relicUsed.emberCore = true; s.stats.relics++; }
        s.turn++; s.energy = Math.min(MAX_ENERGY, s.energy + manaRegenFor(s));
        s.turnDamage = s.spellCount = 0; s.flags = {}; s.interrupted = false;
        s.block = s.pendingBlock; s.focus = s.pendingFocus; s.pendingBlock = s.pendingFocus = 0;
        if (s.relics.includes('starBottle') && !s.relicUsed.starBottle && s.energy >= 4) { s.focus += 5; s.relicUsed.starBottle = true; s.stats.relics++; }
        draw(5);
      }
      return true;
    }
    function rewardOptions() { return [...s.rewardOffers]; }
    function openReward() {
      if (s.phase !== 'victory') return false;
      s.phase = s.battle === RUN_LENGTH ? 'complete' : 'reward';
      if (s.phase === 'reward' && isGrowth()) {
        if (s.battle === 1) s.rewardOffers = FIRST_REWARD_POOLS.map(pool => shuffle([...pool])[0]);
        else s.rewardOffers = shuffle(Object.keys(CARDS).filter(id => !CARDS[id].starterOnly && (s.ruleset === STARTER_COST_RULESET || !CURRENT_REWARD_ONLY.includes(id)))).slice(0,4);
      } else if (s.phase === 'reward') {
        const offers = shuffle([...REWARD_POOLS[s.origin]]).slice(0,1);
        offers.push(shuffle(['light','stillness','renew','meditate','focus'].filter(id => !offers.includes(id)))[0]);
        while (offers.length < 4) offers.push(shuffle(Object.keys(CARDS).filter(id => !CARDS[id].starterOnly && !GROWTH_REWARD_ONLY.includes(id) && !CURRENT_REWARD_ONLY.includes(id) && !offers.includes(id) && (!['chantWard','starFerryWard','ebbArrow','starRelay','mirrorLance','marginLight','quietScript','mirrorNote','returnPage','starlitPin','shutterWard','orbitEcho','tuningNote'].includes(id) || s.battle >= 2)))[0]); s.rewardOffers = offers;
      }
      return true;
    }
    function chooseReward(id) {
      if (s.phase !== 'reward' || (id !== null && !rewardOptions().includes(id))) return false;
      if (id) { s.deck.push(id); s.rewards.push(id); } s.lastReward = id;
      s.hp = Math.min(s.maxHp, s.hp + 8);
      s.phase = s.battle === 1 ? 'route' : s.battle === 3 ? 'chapter' : s.battle === 5 ? 'camp' : 'sanctuary'; return true;
    }
    function chooseRoute(id) {
      if (s.phase !== 'route' || !['moon', 'forge'].includes(id) || (id === 'forge' && s.hp <= 6)) return false;
      s.route = id;
      if (id === 'moon') { s.hp = Math.min(s.maxHp, s.hp + 12); note('月の泉で12回復。水鏡の道へ。'); }
      else { s.hp -= 6; s.forge = true; note('HPを6払い、雷の針を得た。毎ターン最初の攻撃＋2。'); }
      s.phase = 'ready'; return true;
    }
    function upgradeOptions() { return [...new Set(s.deck)].filter(id => !id.endsWith('+')).sort((a, b) => s.deck.filter(x => x === b).length - s.deck.filter(x => x === a).length); }
    function chooseChapter(id) {
      if (s.phase !== 'chapter' || !['library','wind','causeway'].includes(id) || (id === 'causeway' && s.hp <= 4)) return false;
      s.route2 = id; s.chapter2Encounter = id === 'causeway' ? 'tideStarSentinel' : s.chapter2Options[id];
      if (id === 'library') { s.insight = true; note('星図を得た。以後、各戦闘の初手が6枚になる。'); }
      else if (id === 'causeway') { s.hp -= 4; note('HPを4払い、星渡りの回廊へ。以後、各戦闘の開始魔力が3になる。'); }
      else { s.maxHp += 6; s.hp = Math.min(s.maxHp, s.hp + 6); note('風の加護。最大HP＋6、HPを6回復。'); }
      s.phase = 'ready'; return true;
    }
    function chooseCamp(id) {
      if (s.phase !== 'camp' || !['rest','remove'].includes(id)) return false;
      if (id === 'rest') { s.hp = Math.min(s.maxHp,s.hp+16); s.camp = 'rest'; s.phase = 'ready'; }
      else { s.removalSource = 'camp'; s.phase = 'remove'; }
      return true;
    }
    function removeOptions() { return [...new Set(s.deck)]; }
    function removeCard(id) {
      if (s.phase !== 'remove' || !removeOptions().includes(id) || s.deck.length <= 5 || s.removed.length >= (isGrowth() ? 3 : 2)) return false;
      s.deck.splice(s.deck.indexOf(id),1); s.removed.push(id);
      if (s.lastReward === id && !s.deck.includes(id)) s.lastReward = null;
      if (isGrowth() && s.battle === 2) s.earlyRemoval = id;
      if (s.removalSource === 'sanctuary') s.sanctuary = 'remove'; else s.camp = 'remove';
      s.removalSource = null; s.phase = 'ready'; return true;
    }
    function cancelRemoval() { if (s.phase !== 'remove') return false; s.phase = s.removalSource === 'sanctuary' ? 'sanctuary' : 'camp'; s.removalSource = null; return true; }
    function chooseSanctuary(id) {
      if (s.phase !== 'sanctuary' || !['rest', 'evolve', 'relic', 'remove'].includes(id)) return false;
      if (id === 'relic') { if (isGrowth() || s.battle !== 2 || s.hp <= 6 || s.relics.length) return false; s.phase = 'astrolabe'; return true; }
      if (id === 'remove') { if ((s.battle !== 4 && !(isGrowth() && s.battle === 2)) || s.deck.length <= 5 || s.removed.length >= (isGrowth() ? 3 : 2)) return false; s.removalSource = 'sanctuary'; s.phase = 'remove'; return true; }
      if (id === 'rest') { s.hp = Math.min(s.maxHp, s.hp + 14); s.sanctuary = 'rest'; s.phase = 'ready'; note('灯りの間でHPを14回復した。'); }
      else s.phase = 'evolve';
      return true;
    }
    function chooseRelic(id) {
      if (s.phase !== 'astrolabe' || s.battle !== 2 || s.hp <= 6 || s.relics.length || !Object.hasOwn(RELICS,id)) return false;
      s.hp -= 6; s.relics.push(id); s.relicUsed[id] = false; s.sanctuary = 'relic'; s.phase = 'ready'; note(`HPを6払い、${RELICS[id].name}を得た。各戦闘1回の灯り。`); return true;
    }
    function cancelRelic() { if (s.phase !== 'astrolabe') return false; s.phase = 'sanctuary'; return true; }
    function evolve(id) {
      if (s.phase !== 'evolve' || !upgradeOptions().includes(id)) return false;
      const upgraded = id + '+'; s.deck[s.deck.indexOf(id)] = upgraded; s.lastUpgrade = upgraded; s.pendingUpgrade = upgraded; s.upgrades.push(upgraded); s.sanctuary = 'evolve'; s.phase = 'ready'; note(`${runCard(upgraded).name}へ進化。次の初手で試せる。`); return true;
    }
    function cancelEvolution() { if (s.phase !== 'evolve') return false; s.phase = 'sanctuary'; return true; }
    function nextBattle() { if (s.phase !== 'ready' || s.battle >= RUN_LENGTH) return false; s.battle++; prepare(); return true; }
    function exportSave() {
      if (typeof rng.state !== 'function') return null;
      return { format: 'astral-planning', version: s.ruleset === STARTER_COST_RULESET ? 5 : isGrowth() ? 4 : 3, rngState: rng.state(), state: snapshot() };
    }
    function restoreSave(save) {
      // Local saves are data, never executable state. Validate before changing the live game.
      try {
        if (save?.format === 'astral-planning' && [1,2].includes(save.version)) {
          const legacy = globalThis.ShinkaPlanningV2?.createGame();
          if (!legacy || !legacy.restoreSave(save)) return false;
          save = legacy.exportSave();
          const options = save.state.route2 ? {library:'archive',wind:'wind'} : {library:'bowWatcher',wind:'bellSpirit'};
          save = {...save,version:3,state:{...save.state,chapter2Options:options,chapter2Encounter:save.state.route2?options[save.state.route2]:null}};
        }
        if (!save || save.format !== 'astral-planning' || ![3,4,5].includes(save.version) || !Number.isInteger(save.rngState) || save.rngState < 0 || save.rngState > 4294967295) return false;
        const x = save.state, integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
        const record = v => v !== null && typeof v === 'object' && Object.prototype.toString.call(v) === '[object Object]';
        const growth = [4,5].includes(save.version);
        const savedRuleset = save.version === 5 ? STARTER_COST_RULESET : GROWTH_RULESET;
        if (!record(x) || (growth ? x.ruleset !== savedRuleset || !(x.earlyRemoval === null || (typeof x.earlyRemoval === 'string' && runCard(x.earlyRemoval))) : Object.hasOwn(x,'ruleset') || Object.hasOwn(x,'earlyRemoval'))) return false;
        const definitions = enemiesFor(x);
        const phases = ['intro','battle','victory','defeat','complete','reward','route','chapter','sanctuary','evolve','camp','remove','ready','astrolabe'];
        if (!record(x) || !phases.includes(x.phase) || !Object.hasOwn(ORIGINS,x.origin) || !Object.hasOwn(definitions,x.enemyId)) return false;
        if (!integer(x.battle,1,6) || !integer(x.turn,1,10000) || ![60,66].includes(x.maxHp) || !integer(x.hp,0,x.maxHp) || x.enemyMaxHp !== definitions[x.enemyId].hp || !integer(x.enemyHp,0,x.enemyMaxHp)) return false;
        if (x.maxEnergy !== 5 || !integer(x.energy,0,5) || !integer(x.wins,0,6)) return false;
        for (const k of ['block','focus','weaken','reflect','turnDamage','spellCount','pendingFocus','pendingBlock','turnLastAttack','prevLastAttack']) if (!integer(x[k],0,100000)) return false;
        for (const k of ['interrupted','forge','insight','prevEndEmpty','usedExhaustThisTurn']) if (typeof x[k] !== 'boolean') return false;
        for (const [k,allowed] of [['route',[null,'moon','forge']],['route2',[null,'library','wind','causeway']],['sanctuary',[null,'rest','evolve','relic','remove']],['camp',[null,'rest','remove']]]) if (!allowed.includes(x[k])) return false;
        for (const k of ['deck','hand','draw','discard','exhaust','upgrades','removed','rewards','rewardOffers']) if (!Array.isArray(x[k]) || x[k].length > 30 || x[k].some(id => typeof id !== 'string' || !runCard(id))) return false;
        if (x.deck.length < 5 || x.deck.length > 20 || x.rewardOffers.length > 4 || new Set(x.rewardOffers).size !== x.rewardOffers.length) return false;
        for (const k of ['lastReward','lastUpgrade','pendingUpgrade']) if (x[k] !== null && (typeof x[k] !== 'string' || !runCard(x[k]))) return false;
        if (!record(x.flags) || Object.values(x.flags).some(v => typeof v !== 'boolean') || Object.keys(x.flags).some(k => !['frost','storm','mirror','forge'].includes(k))) return false;
        if (!record(x.stats) || !record(x.stats.played) || Object.entries(x.stats.played).some(([id,n]) => !Object.hasOwn(CARDS,id) || !integer(n,0,1000000))) return false;
        for (const k of ['dealt','taken','healed','energyGained','blocked','reflected','interrupts','relics']) if (!integer(x.stats[k],0,1000000)) return false;
        if (!Array.isArray(x.history) || x.history.length > 6 || x.history.some(h => !Object.values(definitions).some(e => e.name === h.enemy) || !integer(h.battle,1,6) || !integer(h.turns,1,10000) || !integer(h.hp,0,66) || !['victory','defeat'].includes(h.result))) return false;
        if (x.history.filter(h=>h.result==='victory').length !== x.wins) return false;
        if (!Array.isArray(x.relics) || x.relics.length>1 || new Set(x.relics).size!==x.relics.length || x.relics.some(id=>!Object.hasOwn(RELICS,id))) return false;
        if (!record(x.relicUsed) || Object.keys(x.relicUsed).sort().join('|')!=='emberCore|starBottle' || Object.values(x.relicUsed).some(v=>typeof v!=='boolean') || Object.keys(RELICS).some(id=>!x.relics.includes(id)&&x.relicUsed[id])) return false;
        if (![null,'sanctuary','camp'].includes(x.removalSource) || (x.phase==='remove' ? x.removalSource!==([2,4].includes(x.battle)?'sanctuary':'camp') : x.removalSource!==null)) return false;
        if (x.relics.length && (x.battle<2 || (x.battle===2&&(x.phase!=='ready'||x.sanctuary!=='relic')))) return false;
        if (x.sanctuary==='relic' && !x.relics.length) return false;
        if (x.sanctuary==='remove' && !(growth && x.battle===2 && x.phase==='ready' && x.earlyRemoval) && (x.battle<4 || (x.battle===4&&x.phase!=='ready'))) return false;
        if (x.camp!==null && (x.battle<5 || (x.battle===5&&x.phase!=='ready'))) return false;
        if (x.removed.length !== Number(x.sanctuary==='remove' && !(growth && x.battle===2))+Number(x.camp==='remove')+Number(growth && x.earlyRemoval!==null)) return false;
        if (growth && x.earlyRemoval!==null && (x.battle<2 || (x.battle===2 && (x.phase!=='ready' || x.sanctuary!=='remove')) || x.removed[0]!==x.earlyRemoval)) return false;
        if (growth && x.relics.length) return false;
        if (!Array.isArray(x.log) || x.log.length > 5 || x.log.some(t => typeof t !== 'string' || t.length > 500)) return false;
        if ((x.phase !== 'battle' && (x.pendingFocus || x.pendingBlock || x.prevEndEmpty || x.turnLastAttack || x.prevLastAttack || x.usedExhaustThisTurn)) || (x.turn === 1 && (x.prevEndEmpty || x.prevLastAttack))) return false;
        const afterBattle = !['intro','battle'].includes(x.phase), victoryPhase = afterBattle && x.phase !== 'defeat';
        if (x.phase === 'intro') {
          if (x.battle !== 1 || x.turn !== 1 || x.wins !== 0 || x.hp !== MAX_HP || x.energy !== 2 || x.history.length || x.route || x.route2 || x.lastReward || x.lastUpgrade || x.pendingUpgrade || x.rewards.length || x.upgrades.length || x.removed.length) return false;
          if ([...x.deck].sort().join('|') !== [...(growth ? BASIC_STARTER : ORIGINS[x.origin].deck)].sort().join('|') || x.hand.length+x.draw.length+x.discard.length+x.exhaust.length !== 0 || x.enemyHp !== definitions.skeleton.hp) return false;
        } else {
          if (x.wins !== (victoryPhase ? x.battle : x.battle-1) || x.history.length !== (afterBattle ? x.battle : x.battle-1)) return false;
          if (victoryPhase && (x.hp <= 0 || x.enemyHp !== 0)) return false;
          if (x.phase === 'defeat' && x.hp !== 0) return false;
        }
        if (['reward','route','chapter','sanctuary','evolve','camp','remove','ready','astrolabe'].includes(x.phase) && x.battle >= RUN_LENGTH) return false;
        if (x.phase === 'route' && x.battle !== 1) return false;
        if (x.phase === 'chapter' && x.battle !== 3) return false;
        if (['sanctuary','evolve'].includes(x.phase) && ![2,4].includes(x.battle)) return false;
        if (x.phase === 'camp' && x.battle !== 5) return false;
        if (x.phase === 'remove' && !(growth ? [2,4,5] : [4,5]).includes(x.battle)) return false;
        if (x.phase === 'astrolabe' && (growth || x.battle!==2 || x.hp<=6 || x.relics.length)) return false;
        const hasRoute = x.battle >= 2 || (x.battle === 1 && x.phase === 'ready');
        const hasChapterRoute = x.battle >= 4 || (x.battle === 3 && x.phase === 'ready');
        if (hasRoute ? !['moon','forge'].includes(x.route) : x.route !== null) return false;
        if (hasChapterRoute ? !['library','wind','causeway'].includes(x.route2) : x.route2 !== null) return false;
        if (x.forge !== (x.route === 'forge') || x.insight !== (x.route2 === 'library') || x.maxHp !== (x.route2 === 'wind' ? 66 : 60)) return false;
        const allowedPairs = ['starDial|bellSpirit','bowWatcher|bellSpirit','archive|wind', ...(save.version === 5 ? ['starScaleGuard|bellSpirit'] : [])];
        if (!record(x.chapter2Options) || Object.keys(x.chapter2Options).sort().join('|')!=='library|wind' || !allowedPairs.includes(`${x.chapter2Options.library}|${x.chapter2Options.wind}`)) return false;
        if (!x.route2 && !['starDial','bowWatcher', ...(save.version === 5 ? ['starScaleGuard'] : [])].includes(x.chapter2Options.library)) return false;
        if (x.chapter2Encounter !== (x.route2 === 'causeway' ? 'tideStarSentinel' : x.route2?x.chapter2Options[x.route2]:null)) return false;
        const encounter = b => b === 1 ? 'skeleton' : b === 2 ? (x.route==='moon'?'wraith':'stone') : b === 3 ? 'trial' : b === 4 ? x.chapter2Encounter : b === 5 ? 'elite' : 'moth';
        if (x.enemyId !== encounter(x.battle)) return false;
        if (x.history.some((h,i)=>h.battle!==i+1 || h.enemy!==definitions[encounter(i+1)].name || (i<x.history.length-1&&h.result!=='victory') || (h.result==='defeat'?h.hp!==0:h.hp<=0))) return false;
        if (afterBattle && (x.history.at(-1).turns !== x.turn || x.history.at(-1).result !== (x.phase==='defeat'?'defeat':'victory'))) return false;
        if (x.rewards.length>5 || x.upgrades.length>2 || x.removed.length>(growth?3:2) || x.deck.length !== 10+x.rewards.length-x.removed.length) return false;
        if (x.pendingUpgrade && !x.deck.includes(x.pendingUpgrade)) return false;
        if (['battle','victory','defeat','complete'].includes(x.phase) && [...x.hand,...x.draw,...x.discard,...x.exhaust].sort().join('|') !== [...x.deck].sort().join('|')) return false;
        if (x.phase === 'battle' && (!x.hp || !x.enemyHp)) return false;
        if (x.phase === 'battle') {
          const m=definitions[x.enemyId].moves[(x.turn-1)%definitions[x.enemyId].moves.length], r=breakRule(m);
          if (!r.kind && x.interrupted) return false;
          if (r.kind==='count' && x.interrupted !== (x.spellCount>=r.threshold)) return false;
          if (r.kind==='single' && x.interrupted && (!x.spellCount || x.turnDamage<r.threshold)) return false;
        }
        if (x.phase === 'reward' && x.rewardOffers.length !== 4) return false;
        if (x.phase === 'complete' && (x.wins !== 6 || x.battle !== 6)) return false;
        s = JSON.parse(JSON.stringify(x)); rng = seededRandom(save.rngState); return true;
      } catch { return false; }
    }
    reset();
    return { snapshot, card: runCard, selectOrigin, start, intent, futureIntents, previewCard, play, endTurn, rewardOptions, openReward, chooseReward, chooseRoute, chooseSanctuary, chooseRelic, cancelRelic, upgradeOptions, evolve, cancelEvolution, chooseChapter, chooseCamp, removeOptions, removeCard, cancelRemoval, nextBattle, exportSave, restoreSave, reset };
  }
  globalThis.ShinkaV43 = Object.freeze({ CARDS, ORIGINS, ENEMIES, GROWTH_ENEMIES, CURRENT_ENEMIES, GROWTH_RULESET, STARTER_COST_RULESET, isGrowthRun, manaRegenFor, BASIC_STARTER, FIRST_REWARD_POOLS, enemiesFor, RELICS, enemyPattern, MAX_HP, MAX_ENERGY, RUN_LENGTH, card, seededRandom, resolveAttack, createGame });
})();
