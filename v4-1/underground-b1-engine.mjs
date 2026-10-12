// Isolated B1 playtest. Never reads or changes existing game saves.
export const CARDS = Object.freeze({
 bolt:{name:"魔弾",cost:1,kind:"attack",text:"6ダメージ",damage:6,magicArt:"starter-bolt"},
 lightning:{name:"雷撃",cost:2,kind:"attack",text:"13ダメージ",damage:13,magicArt:"starter-lightning"},
 scatter:{name:"散弾",cost:1,kind:"all",text:"敵全体に6ダメージ",damage:6},
 chain:{name:"連鎖雷",cost:1,kind:"attack",text:"5ダメージ。先に攻撃していれば＋6",damage:5,chain:true},
 heal:{name:"小治癒",cost:1,kind:"heal",text:"HP6回復。廃棄",heal:6,exhaust:true},
 drain:{name:"吸命",cost:2,kind:"attack",text:"8ダメージ。HP3回復。廃棄",damage:8,heal:3,exhaust:true},
 frost:{name:"氷の矢",cost:1,kind:"attack",text:"3ダメージ。弱体2を付与",damage:3,weaken:2,magicArt:"starter-frost"},
 poison:{name:"毒の印",cost:1,kind:"poison",text:"毒5を付与（敵ターンに発動・毎回−1）",poison:5},
 fragile:{name:"脆弱の印",cost:1,kind:"fragile",text:"脆弱2を付与（攻撃被害＋50％）",vulnerable:2},
 guard:{name:"守り",cost:1,kind:"guard",text:"防御5",block:5,magicArt:"starter-guard"},
 break:{name:"破魔雷",cost:2,kind:"attack",text:"8ダメージ。脆弱2を付与",damage:8,vulnerable:2},
 strength:{name:"闘魔の印",cost:1,kind:"power",text:"この戦闘中、攻撃威力＋2",strengthGain:2},
 spark:{name:"火花",cost:0,kind:"attack",text:"3ダメージ",damage:3},
 fireSmall:{name:"火弾",cost:1,kind:"attack",text:"敵1体に6ダメージ",damage:6,fireArt:"small",firePower:1},
 fireMedium:{name:"灼流",cost:2,kind:"attack",text:"敵1体に10ダメージ",damage:10,fireArt:"medium",firePower:2},
 fireLarge:{name:"獄炎砲",cost:3,kind:"attack",text:"敵1体に16ダメージ",damage:16,fireArt:"large",firePower:3},
 fireWaveSmall:{name:"火の雨",cost:0,kind:"all",text:"敵全体に2ダメージ",damage:2,magicArt:"fire-rain-small"},
 fireWaveMedium:{name:"炎の波",cost:2,kind:"all",text:"敵全体に9ダメージ",damage:9,magicArt:"fire-rain-medium"},
 fireWaveLarge:{name:"業火の嵐",cost:3,kind:"all",text:"敵全体に15ダメージ",damage:15,magicArt:"fire-rain-large"},
 thunderSmall:{name:"雷針",cost:1,kind:"attack",text:"敵1体に7ダメージ",damage:7,magicArt:"thunder-small"},
 thunderMedium:{name:"双雷槍",cost:2,kind:"multi",text:"敵1体に7ダメージを2回",damage:7,hits:2,magicArt:"thunder-medium"},
 thunderLarge:{name:"天雷",cost:3,kind:"attack",text:"敵1体に21ダメージ",damage:21,magicArt:"thunder-large"},
 flow:{name:"術式循環",cost:1,kind:"draw",text:"カードを2枚引く",draw:2},
 ward:{name:"氷の結界",cost:1,kind:"guard",text:"防御7。カードを1枚引く",block:7,draw:1},
 charge:{name:"魔力点火",cost:0,kind:"energy",text:"魔力＋1。廃棄",energyGain:1,exhaust:true},
 double:{name:"双雷",cost:1,kind:"multi",text:"4ダメージを2回",damage:4,hits:2},
 focus:{name:"魔導の研究",cost:1,kind:"power",text:"この戦闘中、毎ターンのドロー＋1",powerDraw:1},
 flare:{name:"毒炎",cost:1,kind:"attack",text:"6ダメージ。毒の敵なら＋6",damage:6,poisonBonus:6},
 frostBreak:{name:"霜砕き",cost:1,kind:"attack",text:"5ダメージ。弱体の敵には＋7",damage:5,weakBonus:7},
 echoGuard:{name:"返響の盾",cost:1,kind:"guard",text:"防御4。先に攻撃していれば2枚引く",block:4,afterAttackDraw:2,magicArt:"starter-defense"},
 lingeringPoison:{name:"余毒の頁",cost:1,kind:"poison",text:"毒2を付与。対象がすでに毒なら2枚引く",poison:2,poisonDraw:2},
 darkBolt:{name:"闇弾",cost:1,kind:"attack",text:"5ダメージ。1枚引く",damage:5,draw:1,magicArt:"dark",school:"dark"},
 abyssBolt:{name:"奈落弾",cost:2,kind:"attack",text:"敵1体に12ダメージ",damage:12,magicArt:"abyss",school:"dark"},
 iceSpear:{name:"氷槍",cost:2,kind:"attack",text:"10ダメージ。弱体2を付与",damage:10,weaken:2,magicArt:"ice"},
 arcaneLance:{name:"魔力槍",cost:1,kind:"attack",text:"敵1体に8ダメージ",damage:8,magicArt:"arcane"},
 mentalCollapse:{name:"精神崩壊",cost:2,kind:"confuse",text:"敵1体が次の2回の攻撃で敵味方をランダムに狙う",confusionAttacks:2,school:"dark",magicArt:"mental-collapse"},
 curse:{name:"呪い",cost:1,kind:"curse",text:"敵1体に呪いを付与。1→2→3ダメージ（3ターン）。重ねがけ可",curseTurns:3,school:"dark",magicArt:"curse"},
 deathSong:{name:"死の歌声",cost:3,kind:"all",text:"敵全体に7ダメージ。混乱中の敵には＋6",damage:7,confusionBonus:6,school:"dark",magicArt:"death-song"},
 hallucination:{name:"幻覚",cost:1,kind:"hallucinate",text:"敵1体の次の2回の攻撃が50％で失敗",hallucinationAttacks:2,school:"dark",magicArt:"hallucination"},
 shadowEcho:{name:"影の反響",cost:1,kind:"attack",text:"4ダメージ。先に闇魔法を使っていれば2枚引く",damage:4,drawAfterDark:2,school:"dark",magicArt:"shadow"},
 blizzard:{name:"吹雪",cost:2,kind:"all",text:"敵全体に5ダメージ。弱体1を付与",damage:5,weaken:1,magicArt:"blizzard"},
 thunderSurge:{name:"雷の奔流",cost:2,kind:"all",text:"敵全体に4ダメージ。先に使った攻撃1回につき＋3（最大3回）",damage:4,perAttack:3,maxPriorAttacks:3,magicArt:"surge"},
 guideThrust:{name:"導魔突き",cost:1,kind:"attack",text:"5ダメージ。次の魔法攻撃＋4",damage:5,nextMagicBonus:4,weapon:true,magicArt:"guide"},
 spellblade:{name:"魔装斬",cost:1,kind:"attack",text:"7ダメージ。先に呪文を使っていれば防御4",damage:7,blockAfterSpell:4,weapon:true,magicArt:"starter-attack"},
 bludgeon:{name:"殴打",cost:1,kind:"attack",text:"5ダメージ。手札に魔法がなければ7",damage:5,noMagicDamage:7,weapon:true,magicArt:"physical-bludgeon"},
 rapidPunch:{name:"連続殴打",cost:2,kind:"multi",text:"6ダメージ×2。手札に魔法がなければ8×2",damage:6,noMagicDamage:8,hits:2,weapon:true,magicArt:"physical-rapid"},
 heavyBlow:{name:"強打",cost:2,kind:"attack",text:"12ダメージ。手札に魔法がなければ16",damage:12,noMagicDamage:16,weapon:true,magicArt:"physical-heavy"},
 sneakHit:{name:"急襲",cost:0,kind:"attack",text:"4ダメージ。手札に魔法がなければ1枚引く",damage:4,emptyMagicDraw:1,weapon:true,magicArt:"physical-sneak"},
 ironHammer:{name:"鉄槌",cost:3,kind:"attack",text:"20ダメージ。デッキに魔法があると使用不可",damage:20,requiresPureDeck:true,weapon:true,magicArt:"physical-hammer"},
 doping:{name:"ドーピング",cost:1,kind:"physicalPower",text:"物理攻撃＋2。魔法を使うと解除",doping:2,weapon:true,magicArt:"physical-doping"},
 adversity:{name:"逆境",cost:1,kind:"adversity",text:"直前の敵ターンに失ったHP分、次の物理攻撃＋。魔法で解除",weapon:true,magicArt:"physical-adversity"},
 rage:{name:"逆鱗",cost:3,kind:"all",text:"敵全体に10ダメージ。HPが最大HPの1/3以下なら20",damage:10,lowHpDamage:20,weapon:true,magicArt:"physical-rage"},
 dragonEgg:{name:"竜の卵",cost:1,kind:"dragon",text:"竜を召喚。既にいるなら1段階成長。",art:"b1-dragon-egg.webp"},
 dragonFeed:{name:"竜の餌",cost:0,kind:"dragonFeed",text:"竜を1段階成長。手札を1枚選んで捨てる。廃棄",dragonGrowth:1,exhaust:true,art:"b1-dragon-feed.webp"},
 dragonBreath:{name:"竜息",cost:1,kind:"dragonBreath",text:"敵全体に4＋竜の段階×3ダメージ。",damage:4,dragonPowerPerStage:3,art:"b1-dragon-breath.webp"}
});
export function getB1Card(id){const up=typeof id==="string"&&id.endsWith("~"),base=up?id.slice(0,-1):id;const card=CARDS[base];if(!card)return null;if(!up)return card;const next={...card,name:card.name+"＋"};if(Object.hasOwn({fireSmall:3,fireMedium:4,fireLarge:6,darkBolt:3,abyssBolt:4,iceSpear:3,arcaneLance:3},base)){
 const bonus={fireSmall:3,fireMedium:4,fireLarge:6,darkBolt:3,abyssBolt:4,iceSpear:3,arcaneLance:3}[base];
 next.damage+=bonus;next.text=(base==="darkBolt"?next.damage+"ダメージ。1枚引く":base==="iceSpear"?next.damage+"ダメージ。弱体2を付与":"敵1体に"+next.damage+"ダメージ");return next;
 }
 if(Object.hasOwn({shadowEcho:3,blizzard:2,thunderSurge:2,guideThrust:3,spellblade:3},base)){
  const bonus={shadowEcho:3,blizzard:2,thunderSurge:2,guideThrust:3,spellblade:3}[base];
  next.damage+=bonus;
  next.text=base==="shadowEcho"?next.damage+"ダメージ。先に闇魔法を使っていれば2枚引く":
    base==="blizzard"?"敵全体に"+next.damage+"ダメージ。弱体1を付与":
    base==="thunderSurge"?"敵全体に"+next.damage+"ダメージ。先に使った攻撃1回につき＋3（最大3回）":
    base==="guideThrust"?next.damage+"ダメージ。次の魔法攻撃＋4":
    next.damage+"ダメージ。先に呪文を使っていれば防御4";
  return next;
 }
 if(Object.hasOwn({fireWaveSmall:2,fireWaveMedium:3,fireWaveLarge:4,thunderSmall:3,thunderLarge:5},base)){
  next.damage+=({fireWaveSmall:2,fireWaveMedium:3,fireWaveLarge:4,thunderSmall:3,thunderLarge:5})[base];
  next.text=(card.kind==="all"?"敵全体に":"敵1体に")+next.damage+"ダメージ";return next;
 }
 if(base==="thunderMedium"){next.damage=9;next.text="敵1体に9ダメージを2回";return next;}
 if(base==="mentalCollapse"){next.confusionAttacks=3;next.text="敵1体が次の3回の攻撃で敵味方をランダムに狙う";return next;}
 if(base==="curse"){next.curseTurns=4;next.text="敵1体に呪いを付与。1→2→3→4ダメージ（4ターン）。重ねがけ可";return next;}
 if(base==="deathSong"){next.damage=10;next.text="敵全体に10ダメージ。混乱中の敵には＋6";return next;}
 if(base==="hallucination"){next.hallucinationAttacks=3;next.text="敵1体の次の3回の攻撃が50％で失敗";return next;}
 if(Object.hasOwn({bludgeon:2,rapidPunch:2,heavyBlow:3,sneakHit:2,ironHammer:5,rage:3},base)){
  const inc={bludgeon:2,rapidPunch:2,heavyBlow:3,sneakHit:2,ironHammer:5,rage:3}[base];
  next.damage+=inc;
  if(next.noMagicDamage)next.noMagicDamage+=inc;
  if(next.lowHpDamage)next.lowHpDamage+=inc;
  next.text=base==="bludgeon"?next.damage+"ダメージ。手札に魔法がなければ"+next.noMagicDamage:
   base==="rapidPunch"?next.damage+"ダメージ×2。手札に魔法がなければ"+next.noMagicDamage+"×2":
   base==="heavyBlow"?next.damage+"ダメージ。手札に魔法がなければ"+next.noMagicDamage:
   base==="sneakHit"?next.damage+"ダメージ。手札に魔法がなければ1枚引く":
   base==="ironHammer"?next.damage+"ダメージ。デッキに魔法があると使用不可":
   "敵全体に"+next.damage+"ダメージ。HPが最大HPの1/3以下なら"+next.lowHpDamage;
  return next;
 }
 if(base==="doping"){next.doping=3;next.text="物理攻撃＋3。魔法を使うと解除";return next;}
 if(base==="adversity"){next.cost=0;next.text="直前の敵ターンに失ったHP分、次の物理攻撃＋。魔法で解除";return next;}
 if(base==="dragonFeed"){next.dragonGrowth=2;next.text="竜を2段階成長。手札を1枚選んで捨てる。廃棄";return next;}const stat=["damage","block","heal","poison","weaken","vulnerable","energyGain","draw","strengthGain","powerDraw"].find(k=>Number.isFinite(card[k])&&card[k]>0);if(stat){const bonus=["damage","block","heal"].includes(stat)?3:1;next[stat]+=bonus;next.text=card.text+"（"+stat+"＋"+bonus+"）";}else{next.cost=Math.max(0,card.cost-1);next.text=card.text+"（魔力－1）";}return next;}
export const PHYSICAL_STARTER = Object.freeze(["bludgeon","bludgeon","bludgeon","bludgeon","rapidPunch","rapidPunch","sneakHit","doping","ironHammer"]);
export const isB1Magic=id=>getB1Card(id)?.weapon!==true;
export const STARTER = Object.freeze(["bolt","bolt","bolt","bolt","guard","guard","guard","guard","break"]);
export const STAGES = Object.freeze([
 {name:"B1・入口",hint:"硬い敵を相手に攻撃するか防御するか。次の攻撃を予測しよう。",enemies:[{id:"rat",name:"石牙獣",maxHp:42,role:"rat"}],rewards:["ward","double","poison","spark","flow","heal","frost","shadowEcho","guideThrust"]},
 {name:"B1・群れ",hint:"小型2体の同時攻撃。片方を先に倒すか、全体攻撃で削るか。",enemies:[{id:"wolf",name:"洞穴の狼",maxHp:17,role:"wolf"},{id:"imp",name:"盾の小鬼",maxHp:16,role:"imp"}],rewards:["charge","chain","fragile","focus","flare","lightning","drain","scatter","blizzard"]},
 {name:"B1・祭壇",hint:"呪術師は初手で力を溜め、毎ターン強くなる。長期戦は危険。",enemies:[{id:"priest",name:"洞窟の呪術師",maxHp:52,role:"ritual"}],rewards:["flow","strength","double","poison","ward","flare","heal","lightning","spellblade"]},
 {name:"B1・強敵",hint:"強敵が大技と連続攻撃を使う。大技の予告を見て防御を合わせよう。",enemies:[{id:"brute",name:"深層の番兵",maxHp:82,role:"elite"}],rewards:["strength","focus","charge","double","flare","ward","drain","fragile","thunderSurge"]},
 {name:"B1・最深部",hint:"護衛2体と長期戦。護衛の守りを崩し、溜めた大技を乗り切ろう。",enemies:[{id:"left",name:"盾の小鬼・左",maxHp:24,role:"guard"},{id:"boss",name:"地底の祭司",maxHp:135,role:"boss"},{id:"right",name:"盾の小鬼・右",maxHp:24,role:"guard"}],rewards:[]}
]);
// First small map experiment: both routes rejoin the unchanged third fight.
export const B1_FORK_ROUTES=Object.freeze({
 pack:{name:"群れの坑道",hint:"洞穴の狼＋盾の小鬼。攻撃対象を選び、2体の動きを読む。",enemies:STAGES[1].enemies},
 stone:{name:"石甲の回廊",hint:"石甲の番獣1体。硬い防御を破るタイミングを考える。",enemies:[{id:"carapace",name:"石甲の番獣",maxHp:40,role:"carapace"}]}
});
// Reachable in principle: one starter pick (scatter) + one reward from each of four prior fights.
export const IDEAL_B1_BOSS_DECK=Object.freeze([...STARTER,"scatter","ward","focus","strength","charge"]);
// Alternate reachable 14-card benchmark: set up attack power, draw the combo, sweep guards, finish with chain lightning.
export const COMBO_B1_BOSS_DECK=Object.freeze([...STARTER,"scatter","flow","chain","strength","charge"]);
export const B1_BOSS_CHANNEL_THRESHOLD=24;
export const DRAGON_STAGES=Object.freeze(["卵","孵化","幼竜","成長期","小型竜","中型竜","大型竜","巨竜","神龍"]);
export const DRAGON_EVOLUTION_DAMAGE=Object.freeze([0,0,2,4,6,9,13,16,20]);
const clone=x=>JSON.parse(JSON.stringify(x));
export function createB1Game(options={}){
 let seed=(Number(options.seed)>>>0)||20261010;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const testMaxHp=Number.isInteger(options.maxHp)&&options.maxHp>=1&&options.maxHp<=999?options.maxHp:75;
 let s={dopingBonus:0,nextPhysicalAttackBonus:0,lastTurnHpLoss:0,dragonStage:-1,lastDragonEvolution:null,lastSynergy:null,phase:"starter",stage:0,turn:1,hp:testMaxHp,maxHp:testMaxHp,energy:3,block:0,attacksThisTurn:0,attackCardsThisTurn:0,darkCastsThisTurn:0,spellsThisTurn:0,pendingMagicAttackBonus:0,powerDraw:0,strength:0,selected:null,deck:Array.isArray(options.testDeck)&&options.testDeck.length>0&&options.testDeck.length<=30&&options.testDeck.every(id=>Object.hasOwn(CARDS,id))?[...options.testDeck]:[...STARTER],hand:[],draw:[],discard:[],exhaust:[],powers:[],enemies:[],rewards:[],gold:0,shopPending:false,shopUsed:false,shopPurchases:[],shopPurged:false,restPending:false,restUsed:false,restChoice:null,selectedPath:null,routeHistory:[],log:["最初に得意な魔法を1枚選んで地下迷宮へ。"]};
 function note(t){s.log.unshift(t);s.log=s.log.slice(0,18);}
 const alive=()=>s.enemies.filter(e=>e.hp>0);
 const find=id=>s.enemies.find(e=>e.id===id&&e.hp>0);
 function drawCards(n){let drawn=0;for(let i=0;i<n&&s.hand.length<10;i++){if(!s.draw.length){if(!s.discard.length)break;s.draw=shuffle(s.discard.splice(0));}s.hand.push(s.draw.pop());drawn++;}return drawn;}
 function start(){
  const stage=s.stage===1?B1_FORK_ROUTES[s.selectedPath||"pack"]:STAGES[s.stage];s.enemies=stage.enemies.map(e=>({...clone(e),hp:e.maxHp,weaken:0,poison:0,vulnerable:0,block:0,strength:0,channelDamage:0,channelBroken:false,confusionAttacks:0,hallucinationAttacks:0,curses:[]}));s.turn=1;s.block=0;s.energy=3;s.attacksThisTurn=0;s.attackCardsThisTurn=0;s.darkCastsThisTurn=0;s.spellsThisTurn=0;s.pendingMagicAttackBonus=0;s.powerDraw=0;s.strength=0;s.dopingBonus=0;s.nextPhysicalAttackBonus=0;s.lastTurnHpLoss=0;
  s.dragonStage=-1;s.lastDragonEvolution=null;s.lastSynergy=null;s.hand=[];s.discard=[];s.exhaust=[];s.powers=[];s.draw=shuffle([...s.deck]);s.selected=s.enemies.find(e=>e.role!=="boss")?.id||s.enemies[0].id;s.phase="battle";drawCards(5);note(stage.name+"：戦闘開始。");
 }
 function selectStarter(id){if(s.phase!=="starter"||!["physical","lightning","scatter","flow","dragonEgg","fireSmall","fireMedium","fireLarge","fireWaveSmall","fireWaveMedium","fireWaveLarge","thunderSmall","thunderMedium","thunderLarge","darkBolt","abyssBolt","mentalCollapse","curse","deathSong","hallucination","iceSpear","arcaneLance","shadowEcho","blizzard","thunderSurge","guideThrust","spellblade","bludgeon","rapidPunch","heavyBlow","sneakHit","ironHammer","doping","adversity","rage"].includes(id))return false;
  if(id==="physical")s.deck=[...PHYSICAL_STARTER];
  else if(id==="dragonEgg")s.deck.push("dragonEgg","dragonFeed","dragonBreath");else s.deck.push(id);
  start();return true;}
 function protectors(){return s.stage===STAGES.length-1?alive().filter(e=>e.role==="guard").length:0;}
 function recordBossDamage(e,n){
  if(e.role!=="boss"||n<=0||e.channelBroken||(s.turn-1)%4===3)return;
  e.channelDamage+=n;
  if(e.channelDamage>=B1_BOSS_CHANNEL_THRESHOLD){e.channelBroken=true;note("地底の祭司の詠唱が崩れた！ 地鳴りを阻止。");}
 }
 function hit(target,base,hits=1){
  if(!target||target.hp<=0)return 0;
  let total=0;
  for(let i=0;i<hits&&target.hp>0;i++){
   const armor=target.role==="boss"?protectors()*2:0;
   const boosted=target.vulnerable>0?Math.floor(base*1.5):base;
   const raw=Math.max(0,boosted-armor);
   const blocked=Math.min(target.block||0,raw);target.block-=blocked;
   const actual=Math.min(target.hp,raw-blocked);
   target.hp-=actual;total+=actual;recordBossDamage(target,actual);
  }
  note(target.name+"に合計"+total+"ダメージ"+(hits>1?"（"+hits+"回攻撃）":"")+"。");
  return total;
 }
 function growDragon(n=1){
  if(s.dragonStage<0)return false;
  const before=s.dragonStage;
  s.dragonStage=Math.min(DRAGON_STAGES.length-1,before+n);
  if(s.dragonStage===before)return false;
  const stage=s.dragonStage,power=DRAGON_EVOLUTION_DAMAGE[stage];
  note("竜が成長："+DRAGON_STAGES[stage]+"！");
  if(stage===1){s.block+=2;note("孵化した竜が防御2を与えた。");}
  const targetIds=power>0?dragonStrike(power,stage>=7,"進化の炎"):[];
  s.lastDragonEvolution={stage,name:DRAGON_STAGES[stage],power,targetIds};
  return true;
 }
 function dragonStrike(base,all,label="竜息"){
  const enemies=alive();
  if(!enemies.length)return [];
  const chosen=all?enemies:[enemies.find(e=>e.role!=="boss")||enemies[0]];
  const guardArmor=protectors()*2;
  for(const e of chosen){
   const boosted=e.vulnerable>0?Math.floor(base*1.5):base;
   const raw=Math.max(0,boosted-(e.role==="boss"?guardArmor:0));
   const blocked=Math.min(e.block,raw);e.block-=blocked;
   const dealt=Math.min(e.hp,raw-blocked);e.hp-=dealt;
   recordBossDamage(e,dealt);
   note(label+"："+e.name+"に"+dealt+"ダメージ。");
  }
  return chosen.map(e=>e.id);
 }
 function checkVictory(){
  if(alive().length>0)return false;
  if(s.stage===STAGES.length-1){s.phase="won";note("地下迷宮B1を突破！");}
  else{if(!s.practiceMode){s.gold+=s.stage===3?35:20;note("ゴールドを獲得。所持："+s.gold+"G。");}const healed=Math.min(6,s.maxHp-s.hp);s.hp+=healed;s.phase="reward";s.rewards=shuffle([...STAGES[s.stage].rewards]).slice(0,3);note("勝利！HPを"+healed+"回復。技を1枚覚えるか、見送ろう。");}
  return true;
 }
 function play(index,targetId){
  if(s.phase!=="battle"||!Number.isInteger(index)||index<0||index>=s.hand.length)return false;
  const id=s.hand[index],card=getB1Card(id);
  if(!card||s.energy<card.cost||(card.requiresPureDeck&&s.deck.some(isB1Magic)))return false;
  const targeted=["attack","multi","poison","fragile","confuse","curse","hallucinate"].includes(card.kind);
  if(card.kind==="dragonFeed"&&(s.dragonStage<0||!Number.isInteger(targetId)||targetId===index||targetId<0||targetId>=s.hand.length))return false;
  const target=targeted?find(targetId||s.selected):null;
  if(targeted&&!target)return false;
  s.lastSynergy=null;s.lastDragonEvolution=null;
  const synergy=(title,detail)=>{s.lastSynergy={cardId:id,title,detail};};
  s.hand.splice(index,1);
  s.energy-=card.cost;
  // The played physical card has left the hand before checking remaining magic.
  // Hand/deck magic classification uses the existing B1 weapon flag.
  const noMagicInHand=!s.hand.some(isB1Magic);
  const physical=card.weapon===true;
  const storedPhysicalBonus=physical&&(card.kind==="attack"||card.kind==="multi"||card.kind==="all")?s.nextPhysicalAttackBonus:0;
  if(storedPhysicalBonus)s.nextPhysicalAttackBonus=0;
  if(card.kind==="dragon"){
    if(s.dragonStage<0){s.dragonStage=0;note("竜の卵を召喚した。");}
    else growDragon(1);
   }else if(card.kind==="dragonFeed"){
    const removed=s.hand.splice(targetId>index?targetId-1:targetId,1)[0];
    s.discard.push(removed);
    growDragon(card.dragonGrowth);
    note("竜の餌："+getB1Card(removed).name+"を捨てた。");
   }else if(card.kind==="dragonBreath"){
    dragonStrike(card.damage+Math.max(0,s.dragonStage)*card.dragonPowerPerStage,true);
    s.attacksThisTurn++;
   }else if(card.kind==="attack"||card.kind==="multi"){
   const chainReady=Boolean(card.chain&&s.attacksThisTurn>0);
   const poisonReady=Boolean(card.poisonBonus&&target.poison>0);
   const weakReady=Boolean(card.weakBonus&&target.weaken>0);
   const magicBonus=card.weapon?0:s.pendingMagicAttackBonus;
    if(magicBonus){s.pendingMagicAttackBonus=0;synergy("導魔突き連携","次の魔法攻撃：威力＋"+magicBonus);}
    const printed=card.noMagicDamage&&noMagicInHand?card.noMagicDamage:card.damage;
    const base=printed+s.strength+magicBonus+(physical?s.dopingBonus:0)+(chainReady?6:0)+(poisonReady?card.poisonBonus:0)+(weakReady?card.weakBonus:0);
    // 逆境 is a one-time bonus per attack card, not once per repeated hit.
    if(storedPhysicalBonus&&card.hits>1){
     hit(target,base+storedPhysicalBonus,1);
     if(target.hp>0)hit(target,base,card.hits-1);
    }else hit(target,base+storedPhysicalBonus,card.hits||1);s.attacksThisTurn+=(card.hits||1);s.attackCardsThisTurn++;
   if(weakReady)synergy("霜砕き連携","弱体追撃：威力＋"+card.weakBonus);
   else if(poisonReady)synergy("毒炎連携","毒の敵へ：威力＋"+card.poisonBonus);
   else if(chainReady)synergy("連鎖雷連携","攻撃後：威力＋6");
    if(card.blockAfterSpell&&s.spellsThisTurn>0){s.block+=card.blockAfterSpell;note("魔装斬：防御＋"+card.blockAfterSpell+"。");synergy("魔装斬連携","先に呪文：防御＋"+card.blockAfterSpell);}
    if(card.nextMagicBonus){s.pendingMagicAttackBonus+=card.nextMagicBonus;note("次の魔法攻撃＋"+card.nextMagicBonus+"。");}
    if(card.drawAfterDark&&s.darkCastsThisTurn>0){
      const count=drawCards(card.drawAfterDark);
      note("影の反響：カードを"+count+"枚引いた。");
      synergy("闇魔法連携","闇の後：実際に"+count+"枚ドロー");
    }
   if(card.weaken&&target.hp>0){target.weaken+=card.weaken;note(target.name+"に弱体＋"+card.weaken+"。");}
   if(card.vulnerable&&target.hp>0){target.vulnerable+=card.vulnerable;note(target.name+"に脆弱＋"+card.vulnerable+"。");}
   if(card.emptyMagicDraw&&noMagicInHand){
     const amount=drawCards(card.emptyMagicDraw);note("急襲：魔法がないため"+amount+"枚引いた。");
     synergy("急襲連携","魔法なし："+amount+"枚ドロー");
   }
   if(card.heal){const n=Math.min(card.heal,s.maxHp-s.hp);s.hp+=n;note("HPを"+n+"回復。");}
  }else if(card.kind==="all"){
   const armor=protectors()*2;
   const printed=card.lowHpDamage&&s.hp*3<=s.maxHp?card.lowHpDamage:card.damage;
   const priorBonus=card.perAttack?Math.min(s.attackCardsThisTurn,card.maxPriorAttacks||3)*card.perAttack:0;
   const magicBonus=s.pendingMagicAttackBonus;
   if(magicBonus){s.pendingMagicAttackBonus=0;synergy("導魔突き連携","次の全体魔法：威力＋"+magicBonus);}
   if(priorBonus)synergy("雷の奔流連携","先行攻撃："+priorBonus+"ダメージ増");
   for(const e of alive()){
    const bonus=card.confusionBonus&&e.confusionAttacks>0?card.confusionBonus:0;
    const power=printed+s.strength+priorBonus+magicBonus+bonus+(physical?s.dopingBonus+storedPhysicalBonus:0);
    const base=e.vulnerable>0?Math.floor(power*1.5):power;
    const raw=Math.max(0,base-(e.role==="boss"?armor:0));
    const blocked=Math.min(e.block,raw);e.block-=blocked;
    const n=Math.min(e.hp,raw-blocked);
    e.hp-=n;recordBossDamage(e,n);note(e.name+"に"+n+"ダメージ。");
    if(card.weaken&&e.hp>0){e.weaken+=card.weaken;note(e.name+"に弱体＋"+card.weaken+"。");}
   }
   s.attacksThisTurn++;s.attackCardsThisTurn++;
  }else if(card.kind==="physicalPower"){
    s.dopingBonus+=card.doping;note("ドーピング：物理攻撃＋"+s.dopingBonus+"（魔法を使うと消失）。");
   }else if(card.kind==="adversity"){
    s.nextPhysicalAttackBonus+=s.lastTurnHpLoss;
    note("逆境：次の物理攻撃＋"+s.nextPhysicalAttackBonus+"（直前ターンのHP被害："+s.lastTurnHpLoss+"）。");
   }else if(card.kind==="confuse"){
    target.confusionAttacks+=card.confusionAttacks;note(target.name+"は混乱した（攻撃"+target.confusionAttacks+"回分）。");
   }else if(card.kind==="curse"){
    target.curses.push({next:1,turns:card.curseTurns});
    note(target.name+"に呪い（"+target.curses.length+"重）。");
   }else if(card.kind==="hallucinate"){
    target.hallucinationAttacks+=card.hallucinationAttacks;
    note(target.name+"は幻覚を見た（攻撃"+target.hallucinationAttacks+"回分、命中50％）。");
   }else if(card.kind==="heal"){
   const n=Math.min(card.heal,s.maxHp-s.hp);s.hp+=n;note("HPを"+n+"回復。");
  }else if(card.kind==="guard"){s.block+=card.block;note("防御＋"+card.block+"。");if(card.afterAttackDraw&&s.attacksThisTurn>0){const count=drawCards(card.afterAttackDraw);note("連携：カードを"+count+"枚引いた。");synergy("返響の盾連携","攻撃後：実際に"+count+"枚ドロー");}}
  else if(card.kind==="poison"){const alreadyPoisoned=target.poison>0;target.poison+=card.poison;note(target.name+"に毒＋"+card.poison+"。");if(card.vulnerable){target.vulnerable+=card.vulnerable;note(target.name+"に脆弱＋"+card.vulnerable+"。");}if(card.poisonDraw&&alreadyPoisoned){const count=drawCards(card.poisonDraw);note("連携：カードを"+count+"枚引いた。");synergy("余毒の頁連携","毒の敵から：実際に"+count+"枚ドロー");}}
  else if(card.kind==="fragile"){if(card.vulnerable){target.vulnerable+=card.vulnerable;note(target.name+"に脆弱＋"+card.vulnerable+"。");}if(card.weaken){target.weaken+=card.weaken;note(target.name+"に弱体＋"+card.weaken+"。");}}
  else if(card.kind==="energy"){s.energy+=card.energyGain;note("魔力＋"+card.energyGain+"。");}
  else if(card.kind==="power"){if(card.powerDraw){s.powerDraw+=card.powerDraw;note("毎ターンのドロー＋"+card.powerDraw+"。");}
   if(card.strengthGain){s.strength+=card.strengthGain;note("この戦闘中、攻撃威力＋"+card.strengthGain+"。");}}
  if(card.draw){drawCards(card.draw);note("カードを"+card.draw+"枚引いた。");}
  if(card.school==="dark")s.darkCastsThisTurn++;
  if(!card.weapon){
   s.spellsThisTurn++;
   if(s.dopingBonus||s.nextPhysicalAttackBonus)note("魔法を使ったためドーピング・逆境が解除された。");
   s.dopingBonus=0;s.nextPhysicalAttackBonus=0;
  }
  if(card.kind==="power")s.powers.push(id);else if(card.exhaust)s.exhaust.push(id);else s.discard.push(id);
  checkVictory();return true;
 }
 function intent(e){
  if(!e||e.hp<=0)return{kind:"none",label:"撃破"};
  const t=s.turn;
  if(e.role==="boss"){
   const n=(t-1)%4;
   return n===0?{kind:"rest",label:"溜め 1/2"}:
    n===1?{kind:"rest",label:"溜め 2/2"}:
    n===2?(e.channelBroken?{kind:"rest",label:"詠唱崩れ・地鳴り中断"}:{kind:"attack",label:"地鳴り 21",damage:21}):
    {kind:"rest",label:"疲労・隙"};
  }
  if(e.role==="rat"){
   const n=(t-1)%3;
   return n===0?{kind:"attack",label:"噛み砕く "+(9+e.strength),damage:9+e.strength}:
    n===1?{kind:"buff",label:"殻を固める（防御6・攻撃＋2）",blockGain:6,strengthGain:2}:
    {kind:"attack",label:"強打 "+(7+e.strength),damage:7+e.strength};
  }
  if(e.role==="carapace"){
    const n=(t-1)%3;
    return n===0?{kind:"buff",label:"石の外殻（防御8）",blockGain:8}:
      n===1?{kind:"attack",label:"岩の突進 11",damage:11}:
      {kind:"attack",label:"重い一撃 8",damage:8};
   }
   if(e.role==="wolf")return t===2?{kind:"buff",label:"遠吠え（攻撃＋2）",strengthGain:2}:
    {kind:"attack",label:"飛びかかり "+(6+e.strength),damage:6+e.strength};
  if(e.role==="imp"||e.role==="guard"){
   const busy=(t+(e.id==="right"?1:0))%2===0;
   return busy?{kind:"buff",label:"盾を構える（防御4）",blockGain:4}:
    {kind:"attack",label:"小突き 5",damage:5};
  }
  if(e.role==="ritual")return t===1?{kind:"buff",label:"闇の詠唱（毎ターン攻撃＋3）",ritualGain:3}:
    {kind:"attack",label:"呪詛 "+(6+e.strength),damage:6+e.strength,ritualGain:3};
  if(e.role==="elite"){
   const n=(t-1)%3;
   return n===0?{kind:"attack",label:"二連斬り "+(7+e.strength)+"×2",damage:7+e.strength,hits:2}:
    n===1?{kind:"buff",label:"武装強化（防御9・攻撃＋2）",blockGain:9,strengthGain:2}:
    {kind:"attack",label:"渾身の一撃 "+(16+e.strength),damage:16+e.strength};
  }
  return{kind:"attack",label:"攻撃 6",damage:6};
 }
 function endTurn(){
  if(s.phase!=="battle")return false;
  const hpBeforeEnemies=s.hp;
  s.lastSynergy=null;s.lastDragonEvolution=null;
  if(s.dragonStage>=0){
   // The final divine dragon retains its original every-turn breath at cap.
   if(!growDragon(1)&&s.dragonStage===DRAGON_STAGES.length-1)
    dragonStrike(DRAGON_EVOLUTION_DAMAGE[s.dragonStage],true,"神龍の炎");
   if(checkVictory())return true;
  }
  for(const e of [...s.enemies]){
   if(e.hp<=0)continue;
   // Poison hits before the enemy acts, even if charging, then weakens by 1.
   if(e.poison>0){
    const n=Math.min(e.poison,e.hp);e.hp-=n;recordBossDamage(e,n);e.poison=Math.max(0,e.poison-1);
    note(e.name+"は毒で"+n+"ダメージ。");
   }
   if(e.hp<=0)continue;
   // Independent curse stacks tick 1,2,3 damage (upgraded: 1..4) before enemy action.
   if(e.curses.length){
    const damage=e.curses.reduce((sum,curse)=>sum+curse.next,0);
    const dealt=Math.min(e.hp,damage);e.hp-=dealt;recordBossDamage(e,dealt);
    e.curses=e.curses.map(curse=>({next:curse.next+1,turns:curse.turns-1})).filter(curse=>curse.turns>0);
    note(e.name+"は呪いで"+dealt+"ダメージ。");
   }
   if(e.hp<=0)continue;
   // Enemy block is available during the player's turn; it expires on enemy action.
   e.block=0;
   const action=intent(e);
   if(action.kind==="attack"){
    // Confusion lasts for attack actions, including charged/buff rounds. Random choices
    // happen only for newly afflicted enemies, preserving old encounter RNG sequences.
    const hallucinating=e.hallucinationAttacks>0;
    if(hallucinating)e.hallucinationAttacks--;
    const confused=e.confusionAttacks>0;
    if(confused)e.confusionAttacks--;
    const candidates=confused?[null,...alive().filter(other=>other.id!==e.id)]:[null];
    const victim=confused?candidates[Math.floor(random()*candidates.length)]:null;
    const missed=hallucinating&&random()<.5; // once per action, including all multi-hits
    if(missed){note(e.name+"の"+action.label+"は幻覚で失敗した。");}
    else if(victim){
     const raw=e.weaken>0?Math.floor(action.damage*.75):action.damage;
     const dealt=hit(victim,raw,action.hits||1);
     note("混乱した"+e.name+"は味方の"+victim.name+"を攻撃（"+dealt+"ダメージ）。");
    }else{
     let total=0,totalBlocked=0;
     for(let hitNo=0;hitNo<(action.hits||1);hitNo++){
      const raw=e.weaken>0?Math.floor(action.damage*.75):action.damage;
      const blocked=Math.min(s.block,raw);s.block-=blocked;
      const harm=raw-blocked;s.hp=Math.max(0,s.hp-harm);
      total+=harm;totalBlocked+=blocked;
      if(s.hp<=0)break;
     }
     note(e.name+"の"+action.label+"：防御"+totalBlocked+"、HP被害"+total+(confused?"（混乱の矛先はあなた）":"")+"。");
     if(s.hp<=0){s.phase="lost";note("HPが0になった。再挑戦してみよう。");break;}
    }
   }else if(action.kind==="buff"){
    if(action.blockGain)e.block+=action.blockGain;
    if(action.strengthGain)e.strength+=action.strengthGain;
    note(e.name+"："+action.label+"。");
   }else note(e.name+"："+action.label+"。");
   if(action.ritualGain)e.strength+=action.ritualGain;
   if(e.role==="boss"&&(s.turn-1)%4===3){e.channelDamage=0;e.channelBroken=false;}
   e.weaken=Math.max(0,e.weaken-1);
   e.vulnerable=Math.max(0,e.vulnerable-1);
  }
  s.lastTurnHpLoss=Math.max(0,hpBeforeEnemies-s.hp);
  s.block=0;
  if(s.phase==="lost")return true;
  if(checkVictory())return true;
  s.discard.push(...s.hand.splice(0));s.turn++;s.energy=3;s.attacksThisTurn=0;s.attackCardsThisTurn=0;s.darkCastsThisTurn=0;s.spellsThisTurn=0;s.pendingMagicAttackBonus=0;
  drawCards(5+s.powerDraw);return true;
 }
 function chooseReward(id){
  if(s.phase!=="reward"||(id!==null&&!s.rewards.includes(id)))return false;
  if(id){s.deck.push(id);note(getB1Card(id).name+"を習得。");}else note("報酬は見送った。");
  s.phase="between";if(s.stage===1&&!s.practiceMode)s.restPending=true;if(s.stage===2&&!s.practiceMode)s.shopPending=true;return true;
 }
 function chooseRest(kind,index=null){
 if(s.phase!=="between"||s.stage!==1||!s.restPending||s.restUsed||s.practiceMode)return false;
 if(kind==="heal"){const amount=Math.min(15,s.maxHp-s.hp);s.hp+=amount;note("休憩所：HPを"+amount+"回復。");}
 else if(kind==="upgrade"){if(!Number.isInteger(index)||index<0||index>=s.deck.length||s.deck[index].endsWith("~"))return false;const id=s.deck[index];s.deck[index]=id+"~";note("休憩所："+getB1Card(id).name+"を強化。");}
 else return false;s.restPending=false;s.restUsed=true;s.restChoice=kind;return true;
}
const SHOP_STOCK=Object.freeze([{id:"ward",price:35},{id:"chain",price:40},{id:"frostBreak",price:35},{id:"echoGuard",price:30},{id:"lingeringPoison",price:30},{id:"fireSmall",price:25},{id:"fireMedium",price:40},{id:"fireLarge",price:55},{id:"fireWaveSmall",price:30},{id:"fireWaveMedium",price:45},{id:"fireWaveLarge",price:60},{id:"thunderSmall",price:30},{id:"thunderMedium",price:45},{id:"thunderLarge",price:60},{id:"darkBolt",price:35},{id:"abyssBolt",price:45},{id:"iceSpear",price:40},{id:"arcaneLance",price:35},{id:"mentalCollapse",price:50},{id:"curse",price:30},{id:"deathSong",price:60},{id:"hallucination",price:35},{id:"shadowEcho",price:35},{id:"blizzard",price:45},{id:"thunderSurge",price:50},{id:"guideThrust",price:35},{id:"spellblade",price:35},{id:"bludgeon",price:25},{id:"rapidPunch",price:45},{id:"heavyBlow",price:40},{id:"sneakHit",price:30},{id:"ironHammer",price:60},{id:"doping",price:40},{id:"adversity",price:35},{id:"rage",price:65}]);
function buyShop(id){
 if(s.phase!=="between"||s.stage!==2||!s.shopPending||s.shopUsed||s.practiceMode)return false;
 const item=SHOP_STOCK.find(item=>item.id===id);
 if(!item||s.gold<item.price||s.shopPurchases.includes(id))return false;
 s.gold-=item.price;s.deck.push(item.id);s.shopPurchases.push(item.id);
 note("商店："+getB1Card(item.id).name+"を"+item.price+"Gで購入。");return true;
}
function purgeShopCard(index){
 if(s.phase!=="between"||s.stage!==2||!s.shopPending||s.shopUsed||s.practiceMode||s.shopPurged||s.gold<30)return false;
 if(!Number.isInteger(index)||index<0||index>=s.deck.length||s.deck.length<=1)return false;
 const id=s.deck.splice(index,1)[0];s.gold-=30;s.shopPurged=true;
 note("商店："+getB1Card(id).name+"を削除（30G）。");return true;
}
function leaveShop(){
 if(s.phase!=="between"||s.stage!==2||!s.shopPending||s.shopUsed||s.practiceMode)return false;
 s.shopPending=false;s.shopUsed=true;note("商店を後にした。");return true;
}
function choosePath(id){
   if(s.phase!=="between"||s.stage!==0||s.selectedPath!==null||!Object.hasOwn(B1_FORK_ROUTES,id))return false;
   s.selectedPath=id;s.routeHistory.push(id);
   note("分岐を選択："+B1_FORK_ROUTES[id].name+"。");
   return true;
  }
  function nextBattle(){
   if(s.phase!=="between"||s.stage>=STAGES.length-1)return false;
   // Old scripted journeys still take the original encounter if no route was supplied.
   if(s.stage===0&&s.selectedPath===null)choosePath("pack");
   if(s.restPending){s.restPending=false;s.restUsed=true;s.restChoice="skipped";}if(s.shopPending){s.shopPending=false;s.shopUsed=true;}s.stage++;start();return true;
  }
 function snapshot(){
   const stage=s.stage===1?B1_FORK_ROUTES[s.selectedPath||"pack"]:STAGES[s.stage];
   return clone({...s,intents:s.enemies.map(e=>({id:e.id,...intent(e)})),
     stageName:s.stage===1?"B1・"+stage.name:stage.name,stageHint:stage.hint,
     shopAvailable:s.phase==="between"&&s.stage===2&&s.shopPending&&!s.practiceMode,
     shopStock:SHOP_STOCK,
     restAvailable:s.phase==="between"&&s.stage===1&&s.restPending&&!s.practiceMode,
      dragonName:s.dragonStage<0?null:DRAGON_STAGES[s.dragonStage],
      availablePaths:s.phase==="between"&&s.stage===0&&s.selectedPath===null?Object.keys(B1_FORK_ROUTES):[]});
  }
 function startBossPractice(mode="ideal"){
  if(s.phase!=="starter"||!(["ideal","baseline","combo"].includes(mode)||(mode==="test"&&Array.isArray(options.testDeck))))return false;
  s.practiceMode=mode;
  s.stage=STAGES.length-1;
  s.deck=mode==="ideal"?[...IDEAL_B1_BOSS_DECK]:mode==="combo"?[...COMBO_B1_BOSS_DECK]:mode==="test"?[...options.testDeck]:[...STARTER,"scatter"];
  s.hp=Math.min(s.maxHp,58);
  start();note("練習モード："+(mode==="combo"?"連鎖コンボ14枚":mode==="ideal"?"安定型14枚":mode==="test"?"検証用デッキ":"基本の10枚")+"でボスに挑戦。");
  return true;
 }
 return {snapshot,selectStarter,startBossPractice,play,endTurn,chooseReward,chooseRest,buyShop,purgeShopCard,leaveShop,choosePath,nextBattle};
}
