(() => {
  const { CARDS, ORIGINS, enemiesFor, RELICS, enemyPattern, RUN_LENGTH, isGrowthRun, manaRegenFor, seededRandom, createGame } = globalThis.ShinkaV43;
  let ENEMIES;
  const $ = selector => document.querySelector(selector);
  let seed = Math.floor(Math.random() * 0x100000000) >>> 0;
  let game = createGame(seededRandom(seed)), modalKey = '', lockedUntil = 0;
  const card = id => game.card(id);
  const story = $('#storyDialog'), restart = $('#restartDialog'), deck = $('#deckDialog');
  const panel = $('#cardPanel'), SAVE_KEY = 'shinka-astral-planning-save-v1', BACKUP_KEY = 'shinka-astral-planning-migration-backup', ORIGINAL_BACKUP_KEY = 'shinka-astral-planning-v43-backup';
  let uiRevision=0;
  let inspectedIndex = null, inspectedId = null, pendingSave = null, hadStoredSave = false, migrationRaw = null, storageReadFailed = false, saveMessage = '未保存';
  try {
    let raw; try { raw = localStorage.getItem(SAVE_KEY); } catch(error) { storageReadFailed=true; throw error; }
    hadStoredSave = Boolean(raw);
    if (raw && raw.length < 100000) {
      const saved = JSON.parse(raw), probe = createGame(seededRandom(0));
      if (saved.version === 1 && Number.isInteger(saved.seed) && saved.seed >= 0 && saved.seed <= 4294967295 && probe.restoreSave(saved.engine)) { pendingSave = saved; if(saved.engine.version<3){migrationRaw=raw;saveMessage='旧保存を引継げます';}else saveMessage = '続きあり'; }
      else saveMessage = '保存形式が非対応';
    } else if (raw) saveMessage = '保存を読み込めません';
  } catch { saveMessage = storageReadFailed ? '保存を読めないため上書きしません' : hadStoredSave ? '保存を読み込めません' : '保存を利用できません'; }
  function persist() {
    if(storageReadFailed){saveMessage='保存を読めないため上書きしません';$('#saveStatus').textContent=saveMessage;return;}
    if (game.snapshot().phase === 'intro' && (pendingSave || hadStoredSave)) return;
    try { if(migrationRaw!==null)localStorage.setItem(BACKUP_KEY,migrationRaw); localStorage.setItem(SAVE_KEY, JSON.stringify({version:1,seed,engine:game.exportSave(),savedAt:Date.now()})); migrationRaw=null; saveMessage = '端末に保存済'; }
    catch { saveMessage = '保存できません'; }
    $('#saveStatus').textContent = saveMessage;
  }
  const artFor = id => $('#newCardImages').content.querySelector(`[data-card-art="${id}"]`)?.getAttribute('src') || window.CARD_ART_DATA[id];
  const planningCue = c => `${c.transferBlockCap?`今の防御${c.actualConsumedBlock}をすべて消費し、次ターン防御${c.actualTransferredBlock}を予約。`:''}${c.recoverBonus?`敵が攻撃しない行動：${c.recoverCondition?'成立':'未成立'}。`:''}${c.consumeReflect?`反射${c.actualConsumedReflect}をすべて消費。追加ダメージ${c.actualReflectDamage}。`:''}${c.recycleAttack?(c.recycleTargetName?`山札の一番上へ戻す攻撃札：${c.recycleTargetName}。`:'捨て札に戻せる攻撃札なし。'):''}${c.bankBlock ? `支払い後の魔力2以上：${c.bankBlockCondition?'成立':'未成立'}。` : ''}${c.emptyWeak ? `支払い後の魔力0：${c.emptyWeakCondition?'成立':'未成立'}。この札の弱体${c.actualWeak}。` : ''}${c.breakDraw?`今は${c.actualDraw}枚引く。`:''}${c.weakThreshold ? `弱体${c.weakThreshold}以上の条件：${c.weakThresholdCondition?'成立':'未成立'}。` : ''}${c.breakBlock ? `詠唱崩し条件：${c.breakCondition?'成立':'未成立'}。` : ''}${c.memoryCap ? `追憶の追加＋${c.actualMemory}。` : ''}${c.exhaustBlock ? `消滅札条件：${c.exhaustCondition?'成立':'未成立'}。` : ''}${c.actualBlock ? `今は${c.actualBlock}ブロック。` : ''}${c.actualNextFocus ? `予約：次ターンの最初の攻撃＋${c.actualNextFocus}。` : ''}${c.actualNextBlock ? `予約：次ターン${c.actualNextBlock}ブロック。` : c.emptyNextBlock ? '今回はブロック予約なし。' : ''}`;
  const futurePower = a => `${a.power}${a.hits>1?`×${a.hits}`:''}${a.manaCondition?`〔終魔力${a.manaCondition==='bank'?'2以上':'0'}で${a.power-a.manaReduction}〕`:a.threshold?`〔${a.breakKind==='single'?'一撃':a.breakKind==='count'?'攻撃札':'合計'}${a.threshold}${a.breakKind==='count'?'枚':''}で${a.power-a.reduction}${a.hits>1?`×${a.hits}`:''}〕`:''}`;
  const compactFuturePower = a => `${a.power}${a.hits>1?'×'+a.hits:''}${a.manaCondition?`〔${a.manaCondition==='bank'?'魔力2↑':'魔力0'}:${a.power-a.manaReduction}〕`:''}`;
  const runCode = () => seed.toString(16).padStart(8, '0').toUpperCase();
  const button = (action, label, style = 'primary') => `<button type="button" class="${style}" data-action="${action}">${label}</button>`;
  const accessibleCard = (id, preview) => `${card(id).name}。魔力${card(id).cost}。${card(id).text}${preview.actualDamage ? `今は${preview.actualDamage}ダメージ。` : ''}${preview.actualWeak ? `今の弱体は各打撃−${preview.actualWeak}。` : ''}${preview.actualReflect ? `このカードで反射＋${preview.actualReflect}。` : ''}${planningCue(preview)}`;
  function cardFace(id, preview = null) {
    const c = card(id), cue = preview && preview.actualDamage ? `今は ${preview.actualDamage} ダメージ${preview.actualWeak ? ` / 弱体 ${preview.actualWeak}` : ''}` : preview && preview.actualReflect ? `このカードで反射 ＋${preview.actualReflect}` : `${c.upgraded ? '進化済み · ' : ''}魔力 ${c.cost}${c.exhaust ? ' · 消滅' : ''}`;
    return `<img class="card-art" src="${artFor(c.art)}" alt=""><span class="cost" aria-hidden="true">${c.cost}</span><span class="card-copy"><strong>${c.name}</strong><small>${c.text}</small><span class="category">${cue}</span></span>`;
  }
  const choiceCard = (id, attribute) => `<button type="button" class="card ${card(id).upgraded ? 'upgraded' : ''}" ${attribute} aria-label="${card(id).name}。魔力${card(id).cost}。${card(id).text}">${cardFace(id)}</button>`;
  const stats = s => `<div class="result-stat"><span>残りHP ${s.hp}/${s.maxHp}</span><span>防いだ ${s.stats.blocked}</span><span>反射 ${s.stats.reflected}</span><span>詠唱崩し ${s.stats.interrupts}回</span></div>`;
  const relic = () => $('#relicImage').innerHTML;
  function renderSelection() {
    const s = game.snapshot();
    if (s.phase !== 'battle' || inspectedIndex === null || s.hand[inspectedIndex] !== inspectedId) { inspectedIndex = null; inspectedId = null; }
    $('#hand').querySelectorAll('[data-card]').forEach(b => {
      const selected = Number(b.dataset.card) === inspectedIndex;
      b.classList.toggle('selected',selected); b.setAttribute('aria-pressed',String(selected)); b.setAttribute('aria-controls','cardPanel'); b.setAttribute('aria-expanded',String(selected));
    });
    const c = inspectedIndex === null ? null : game.previewCard(inspectedIndex);
    panel.classList.toggle('has-selection',Boolean(c));
    panel.hidden = !c;
    $('#handPanelHome').append(panel);
    $('#hand').querySelectorAll('.hand-item').forEach(item=>item.classList.remove('expanded'));
    $('.table').classList.toggle('has-selection',Boolean(c));
    if(c){const item=$('#hand').querySelector(`[data-card="${inspectedIndex}"]`).parentElement;item.classList.add('expanded');item.append(panel);}
    $('#cancelCard').disabled = !c;
    if (!c) {
      $('#cardReview').innerHTML = '';
      $('#playCard').disabled = true; $('#playCard').textContent = 'カードを選んでください'; window.ShinkaLayout?.refreshHand(); return;
    }
    const text=ShinkaFanText.format(c);
    $('#cardReview').innerHTML=`<div class="panel-card-header"><h3 id="cardTitle">${c.name}</h3>${c.upgraded?'<span>進化済み</span>':''}</div><p class="current-effect">${text.summary}</p><p class="panel-description">${text.rules}</p>${c.cost>s.energy?'<p class="panel-warning">魔力不足</p>':''}`;
    $('#playCard').disabled = c.cost>s.energy; $('#playCard').textContent=c.cost>s.energy?'魔力不足':`使う ${c.cost}`; $('#playCard').setAttribute('aria-label',`${c.name}を使う、魔力${c.cost}`); window.ShinkaLayout?.refreshHand(inspectedIndex);
  }
  function dismissSelection(returnFocus = false) {
    const i=inspectedIndex; inspectedIndex=null; inspectedId=null; renderSelection();
    if(returnFocus && i!==null){const b=$('#hand').querySelector(`[data-card="${i}"]`);if(window.ShinkaFan)window.ShinkaFan.focusBack(b);else b?.focus({preventScroll:true});}
  }
  function storyContent(s) {
    ENEMIES = enemiesFor(s);
    const growth = isGrowthRun(s);
    const inJourney = !['intro', 'complete', 'defeat'].includes(s.phase);
    const relicOption=growth && [2,4].includes(s.battle)?`<button class="choice" type="button" data-sanctuary="remove" ${s.deck.length<=5?'disabled':''}><span class="symbol">◇</span><strong>カードを1枚外す</strong><span>役割の重なる1枚を除く。回復・進化はしない。</span><small>薄くして報酬を引きやすくするか、基本札を育てて残すか。</small></button>`:s.battle===2?`<button class="choice" type="button" data-sanctuary="relic" ${s.hp<=6?'disabled':''}><span class="symbol">✧</span><strong>折れた天球儀</strong><span>HP6を投資して、各戦闘1回のレリックを1つ選ぶ。</span><small>${s.hp<=6?'HP7以上で選べます。':'選ぶ画面で取消できます。'} 次は連撃・詠唱16の守護者。</small></button>`:s.battle===4?`<button class="choice" type="button" data-sanctuary="remove" ${s.deck.length<=5?'disabled':''}><span class="symbol">◇</span><strong>白紙の書庫</strong><span>カードを1枚除く。回復・進化はしない。</span><small>残り2戦へ、役割が重なる札を整理する。</small></button>`:'';
    const wrap = (label, title, body, actions = '') => `<div class="dialog-inner"><span class="eyebrow">${label}</span><h2 id="storyTitle">${title}</h2>${['route','chapter','ready'].includes(s.phase)?ShinkaJourney.map(s,ENEMIES):''}${body}<div class="actions">${actions}</div></div>`;
    if (s.phase === 'intro') return wrap('CHOOSE YOUR CHARM · 04.17', '蒼い星の、その先へ。', `<p class="lead">2章・全6戦。54種類のカードを混ぜて、小さな組合せを育てる。</p><p>先読み54枚・成長ループ試遊。新しい旅は「小さな魔弾」5枚と「薄い守り」5枚から出発。最初の相手を越えて、報酬の強さと小さな組合せを試します。第2戦後に休息・進化・1枚除去を選べます。星綴りの司書ノアの書庫はその先へ。効果先行4枚に加え、霜鏡と霜刻の予告が基本1コストの旅の第2戦後から登場します。既存アートを共有するため名前と効果で見分けます。保存中の冒険は以前のデッキ・相手・ルールを維持します。24枚版とは別保存です。</p><div class="origin-grid">${Object.entries(ORIGINS).map(([id, o]) => `<button class="origin ${s.origin === id ? 'selected' : ''}" type="button" data-origin="${id}" aria-pressed="${s.origin === id}"><span class="symbol" aria-hidden="true">${o.symbol}</span><strong>${o.name} / ${o.short}</strong><small>${o.effect}</small><em>${s.origin === id ? '選択中' : '選ぶ'}</em></button>`).join('')}</div><p class="muted">${growth ? `この旅の基本2種は魔力${card('basicStrike').cost}。` : 'この旅は以前の護符別デッキです。'}魔力は開始2、2ターン目から＋${manaRegenFor(s)}、上限5。戦闘中は持ち越し、戦闘が変わると2に戻ります。星渡りの回廊では第4〜6戦の開始魔力が3になります。カードをタップで確認→「使う」。横向きがおすすめです。</p>${migrationRaw ? '<p class="journey-note">以前の先読み版を引き継げます。続ける時に保存形式を更新し、直前の保存1件を端末内に控えます。選択済みの相手は変えません。V4.3の控えがある場合は別に残します。古い形式にない記録は引継ぎ後から始まります。</p>' : ''}${pendingSave ? `<p class="journey-note">この先読み版の前回は第${pendingSave.engine.state.battle}戦。新しい旅を始めると保存を上書きします。</p>` : ''}${hadStoredSave && !pendingSave ? '<p class="journey-note">保存を読み込めません。新しい旅を始めると、その保存を置き換えます。</p>' : ''}`, (pendingSave ? button('resume','続きから') : '') + button('start', pendingSave ? '新しい旅を始める' : 'この護符で出発 →'));
    if (s.phase === 'victory') return wrap('A LIGHT AHEAD', `${ENEMIES[s.enemyId].name}を越えた。`, `<p>${s.battle === 3 ? '第1章を踏破。星の回廊は、さらに奥へ続いている。' : '足元の灯りが、次の道を照らしている。'}</p><div class="result-stat"><span>${s.turn}ターン</span><span>残りHP ${s.hp}/${s.maxHp}</span><span>デッキ ${s.deck.length}枚</span></div>`, button('reward', s.battle === RUN_LENGTH ? '旅の記録を見る →' : '報酬を選ぶ →'));
    if (s.phase === 'reward') return wrap('TAKE A PAGE · OR PASS', '足すことも、足さないことも。', `${ShinkaJourney.hp(s.hp,s.maxHp,'旅人のHP')}<p>♥ 最大8回復 · 取った1枚は次の初手へ</p><p class="journey-note">${growth && s.battle === 1 ? 'まず1枚。魔弾→連鎖雷、守り→鏡撃のように順番でも強さが変わります。' : s.battle < 3 ? '第1章ボスは連撃と詠唱強打。魔力を残す準備も役に立つ。' : '最終ボスは三連撃・詠唱21・回復。14ダメージで詠唱を崩せる。'}</p><div class="reward-grid four">${game.rewardOptions().map(id => choiceCard(id, `data-reward="${id}"`)).join('')}</div>`,button('skipReward','今回は取らない','quiet'));
    if (s.phase === 'route') return wrap('CHOOSE YOUR PATH','次の道を選ぶ', `${ShinkaJourney.hp(s.hp,s.maxHp,'旅人のHP')}${ShinkaJourney.route(s,ENEMIES)}`);
    if (s.phase === 'sanctuary') return wrap('A MOMENT OF STILLNESS', '灯りの間で、次の支度。', `${relic()}<p>先を見て、今の手札を育てる。HP ${s.hp}/${s.maxHp}。</p><div class="choices two"><button type="button" class="choice" data-sanctuary="rest"><span class="symbol">✦</span><strong>ひと休みする</strong><span>HPを最大14回復する。</span><small>今のデッキで、無理せず挑む。</small></button><button type="button" class="choice" data-sanctuary="evolve"><span class="symbol">↑</span><strong>カードを1枚進化</strong><span>手持ちの1枚を強化する。回復はしない。</span><small>進化カードは次の初手に入る。</small></button>${relicOption}</div>`);
    if (s.phase === 'astrolabe') return wrap('THE BROKEN ASTROLABE','どちらの灯りに、HPを託す？',`<p>今のHP ${s.hp}/${s.maxHp}。選ぶとHP6を支払います。次は連撃と詠唱16の守護者。</p><div class="choices two">${Object.entries(RELICS).map(([id,r])=>`<button type="button" class="choice" data-relic="${id}"><span class="symbol">${r.symbol}</span><strong>${r.name}</strong><span>${r.effect}</span><small>HP6を払って獲得。次の戦闘から使用可能。</small></button>`).join('')}</div>`,button('cancelRelic','払わず支度へ戻る','quiet'));
    if (s.phase === 'chapter') {
      const paths=[['library','✧','星図の書庫','以後、各戦闘の初手が6枚になる。'],['wind','☁','雷雲の渡り廊','最大HP＋6、HPも6回復。'],['causeway','✦','星渡りの回廊','HP4を支払い、第4〜6戦の開始魔力3（上限5）。']];
      return wrap('CHAPTER TWO', '次の相手を見て、道を選ぶ。', `${ShinkaJourney.hp(s.hp,s.maxHp,'旅人のHP')}<p class="lead">第4戦の相手と加護を選びます。</p><div class="choices three chapter-routes">${paths.map(([id,symbol,name,boon])=>{
        const enemyId=id==='causeway'?'tideStarSentinel':s.chapter2Options[id],e=ENEMIES[enemyId],src=$('#enemyImages').content.querySelector(`[data-art="${e.art}"]`).getAttribute('src');
        const cycle=e.moves.map(m=>m.type==='recover'?(m.heal?'回復'+m.heal:'休み'):`攻撃${m.power}${m.hits>1?'×'+m.hits:''}${m.manaCondition?`（終了時魔力${m.manaCondition==='bank'?'2以上':'0'}で${m.power-m.manaReduction}）`:''}`).join(' → ');
        return `<button type="button" class="choice ${id==='causeway'?'causeway-choice':''}" data-chapter="${id}" ${id==='causeway'&&s.hp<=4?'disabled':''}><img class="route-enemy ${e.art==='bowWatcher'?'watcher':e.art==='bellSpirit'?'bell':''}" src="${src}" alt=""><span class="symbol">${symbol}</span><strong>${name}</strong><span class="route-boon">${boon}</span><b>${e.name} · HP${e.hp}</b><small>${id==='causeway'?(s.hp<=4?'HP5以上で選べます。':'残す魔力と、使い切る魔力を選ぼう。'):e.lesson}<br><span class="route-cycle" title="${enemyPattern(enemyId,s)}">行動順：${cycle}</span></small>${id==='library'?'<span class="route-guide noa-guide"><span class="guide-portrait"><img src="./assets/librarian-noa.webp" alt="星綴りの司書ノア"></span><span><b>星綴りの司書ノア</b><small>「今の光を、次の頁へ。」</small></span></span>':id==='causeway'?'<span class="route-guide"><span class="guide-portrait"><img src="./assets/ferryman-rune.webp" alt="渡し守ルネ"></span><span><b>渡し守ルネ</b><small>「潮が引くときは、星を手元に。」</small></span></span>':''}</button>`;
      }).join('')}</div>`);
    }
    if (s.phase === 'camp') return wrap('BEFORE THE FINAL DOOR', '最後の支度は、何を残すか。', `<p>HP ${s.hp}/${s.maxHp}。最終戦の前に、回復かデッキ整理を選べます。</p><div class="choices two"><button type="button" class="choice" data-camp="rest"><strong>ゆっくり休む</strong><span>HPを最大16回復する。</span></button><button type="button" class="choice" data-camp="remove"><strong>カードを1枚外す</strong><span>好きな1枚をデッキから除く。回復はしない。</span></button></div>`);
    if (s.phase === 'remove') return wrap('MAKE ROOM FOR YOUR PLAN', 'どの一枚を、置いていく？', '<p>同じ名前が複数あっても、外すのは1枚だけです。</p><div class="reward-grid four">'+game.removeOptions().map(id=>choiceCard(id,`data-remove="${id}"`)).join('')+'</div>',button('cancelRemove','支度に戻る','quiet'));
    if (s.phase === 'evolve') return wrap('ONE PAGE, REWRITTEN', 'どの一枚を、育てよう？', '<p>手持ちの未進化カードから選びます。同じ名前が複数あっても進化するのは1枚だけ。</p><div class="reward-grid four">' + game.upgradeOptions().map(id => choiceCard(id + '+', `data-evolve="${id}"`).replace('進化済み · ', '進化後 · ').replace('</button>', `<span class="evolution-before"><b>進化前</b>${card(id).text}</span></button>`)).join('') + '</div>', button('cancelEvolve', '支度に戻る', 'quiet'));
    if (s.phase === 'ready') {
      const next = s.battle === 1 ? ENEMIES[s.route === 'moon' ? 'wraith' : 'stone'] : s.battle === 2 ? ENEMIES.trial : s.battle === 3 ? ENEMIES[s.chapter2Encounter] : s.battle===4 ? ENEMIES.elite : ENEMIES.moth;
      return wrap('THE NEXT CHAPTER', '次の戦闘へ', ShinkaJourney.ready(s,next,card), button('next', `第${s.battle + 1}/${RUN_LENGTH}戦へ →`));
    }
    const replay = button('replay', growth ? '同じ山札で、もう一度' : '同じ番号で成長試遊へ') + button('newRun', '別の山札で旅する', 'quiet');
    const recap = `${stats(s)}<ol class="recap">${s.history.map(h => `<li><b>${h.enemy}</b><span>${h.turns}ターン · 残りHP${h.hp}${h.result === 'defeat' ? ' · 敗北' : ''}</span></li>`).join('')}</ol><p>${ORIGINS[s.origin].name} / ${s.route === 'forge' ? '雷の工房' : s.route === 'moon' ? '月の泉' : '道の途中'}${s.route2?` / ${{library:'星図の書庫',wind:'雷雲の渡り廊',causeway:'星渡りの回廊'}[s.route2]}`:''}<br>報酬：${s.rewards.map(id => card(id).name).join(' → ') || 'なし'}<br>進化：${s.upgrades.map(id=>card(id).name).join(' / ')||'なし'}<br>天球儀：${s.relics.map(id=>RELICS[id].name).join(' / ')||'なし'}<br>外したカード：${s.removed.map(id=>card(id).name).join(' / ')||'なし'}</p><p class="muted">プレイ番号 ${runCode()}。保存済みなら、この記録も「続きから」で見られます。</p>`;
    if (s.phase === 'complete') return wrap('THE LANTERN STILL GLOWS', '夜の向こうに、灯りが残った。', `<p class="lead">${{ frost: '凍てつく静けさで、迷宮を渡った。', storm: 'ひとすじの雷が、夜の扉を開いた。', mirror: '返した光が、帰り道を照らした。' }[s.origin]}</p>${recap}<p>次は別の護符か、別の道か。選び直すための、小さな物語。</p>`, replay);
    return wrap('THE TALE IS NOT OVER', '灯りが、ひと休み。', `<p>${ENEMIES[s.enemyId].lesson}</p>${recap}<p>同じ山札なら、選ぶ順番を変えて試せます。</p>`, replay);
  }
  function render() {
    uiRevision++;
    $('#handPanelHome').append(panel);
    const s = game.snapshot(); ENEMIES = enemiesFor(s); const e = ENEMIES[s.enemyId], a = game.intent(); story.dataset.phase=s.phase;
    $('#heroHp').textContent = `${s.hp} / ${s.maxHp}`; $('#enemyHp').textContent = `${s.enemyHp} / ${s.enemyMaxHp}`;
    $('#heroFill').style.width = `${s.hp / s.maxHp * 100}%`; $('#enemyFill').style.width = `${s.enemyHp / s.enemyMaxHp * 100}%`;
    $('#heroMeter').setAttribute('aria-valuenow', s.hp); $('#heroMeter').setAttribute('aria-valuemax',s.maxHp); $('#enemyMeter').setAttribute('aria-valuenow', s.enemyHp); $('#enemyMeter').setAttribute('aria-valuemax', s.enemyMaxHp);
    $('#enemyName').textContent = e.name; $('#enemyArt').alt = e.name;
    const image = $('#enemyImages').content.querySelector(`[data-art="${e.art}"]`).getAttribute('src'); if ($('#enemyArt').getAttribute('src') !== image) $('#enemyArt').setAttribute('src', image);
    $('#enemyPuppet').classList.toggle('moth', s.enemyId === 'moth'); $('#enemyPuppet').classList.toggle('watcher',e.art==='bowWatcher'); $('#enemyPuppet').classList.toggle('bell',e.art==='bellSpirit'); $('#enemyPuppet').classList.toggle('tide-sentinel',e.art==='tideStarSentinel'); $('.stage').classList.toggle('causeway-stage',s.route2==='causeway'&&s.battle>=4);
    $('#planningStatus').textContent = [`前ターン0：${s.prevEndEmpty?'成立':'なし'}`,s.pendingFocus?`次ターン攻撃＋${s.pendingFocus}予約`:'',s.pendingBlock?`次ターン防御${s.pendingBlock}予約`:''].filter(Boolean).join(' / ');
    $('#planningStatus').classList.toggle('empty-status',!s.prevEndEmpty&&!s.pendingFocus&&!s.pendingBlock);const planningLabel=$('#planningStatus').textContent;$('#planningStatus').setAttribute('aria-label',planningLabel);$('#planningStatus').innerHTML=`<span class="status-full">${planningLabel}</span><span class="status-short" aria-hidden="true">${s.prevEndEmpty?'前0○ ':''}${s.pendingFocus||s.pendingBlock?'次':''}${s.pendingFocus?'攻＋'+s.pendingFocus:''}${s.pendingBlock?'防'+s.pendingBlock:''}</span>`;
    $('#relicStatus').hidden=!s.relics.length;$('#relicStatus').innerHTML=s.relics.map(id=>`<span title="${RELICS[id].effect}">${RELICS[id].name} · ${s.relicUsed[id]?'使用済':'未使用'}</span>`).join('');
    const future=game.futureIntents(); $('#futureIntent').setAttribute('aria-label','先の敵行動の基本値。'+future.map((a,i)=>`${i?'その次':'次ターン'}、${a.label}：${a.detail}`).join(' ')); $('#futureIntent').hidden=!future.length; $('#futureIntent').innerHTML=future.map((a,i)=>`<span title="${a.label}：${a.detail}" aria-label="${i?'その次':'次ターン'}、${a.label}：${a.detail}">${i?'次々':'次'} ${a.type==='attack'?futurePower(a):a.heal?`回復最大${a.heal}`:'休み'}</span>`).join(' → ')+'<small>基本値・条件で変化</small>'+`<span class="future-compact" aria-hidden="true">${future.map((a,i)=>`${i?'次々':'次'} ${a.type==='attack'?compactFuturePower(a):a.heal?'回復'+a.heal:'休み'}`).join(' → ')}（基本値）</span>`;
    $('#heroStatus').textContent = `ブロック ${s.block}${s.focus ? ` · 次の攻撃＋${s.focus}` : ''}${s.reflect ? ` · 反射${s.reflect}` : ''}`;
    $('#heroStatus').classList.toggle('empty-status',!s.block&&!s.focus&&!s.reflect);const statusLabel=$('#heroStatus').textContent;$('#heroStatus').setAttribute('aria-label',statusLabel);$('#heroStatus').innerHTML=`<span class="status-full">${statusLabel}</span><span class="status-short" aria-hidden="true">防 ${s.block}${s.focus?' · 攻＋'+s.focus:''}${s.reflect?' · 反'+s.reflect:''}</span>`;
    $('#charm').textContent = `${ORIGINS[s.origin].symbol} ${ORIGINS[s.origin].name}${s.forge ? ' ＋ 雷の針' : ''}`; $('#charm').title = ORIGINS[s.origin].effect + (s.forge ? '毎ターン最初の攻撃＋2。' : '');
    $('#roomName').textContent = s.battle<=3 ? '第1章 · 星見塔の入口' : s.route2==='causeway'?'第2章 · 星渡りの回廊':'第2章 · 蒼星の回廊'; $('#round').textContent = `第${s.battle}/${RUN_LENGTH}戦 · ターン${s.turn}`;
    $('#intentName').textContent = a.label + (a.type === 'attack' ? ` ${a.perHit}${a.hits > 1 ? `×${a.hits}` : ''}` : ''); $('#intentText').setAttribute('aria-label',a.detail);const currentMove=e.moves[(s.turn-1)%e.moves.length],baseReduced=`${(currentMove.power||0)-(currentMove.reduction||0)}${a.hits>1?`×${a.hits}`:''}`;const compactIntent=a.type==='recover'?(a.heal?`敵HP＋${a.heal}`:'攻撃なし'):`被害 ${a.hpLoss}${a.reflected?` · 反射${a.reflected}`:''}${a.manaCondition?` · 魔力${a.manaCondition==='bank'?'2以上':'0'}で${currentMove.power}→${currentMove.power-currentMove.manaReduction}${a.manaConditionMet?' ○':''}`:''}${a.threshold?` · ${a.broken?'崩し成功':a.breakKind==='single'?`一撃${a.threshold}で基本${baseReduced}`:a.breakKind==='count'?`攻撃${a.progress}/${a.threshold}で基本${baseReduced}`:`あと${a.remaining}で基本${baseReduced}`}`:''}`;$('#intentText').innerHTML=`<span class="status-full">${a.detail}</span><span class="status-short" aria-hidden="true">${compactIntent}</span>`;
    $('#intent').classList.toggle('calm', a.type === 'recover'); $('#intent').classList.toggle('broken', Boolean(a.broken||a.manaConditionMet));
    $('#breakTrack').hidden = !a.threshold; $('#breakFill').style.width = `${a.threshold ? a.progress / a.threshold * 100 : 0}%`;
    $('#energyRule').textContent = `次＋${manaRegenFor(s)} / 上限5`;
    $('#rulesSource [data-starter-rule]').textContent = isGrowthRun(s) ? `この旅の基本2種は魔力${card('basicStrike').cost}。` : 'この旅は以前の護符別デッキとルールです。';
    $('#rulesSource [data-mana-rule]').textContent = `各戦闘の最初は魔力2。2ターン目から＋${manaRegenFor(s)}され、余った魔力は持ち越します。上限5。戦闘が変わると2に戻ります。星渡りの回廊を選んだ第4〜6戦だけは3で始まります。最初のターンに追加の回復はありません。`;
    $('#energy').textContent = s.energy; $('#drawCount').textContent = s.draw.length; $('#discardCount').textContent = s.discard.length; $('#exhaustCount').textContent = s.exhaust.length;
    $('#deckButton').textContent = `デッキ ${s.deck.length}枚`; $('#endTurn').disabled = s.phase !== 'battle'; $('#restart').disabled = s.phase === 'intro';
    $('#battleLog').textContent = s.log[0]; $('#runCode').textContent = `04.17 · ${s.ruleset === 'growth-v2' ? '基本1コスト' : isGrowthRun(s) ? '旧成長試遊' : '旧ルール'} · ${runCode()}`; $('#saveStatus').textContent = saveMessage;
    const usable = s.hand.some(id => card(id).cost <= s.energy);
    $('#handHint').textContent = !usable && s.phase === 'battle' ? '魔力を持ち越してターン終了 →' : `手札${s.hand.length}枚 · 横に動かせます / タップで選択`;
    $('#handHint').textContent += ` / 前攻撃${s.prevLastAttack}${s.usedExhaustThisTurn?' / 消滅済':''}`;
    $('#hand').innerHTML = s.hand.map((id, i) => `<div class="hand-item ${card(id).upgraded ? 'upgraded' : ''}"><button type="button" class="card ${card(id).upgraded ? 'upgraded' : ''} ${card(id).cost>s.energy?'unaffordable':''}" data-card="${i}" ${s.phase !== 'battle' ? 'disabled' : ''} aria-label="${accessibleCard(id, game.previewCard(i))}">${cardFace(id, game.previewCard(i))}</button></div>`).join('');
    renderSelection();
    const step = s.battle>=6 ? 4 : s.battle>=4 || s.phase==='chapter' ? 3 : s.battle>=2 || ['route','ready'].includes(s.phase) ? 2 : 1;
    document.querySelectorAll('[data-step]').forEach(el => { el.classList.toggle('current', Number(el.dataset.step) === step); el.classList.toggle('past', Number(el.dataset.step) < step); });
    if (s.phase === 'battle') {
      const entering = modalKey !== 'battle'; if (story.open) story.close(); modalKey = 'battle';
      if (entering) ($('#hand button:not(:disabled)') || $('#endTurn')).focus({ preventScroll: true });
    } else {
      const key = s.phase + (s.phase === 'intro' ? ':' + s.origin : '');
      if (key !== modalKey) {
        $('#storyBody').innerHTML = storyContent(s); window.ShinkaLayout?.refresh(); if (!story.open) story.showModal(); modalKey = key;
        (story.querySelector('[data-origin][aria-pressed="true"], [data-reward], [data-route], [data-sanctuary], [data-evolve], .primary') || story.querySelector('button'))?.focus();
      }
    }
  }
  function animate(selector, name) { const el = $(selector); el.classList.remove('cast', 'hit', 'guard'); void el.offsetWidth; el.classList.add(name); el.addEventListener('animationend', () => el.classList.remove(name), { once: true }); }
  function act(fn, kind = '') {
    if (performance.now() < lockedUntil) return false;
    const before = game.snapshot(), beforeIntent = game.intent(); if (!fn()) return false; inspectedIndex=null; inspectedId=null; lockedUntil = performance.now() + 190; render(); persist();
    const after = game.snapshot();
    if (kind === 'card') { animate('#heroPuppet', after.enemyHp < before.enemyHp ? 'cast' : 'guard'); if (after.enemyHp < before.enemyHp) animate('#enemyPuppet', 'hit'); }
    if (kind === 'turn') {
      if (after.hp < before.hp) animate('#heroPuppet', 'hit');
      else if (beforeIntent.type === 'attack') animate('#heroPuppet', 'guard');
      if (before.phase === 'battle') animate('#enemyPuppet', beforeIntent.type === 'attack' ? 'cast' : 'guard');
    }
    return true;
  }
  function resetGame(newSeed = false) {
    const origin = game.snapshot().origin;
    if (newSeed) { const next = Math.floor(Math.random() * 0x100000000) >>> 0; seed = next === seed ? (seed + 1) >>> 0 : next; }
    game = createGame(seededRandom(seed)); game.selectOrigin(origin); pendingSave = null; hadStoredSave = false; modalKey = ''; return true;
  }
  $('#hand').addEventListener('click', ev => {
    const b = ev.target.closest('[data-card]'); if (!b || game.snapshot().phase !== 'battle') return;
    const index=Number(b.dataset.card);
    if(inspectedIndex===index){if(!window.ShinkaFan?.isKeyboard())dismissSelection(true);return;}
    inspectedIndex=index; inspectedId=game.snapshot().hand[index]; renderSelection(); b.focus({preventScroll:true});

  });
  $('.stage').addEventListener('click',ev=>{if(!ev.target.closest('button,a,input,summary'))dismissSelection(false);});
  $('.table').addEventListener('click',ev=>{if(ev.target.matches('.table,.hand,.hand-label'))dismissSelection(false);});
  $('#cancelCard').addEventListener('click',()=>dismissSelection(true));
  document.addEventListener('shinka:handpage',()=>dismissSelection(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && inspectedIndex!==null && !document.querySelector('dialog[open]')){event.preventDefault();dismissSelection(true);}});
  $('#playCard').addEventListener('click',()=>{const s=game.snapshot();if(inspectedIndex===null||s.phase!=='battle'||s.hand[inspectedIndex]!==inspectedId)return;const i=inspectedIndex;if(act(()=>game.play(i),'card')&&game.snapshot().phase==='battle')($('#hand .hand-item:not([hidden]) button:not(.unaffordable)')||$('#endTurn')).focus({preventScroll:true});});
  $('#endTurn').addEventListener('click', () => act(game.endTurn, 'turn'));
  story.addEventListener('cancel', ev => ev.preventDefault());
  story.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b || b.disabled) return;
    for (const [key, fn] of [['origin', game.selectOrigin], ['reward', game.chooseReward], ['route', game.chooseRoute], ['sanctuary', game.chooseSanctuary], ['relic',game.chooseRelic], ['evolve', game.evolve], ['chapter',game.chooseChapter],['camp',game.chooseCamp],['remove',game.removeCard]]) {
      if (b.dataset[key] !== undefined) { act(() => fn(b.dataset[key])); return; }
    }
    const action = b.dataset.action; if (action === 'askRestart') { restart.showModal(); return; }
    const actions = { start: ()=>{pendingSave=null;hadStoredSave=false;return game.start();}, resume:()=>{if(!pendingSave)return false;const ok=game.restoreSave(pendingSave.engine);if(ok){seed=pendingSave.seed;pendingSave=null;hadStoredSave=false;modalKey='';}return ok;}, reward: game.openReward, skipReward:()=>game.chooseReward(null), next: game.nextBattle, cancelRelic:game.cancelRelic, cancelEvolve: game.cancelEvolution, cancelRemove:game.cancelRemoval, replay: () => resetGame(), newRun: () => resetGame(true) };
    if (actions[action]) act(actions[action]);
  });
  $('#restart').addEventListener('click', () => restart.showModal()); $('#cancelRestart').addEventListener('click', () => restart.close());
  $('#confirmRestart').addEventListener('click', () => { restart.close(); resetGame(); lockedUntil = 0; render(); persist(); });
  $('#deckButton').addEventListener('click', () => {
    const s = game.snapshot(), counts = s.deck.reduce((n, id) => ({ ...n, [id]: (n[id] || 0) + 1 }), {});
    $('#deckList').innerHTML = `<p>${ORIGINS[s.origin].name}：${ORIGINS[s.origin].effect}${s.forge ? '<br>雷の針：毎ターン最初の攻撃＋2。' : ''}</p>` + s.relics.map(id=>`<p>天球儀：${RELICS[id].name} — ${RELICS[id].effect} ${s.relicUsed[id]?'この戦闘は使用済。':'この戦闘は未使用。'}</p>`).join('') + Object.entries(counts).map(([id, n]) => `<div><strong>${card(id).name} ×${n}</strong><small>魔力${card(id).cost} · ${card(id).text}</small></div>`).join(''); deck.showModal();
  });
  $('#closeDeck').addEventListener('click', () => { deck.close(); $('#settingsButton').focus({preventScroll:true}); });
  $('#catalogButton').addEventListener('click',()=>{ $('#catalogList').innerHTML=Object.keys(CARDS).map(id=>`<article class="catalog-card">${cardFace(id)}</article>`).join('');$('#catalogDialog').showModal();});
  $('#closeCatalog').addEventListener('click',()=>$('#catalogDialog').close());
  $('#helpButton').addEventListener('click',()=>{$('#helpBody').innerHTML=$('#rulesSource > div').innerHTML;$('#helpDialog').showModal();});
  $('#closeHelp').addEventListener('click',()=>$('#helpDialog').close());
  $('#forgetSave').addEventListener('click',()=>$('#forgetDialog').showModal());
  $('#cancelForget').addEventListener('click',()=>$('#forgetDialog').close());
  $('#confirmForget').addEventListener('click',()=>{try{localStorage.removeItem(SAVE_KEY);localStorage.removeItem(BACKUP_KEY);localStorage.removeItem(ORIGINAL_BACKUP_KEY);storageReadFailed=false;migrationRaw=null;pendingSave=null;hadStoredSave=false;saveMessage='保存を削除しました';}catch{saveMessage='保存を削除できません';}$('#saveStatus').textContent=saveMessage;$('#forgetDialog').close();});
  $('#continuePortrait').addEventListener('click',()=>document.body.classList.add('portrait-accepted'));
  window.ShinkaFan?.bind({
    capture(index){const s=game.snapshot(),c=game.previewCard(index);if(s.phase!=='battle'||!Number.isInteger(index)||!s.hand[index]||!c)return null;return {phase:s.phase,index,id:s.hand[index],revision:uiRevision,affordable:c.cost<=s.energy&&performance.now()>=lockedUntil};},
    select(index){const s=game.snapshot();if(s.phase!=='battle'||!Number.isInteger(index)||!s.hand[index])return false;inspectedIndex=index;inspectedId=s.hand[index];renderSelection();return true;},
    dismiss(){dismissSelection(false);},
    commit(c){const s=game.snapshot();if(document.querySelector('dialog[open]')||s.phase!=='battle'||uiRevision!==c.revision||s.hand[c.index]!==c.id)return false;return act(()=>game.play(c.index),'card');}
  });
  render();
})();
