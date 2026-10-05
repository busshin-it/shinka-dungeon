/* Paper Lantern trial. All balance values are experimental and isolated from the main game. */
(() => {
  const CARDS = Object.freeze({
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
    echo: { name: '返照', cost: 0, reflect: 2, exhaust: true, family: 'guard', art: 'manaBarrier' }
  });
  function card(id) {
    if (typeof id !== 'string') return null;
    const base = id.endsWith('+') ? id.slice(0, -1) : id;
    if (!Object.hasOwn(CARDS, base)) return null;
    const c = { ...CARDS[base], id, base, upgraded: id.endsWith('+') };
    if (c.upgraded) {
      c.name += '＋';
      if (c.damage) c.damage += c.cost === 0 ? 1 : 3;
      if (c.block) c.block += 3;
      if (c.weaken) c.weaken++;
      if (c.reflect) c.reflect++;
      if (c.focus) c.focus += 2;
      if (c.heal) c.heal += 2;
      if (c.energy) c.energy++;
      if (c.exhaust && c.draw) c.draw++;
    }
    c.text = [c.damage && `${c.damage}ダメージ`, c.combo && `このターン2枚目以降の攻撃なら＋${c.combo}`,
      c.block && `${c.block}ブロック`, c.weaken && `次の敵の攻撃行動の各打撃 −${c.weaken}`,
      c.focus && `このターン、次の攻撃＋${c.focus}`, c.reflect && `打撃ごとに${c.reflect}反射`,
      c.weakBonus && `敵に弱体があれば＋${c.weakBonus}。その弱体をすべて消費`,
      c.emptyBonus && `魔力0で使うと＋${c.emptyBonus}`,
      c.blockDamage && `今のブロック分を追加（最大${c.blockDamage}）。ブロックをすべて消費`,
      c.heal && `HPを${c.heal}回復`, c.energy && `魔力＋${c.energy}（上限5）`,
      c.draw && `${c.draw}枚引く`, c.exhaust && '消滅：この戦闘中は戻らない'].filter(Boolean).join('。') + '。';
    return c;
  }
  const ORIGINS = Object.freeze({
    frost: { name: '氷晶の護符', symbol: '❄', short: '氷で制する', effect: '毎ターン、最初の弱体を持つ氷カードの弱体＋1。',
      deck: ['ice','guard','focus','spark','shatter','dark','guard','charge','meditate','frostWard'] },
    storm: { name: '雷鳴の護符', symbol: 'ϟ', short: '雷で崩す', effect: '毎ターン、最初の魔力2の攻撃＋3。',
      deck: ['ice','guard','focus','spark','bolt','dark','guard','charge','meditate','chain'] },
    mirror: { name: '月鏡の護符', symbol: '◈', short: '鏡で返す', effect: '毎ターン、最初の防御カードで反射＋2。',
      deck: ['ice','guard','focus','spark','mirror','dark','guard','charge','meditate','shieldStrike'] }
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
    archive: { name: '書庫の観測者', hp: 68, art: 'wraith', lesson: '三連撃と一撃が交互。手札を増やしても使い切る必要はない。', moves: [
      { type: 'attack', label: '星屑の三連撃', power: 4, hits: 3 }, { type: 'attack', label: '頁の刃', power: 14, hits: 1 }, { type: 'recover', label: '頁をめくる' }] },
    wind: { name: '嵐をまとう甲冑', hp: 76, art: 'skeleton', lesson: '重い連撃と詠唱。魔力を残すか、使い切って火花につなぐか。', moves: [
      { type: 'attack', label: '嵐の双刃', power: 7, hits: 2 }, { type: 'attack', label: '雷雲の詠唱', power: 20, hits: 1, threshold: 14, reduction: 12 }, { type: 'recover', label: '風が止む' }] },
    elite: { name: '鏡像の双衛', hp: 82, art: 'wraith', lesson: '連撃を守り、回復の前に押し切る。魔力を貯めた一撃も有効。', moves: [
      { type: 'attack', label: '鏡の三連撃', power: 4, hits: 3 }, { type: 'attack', label: '鏡像の一閃', power: 16, hits: 1, threshold: 13, reduction: 10 }, { type: 'recover', label: '鏡を繕う', heal: 4 }] },
    moth: { name: '星環の守護者', hp: 112, art: 'moth', lesson: '最終戦。三連撃と詠唱強打。14ダメージで強打21→9。', moves: [
      { type: 'attack', label: '星刃の三連撃', power: 5, hits: 3 }, { type: 'attack', label: '星環の詠唱', power: 21, hits: 1, threshold: 14, reduction: 12 }, { type: 'recover', label: '星を集める', heal: 6 }] }
  });
  const MAX_HP = 60;
  const MAX_ENERGY = 5;
  const RUN_LENGTH = 6;
  const REWARD_POOLS = Object.freeze({ frost: ['iceSpear','frostWard','shatter','winter','frostNova'], storm: ['spark','charge','thunderCrash','surge','chain'], mirror: ['reflectShield','shieldStrike','drain','echo','mirror'] });
  const seededRandom = seed => { let x = seed >>> 0; const next = () => ((x = Math.imul(x, 1664525) + 1013904223 >>> 0) / 4294967296); next.state = () => x; return next; };
  function resolveAttack(s, action) {
    let hp = s.hp, enemyHp = s.enemyHp, block = s.block, taken = 0, blocked = 0, reflected = 0, resolvedHits = 0;
    for (let i = 0; i < action.hits && hp > 0 && enemyHp > 0; i++) {
      const stop = Math.min(block, action.perHit), hurt = Math.min(hp, action.perHit - stop), back = Math.min(enemyHp, s.reflect);
      block -= stop; hp -= hurt; enemyHp -= back; taken += hurt; blocked += stop; reflected += back; resolvedHits++;
    }
    return { hp, enemyHp, taken, blocked, reflected, resolvedHits };
  }
  function createGame(random = Math.random) {
    let s, rng = random;
    const snapshot = () => JSON.parse(JSON.stringify(s));
    const enemy = () => ENEMIES[s.enemyId];
    const move = () => enemy().moves[(s.turn - 1) % enemy().moves.length];
    const note = text => { s.log = [text, ...s.log].slice(0, 5); };
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function draw(n) { while (n-- > 0) { if (!s.draw.length) s.draw = shuffle(s.discard.splice(0)); if (!s.draw.length) break; s.hand.push(s.draw.shift()); } }
    function reset() {
      s = { phase: 'intro', origin: 'frost', battle: 1, turn: 1, hp: MAX_HP, maxHp: MAX_HP, enemyId: 'skeleton', enemyHp: 48, enemyMaxHp: 48,
        energy: 2, maxEnergy: MAX_ENERGY, block: 0, focus: 0, weaken: 0, reflect: 0, turnDamage: 0, spellCount: 0, interrupted: false, flags: {},
        deck: [...ORIGINS.frost.deck], hand: [], draw: [], discard: [], exhaust: [], route: null, route2: null, forge: false, insight: false, sanctuary: null, camp: null,
        lastReward: null, lastUpgrade: null, pendingUpgrade: null, upgrades: [], removed: [], rewards: [], rewardOffers: [], history: [], wins: 0,
        stats: { played: {}, dealt: 0, taken: 0, healed: 0, energyGained: 0, blocked: 0, reflected: 0, interrupts: 0, relics: 0 },
        log: ['護符を選んで、蒼星の回廊へ。'] };
      return snapshot();
    }
    function selectOrigin(id) { if (s.phase !== 'intro' || !Object.hasOwn(ORIGINS, id)) return false; s.origin = id; s.deck = [...ORIGINS[id].deck]; return true; }
    function prepare() {
      s.phase = 'battle'; s.turn = 1; s.energy = 2; s.block = s.focus = s.weaken = s.reflect = s.turnDamage = s.spellCount = 0; s.flags = {}; s.interrupted = false;
      s.enemyId = s.battle === 1 ? 'skeleton' : s.battle === 2 ? (s.route === 'moon' ? 'wraith' : 'stone') : s.battle === 3 ? 'trial' : s.battle === 4 ? (s.route2 === 'library' ? 'archive' : 'wind') : s.battle === 5 ? 'elite' : 'moth';
      s.enemyMaxHp = s.enemyHp = enemy().hp;
      s.rewardOffers = [];
      s.hand = []; s.discard = []; s.exhaust = []; s.draw = shuffle([...s.deck]);
      const opening = s.battle === 1 ? ORIGINS[s.origin].deck.slice(0, 5) : [s.lastReward, s.pendingUpgrade].filter(Boolean);
      for (const id of opening) { const index = s.draw.indexOf(id); if (index >= 0) { s.draw.splice(index, 1); s.hand.push(id); } }
      draw((s.insight ? 6 : 5) - s.hand.length); s.pendingUpgrade = null; note(enemy().lesson);
    }
    function start() { if (s.phase !== 'intro') return false; prepare(); return true; }
    function intent() {
      const m = move();
      if (m.type === 'recover') {
        const next = enemy().moves[s.turn % enemy().moves.length], nextPer = Math.max(0, next.power - s.weaken), healing = Math.min(m.heal || 0, s.enemyMaxHp - s.enemyHp);
        return { type: 'recover', label: m.label, damage: 0, hpLoss: 0, heal: healing, detail: `攻撃しない。${healing ? `敵HPが${healing}回復。` : ''}次は${next.label} ${nextPer}${next.hits > 1 ? `×${next.hits}` : ''}。` };
      }
      const perHit = Math.max(0, m.power - (s.interrupted ? m.reduction || 0 : 0) - s.weaken);
      const a = { type: 'attack', label: m.label, perHit, hits: m.hits, damage: perHit * m.hits };
      const result = resolveAttack(s, a);
      const extra = m.threshold ? { threshold: m.threshold, progress: Math.min(m.threshold, s.turnDamage), remaining: Math.max(0, m.threshold - s.turnDamage), broken: s.interrupted } : {};
      const tip = m.threshold ? s.interrupted ? `詠唱崩し成功。基本威力${m.power}→${m.power - m.reduction}。` : `あと${extra.remaining}ダメージで威力−${m.reduction}。` : '';
      return { ...a, ...extra, hpLoss: result.taken, reflected: result.reflected, resolvedHits: result.resolvedHits,
        detail: `今の守りで HP −${result.taken}。${result.reflected ? `反射${result.reflected}。` : ''}${tip}${result.resolvedHits < m.hits && result.enemyHp === 0 && result.hp > 0 ? '反射で残りの打撃を止める。' : ''}` };
    }
    function previewCard(index) {
      const c = card(s.hand[index] || ''); if (!c) return null;
      const charm = c.damage && s.origin === 'storm' && c.cost === 2 && !s.flags.storm ? 3 : 0;
      const forge = c.damage && s.forge && !s.flags.forge ? 2 : 0;
      return { ...c, actualDamage: c.damage ? c.damage + s.focus + (c.combo && s.spellCount > 0 ? c.combo : 0) + (c.weakBonus && s.weaken > 0 ? c.weakBonus : 0) + (c.emptyBonus && s.energy === 0 ? c.emptyBonus : 0) + Math.min(c.blockDamage || 0, s.block) + charm + forge : 0,
        actualWeak: c.weaken ? c.weaken + (s.origin === 'frost' && c.family === 'ice' && !s.flags.frost ? 1 : 0) : 0,
        actualReflect: (c.reflect || 0) + (c.block && s.origin === 'mirror' && !s.flags.mirror ? 2 : 0),
        actualHeal: Math.min(c.heal || 0, s.maxHp - s.hp), actualEnergy: Math.min(c.energy || 0, MAX_ENERGY - s.energy + c.cost) };
    }
    function finish() {
      if (s.phase !== 'battle') return;
      if (s.hp <= 0) { s.phase = 'defeat'; note('灯りが消えた。同じ山札で別の選択を試そう。'); }
      else if (s.enemyHp <= 0) { s.phase = 'victory'; s.wins++; note(`${enemy().name}を越えた。`); }
      if (s.phase !== 'battle') s.history.push({ enemy: enemy().name, battle: s.battle, turns: s.turn, hp: s.hp, result: s.phase });
    }
    function play(index) {
      if (s.phase !== 'battle' || !Number.isInteger(index)) return false;
      const c = previewCard(index); if (!c || c.cost > s.energy) return false;
      s.energy -= c.cost; s.hand.splice(index, 1); s.stats.played[c.base] = (s.stats.played[c.base] || 0) + 1;
      let damage = 0;
      if (c.damage) {
        damage = Math.min(s.enemyHp, c.actualDamage); s.enemyHp -= damage; s.turnDamage += damage; s.stats.dealt += damage; s.focus = 0; s.spellCount++;
        if (s.origin === 'storm' && c.cost === 2 && !s.flags.storm) { s.flags.storm = true; s.stats.relics++; }
        if (s.forge && !s.flags.forge) s.flags.forge = true;
      }
      if (s.origin === 'frost' && c.weaken && !s.flags.frost) { s.flags.frost = true; s.stats.relics++; }
      if (s.origin === 'mirror' && c.block && !s.flags.mirror) { s.flags.mirror = true; s.stats.relics++; }
      if (c.consumeWeak) s.weaken = 0;
      if (c.consumeBlock) s.block = 0;
      s.block += c.block || 0; s.focus += c.focus || 0; s.weaken = Math.max(s.weaken, c.actualWeak); s.reflect += c.actualReflect;
      s.hp += c.actualHeal; s.stats.healed += c.actualHeal;
      s.energy = Math.min(MAX_ENERGY, s.energy + (c.energy || 0)); s.stats.energyGained += c.actualEnergy;
      if (c.draw && s.enemyHp > 0) draw(c.draw);
      (c.exhaust ? s.exhaust : s.discard).push(c.id);
      note(`${c.name}：${damage ? `${damage}ダメージ。` : ''}${c.block ? `${c.block}ブロック。` : ''}${c.actualWeak ? `各打撃−${c.actualWeak}。` : ''}${c.focus ? `次の攻撃＋${c.focus}。` : ''}${c.actualReflect ? `反射＋${c.actualReflect}。` : ''}${c.heal ? `HP＋${c.actualHeal}。` : ''}${c.energy ? `魔力＋${c.actualEnergy}。` : ''}${c.consumeWeak ? '弱体を消費。' : ''}${c.consumeBlock ? 'ブロックを消費。' : ''}${c.draw && s.enemyHp > 0 ? `${c.draw}枚引く。` : ''}${c.exhaust ? '消滅。' : ''}`);
      if (move().threshold && !s.interrupted && s.turnDamage >= move().threshold && s.enemyHp > 0) { s.interrupted = true; s.stats.interrupts++; note(`詠唱を崩した！ 残る攻撃にも備えよう。`); }
      finish(); return true;
    }
    function endTurn() {
      if (s.phase !== 'battle') return false;
      const a = intent();
      if (a.type === 'attack') {
        const r = resolveAttack(s, a); s.hp = r.hp; s.enemyHp = r.enemyHp; s.stats.taken += r.taken; s.stats.blocked += r.blocked;
        s.stats.reflected += r.reflected; s.stats.dealt += r.reflected; s.weaken = 0;
        note(`${a.label}${a.hits > 1 ? ` ${r.resolvedHits}回` : ''}。${r.blocked}防ぎ、HP −${r.taken}${r.reflected ? `。反射 ${r.reflected}` : ''}。`);
      } else { s.enemyHp += a.heal; note(a.detail); }
      s.discard.push(...s.hand.splice(0)); s.block = s.focus = s.reflect = 0; finish();
      if (s.phase === 'battle') { s.turn++; s.energy = Math.min(MAX_ENERGY, s.energy + 1); s.turnDamage = s.spellCount = 0; s.flags = {}; s.interrupted = false; draw(5); }
      return true;
    }
    function rewardOptions() { return [...s.rewardOffers]; }
    function openReward() {
      if (s.phase !== 'victory') return false;
      s.phase = s.battle === RUN_LENGTH ? 'complete' : 'reward';
      if (s.phase === 'reward') {
        const offers = shuffle([...REWARD_POOLS[s.origin]]).slice(0,1);
        offers.push(shuffle(['light','stillness','renew','meditate','focus'].filter(id => !offers.includes(id)))[0]);
        while (offers.length < 4) offers.push(shuffle(Object.keys(CARDS).filter(id => !offers.includes(id)))[0]); s.rewardOffers = offers;
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
      if (s.phase !== 'chapter' || !['library','wind'].includes(id)) return false;
      s.route2 = id;
      if (id === 'library') { s.insight = true; note('星図を得た。以後、各戦闘の初手が6枚になる。'); }
      else { s.maxHp += 6; s.hp = Math.min(s.maxHp, s.hp + 6); note('風の加護。最大HP＋6、HPを6回復。'); }
      s.phase = 'ready'; return true;
    }
    function chooseCamp(id) {
      if (s.phase !== 'camp' || !['rest','remove'].includes(id)) return false;
      if (id === 'rest') { s.hp = Math.min(s.maxHp,s.hp+16); s.camp = 'rest'; s.phase = 'ready'; }
      else s.phase = 'remove';
      return true;
    }
    function removeOptions() { return [...new Set(s.deck)]; }
    function removeCard(id) {
      if (s.phase !== 'remove' || !removeOptions().includes(id) || s.deck.length <= 5) return false;
      s.deck.splice(s.deck.indexOf(id),1); s.removed.push(id);
      if (s.lastReward === id && !s.deck.includes(id)) s.lastReward = null;
      s.camp = 'remove'; s.phase = 'ready'; return true;
    }
    function cancelRemoval() { if (s.phase !== 'remove') return false; s.phase = 'camp'; return true; }
    function chooseSanctuary(id) {
      if (s.phase !== 'sanctuary' || !['rest', 'evolve'].includes(id)) return false;
      if (id === 'rest') { s.hp = Math.min(s.maxHp, s.hp + 14); s.sanctuary = 'rest'; s.phase = 'ready'; note('灯りの間でHPを14回復した。'); }
      else s.phase = 'evolve';
      return true;
    }
    function evolve(id) {
      if (s.phase !== 'evolve' || !upgradeOptions().includes(id)) return false;
      const upgraded = id + '+'; s.deck[s.deck.indexOf(id)] = upgraded; s.lastUpgrade = upgraded; s.pendingUpgrade = upgraded; s.upgrades.push(upgraded); s.sanctuary = 'evolve'; s.phase = 'ready'; note(`${card(upgraded).name}へ進化。次の初手で試せる。`); return true;
    }
    function cancelEvolution() { if (s.phase !== 'evolve') return false; s.phase = 'sanctuary'; return true; }
    function nextBattle() { if (s.phase !== 'ready' || s.battle >= RUN_LENGTH) return false; s.battle++; prepare(); return true; }
    function exportSave() {
      if (typeof rng.state !== 'function') return null;
      return { format: 'astral-corridor', version: 1, rngState: rng.state(), state: snapshot() };
    }
    function restoreSave(save) {
      // Local saves are data, never executable state. Validate before changing the live game.
      try {
        if (!save || save.format !== 'astral-corridor' || save.version !== 1 || !Number.isInteger(save.rngState) || save.rngState < 0 || save.rngState > 4294967295) return false;
        const x = save.state, integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
        const record = v => v !== null && typeof v === 'object' && Object.prototype.toString.call(v) === '[object Object]';
        const phases = ['intro','battle','victory','defeat','complete','reward','route','chapter','sanctuary','evolve','camp','remove','ready'];
        if (!record(x) || !phases.includes(x.phase) || !Object.hasOwn(ORIGINS,x.origin) || !Object.hasOwn(ENEMIES,x.enemyId)) return false;
        if (!integer(x.battle,1,6) || !integer(x.turn,1,10000) || ![60,66].includes(x.maxHp) || !integer(x.hp,0,x.maxHp) || x.enemyMaxHp !== ENEMIES[x.enemyId].hp || !integer(x.enemyHp,0,x.enemyMaxHp)) return false;
        if (x.maxEnergy !== 5 || !integer(x.energy,0,5) || !integer(x.wins,0,6)) return false;
        for (const k of ['block','focus','weaken','reflect','turnDamage','spellCount']) if (!integer(x[k],0,100000)) return false;
        for (const k of ['interrupted','forge','insight']) if (typeof x[k] !== 'boolean') return false;
        for (const [k,allowed] of [['route',[null,'moon','forge']],['route2',[null,'library','wind']],['sanctuary',[null,'rest','evolve']],['camp',[null,'rest','remove']]]) if (!allowed.includes(x[k])) return false;
        for (const k of ['deck','hand','draw','discard','exhaust','upgrades','removed','rewards','rewardOffers']) if (!Array.isArray(x[k]) || x[k].length > 30 || x[k].some(id => typeof id !== 'string' || !card(id))) return false;
        if (x.deck.length < 5 || x.deck.length > 20 || x.rewardOffers.length > 4 || new Set(x.rewardOffers).size !== x.rewardOffers.length) return false;
        for (const k of ['lastReward','lastUpgrade','pendingUpgrade']) if (x[k] !== null && (typeof x[k] !== 'string' || !card(x[k]))) return false;
        if (!record(x.flags) || Object.values(x.flags).some(v => typeof v !== 'boolean') || Object.keys(x.flags).some(k => !['frost','storm','mirror','forge'].includes(k))) return false;
        if (!record(x.stats) || !record(x.stats.played) || Object.entries(x.stats.played).some(([id,n]) => !Object.hasOwn(CARDS,id) || !integer(n,0,1000000))) return false;
        for (const k of ['dealt','taken','healed','energyGained','blocked','reflected','interrupts','relics']) if (!integer(x.stats[k],0,1000000)) return false;
        if (!Array.isArray(x.history) || x.history.length > 6 || x.history.some(h => !Object.values(ENEMIES).some(e => e.name === h.enemy) || !integer(h.battle,1,6) || !integer(h.turns,1,10000) || !integer(h.hp,0,66) || !['victory','defeat'].includes(h.result))) return false;
        if (x.history.filter(h=>h.result==='victory').length !== x.wins) return false;
        if (!Array.isArray(x.log) || x.log.length > 5 || x.log.some(t => typeof t !== 'string' || t.length > 500)) return false;
        const afterBattle = !['intro','battle'].includes(x.phase), victoryPhase = afterBattle && x.phase !== 'defeat';
        if (x.phase === 'intro') {
          if (x.battle !== 1 || x.turn !== 1 || x.wins !== 0 || x.hp !== MAX_HP || x.energy !== 2 || x.history.length || x.route || x.route2 || x.lastReward || x.lastUpgrade || x.pendingUpgrade || x.rewards.length || x.upgrades.length || x.removed.length) return false;
          if ([...x.deck].sort().join('|') !== [...ORIGINS[x.origin].deck].sort().join('|') || x.hand.length+x.draw.length+x.discard.length+x.exhaust.length !== 0 || x.enemyHp !== ENEMIES.skeleton.hp) return false;
        } else {
          if (x.wins !== (victoryPhase ? x.battle : x.battle-1) || x.history.length !== (afterBattle ? x.battle : x.battle-1)) return false;
          if (victoryPhase && (x.hp <= 0 || x.enemyHp !== 0)) return false;
          if (x.phase === 'defeat' && x.hp !== 0) return false;
        }
        if (['reward','route','chapter','sanctuary','evolve','camp','remove','ready'].includes(x.phase) && x.battle >= RUN_LENGTH) return false;
        if (x.phase === 'route' && x.battle !== 1) return false;
        if (x.phase === 'chapter' && x.battle !== 3) return false;
        if (['sanctuary','evolve'].includes(x.phase) && ![2,4].includes(x.battle)) return false;
        if (['camp','remove'].includes(x.phase) && x.battle !== 5) return false;
        const hasRoute = x.battle >= 2 || (x.battle === 1 && x.phase === 'ready');
        const hasChapterRoute = x.battle >= 4 || (x.battle === 3 && x.phase === 'ready');
        if (hasRoute ? !['moon','forge'].includes(x.route) : x.route !== null) return false;
        if (hasChapterRoute ? !['library','wind'].includes(x.route2) : x.route2 !== null) return false;
        if (x.forge !== (x.route === 'forge') || x.insight !== (x.route2 === 'library') || x.maxHp !== (x.route2 === 'wind' ? 66 : 60)) return false;
        const encounter = b => b === 1 ? 'skeleton' : b === 2 ? (x.route==='moon'?'wraith':'stone') : b === 3 ? 'trial' : b === 4 ? (x.route2==='library'?'archive':'wind') : b === 5 ? 'elite' : 'moth';
        if (x.enemyId !== encounter(x.battle)) return false;
        if (x.history.some((h,i)=>h.battle!==i+1 || h.enemy!==ENEMIES[encounter(i+1)].name || (i<x.history.length-1&&h.result!=='victory') || (h.result==='defeat'?h.hp!==0:h.hp<=0))) return false;
        if (afterBattle && (x.history.at(-1).turns !== x.turn || x.history.at(-1).result !== (x.phase==='defeat'?'defeat':'victory'))) return false;
        if (x.rewards.length>5 || x.upgrades.length>2 || x.removed.length>1 || x.deck.length !== 10+x.rewards.length-x.removed.length) return false;
        if (x.pendingUpgrade && !x.deck.includes(x.pendingUpgrade)) return false;
        if (['battle','victory','defeat','complete'].includes(x.phase) && [...x.hand,...x.draw,...x.discard,...x.exhaust].sort().join('|') !== [...x.deck].sort().join('|')) return false;
        if (x.phase === 'battle' && (!x.hp || !x.enemyHp)) return false;
        if (x.phase === 'reward' && x.rewardOffers.length !== 4) return false;
        if (x.phase === 'complete' && (x.wins !== 6 || x.battle !== 6)) return false;
        s = JSON.parse(JSON.stringify(x)); rng = seededRandom(save.rngState); return true;
      } catch { return false; }
    }
    reset();
    return { snapshot, selectOrigin, start, intent, previewCard, play, endTurn, rewardOptions, openReward, chooseReward, chooseRoute, chooseSanctuary, upgradeOptions, evolve, cancelEvolution, chooseChapter, chooseCamp, removeOptions, removeCard, cancelRemoval, nextBattle, exportSave, restoreSave, reset };
  }
  globalThis.ShinkaV4 = Object.freeze({ CARDS, ORIGINS, ENEMIES, MAX_HP, MAX_ENERGY, RUN_LENGTH, card, seededRandom, resolveAttack, createGame });
})();
