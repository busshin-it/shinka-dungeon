// Isolated B1 playtest. Never reads or changes existing game saves.
export const CARDS = Object.freeze({
 bolt:{name:"魔弾",cost:1,kind:"attack",text:"6ダメージ",damage:6},
 lightning:{name:"雷撃",cost:2,kind:"attack",text:"13ダメージ",damage:13},
 scatter:{name:"散弾",cost:1,kind:"all",text:"敵全体に6ダメージ",damage:6},
 chain:{name:"連鎖雷",cost:1,kind:"attack",text:"5ダメージ。先に攻撃していれば＋6",damage:5,chain:true},
 heal:{name:"小治癒",cost:1,kind:"heal",text:"HP6回復。廃棄",heal:6,exhaust:true},
 drain:{name:"吸命",cost:2,kind:"attack",text:"8ダメージ。HP3回復。廃棄",damage:8,heal:3,exhaust:true},
 frost:{name:"氷の矢",cost:1,kind:"attack",text:"3ダメージ。弱体2を付与",damage:3,weaken:2},
 poison:{name:"毒の印",cost:1,kind:"poison",text:"毒5を付与（敵ターンに発動・毎回−1）",poison:5},
 fragile:{name:"脆弱の印",cost:1,kind:"fragile",text:"脆弱2を付与（攻撃被害＋50％）",vulnerable:2},
 guard:{name:"守り",cost:1,kind:"guard",text:"防御5",block:5},
 break:{name:"破魔雷",cost:2,kind:"attack",text:"8ダメージ。脆弱2を付与",damage:8,vulnerable:2},
 strength:{name:"闘魔の印",cost:1,kind:"power",text:"この戦闘中、攻撃威力＋2",strengthGain:2},
 spark:{name:"火花",cost:0,kind:"attack",text:"3ダメージ",damage:3},
 flow:{name:"術式循環",cost:1,kind:"draw",text:"カードを2枚引く",draw:2},
 ward:{name:"氷の結界",cost:1,kind:"guard",text:"防御7。カードを1枚引く",block:7,draw:1},
 charge:{name:"魔力点火",cost:0,kind:"energy",text:"魔力＋1。廃棄",energyGain:1,exhaust:true},
 double:{name:"双雷",cost:1,kind:"multi",text:"4ダメージを2回",damage:4,hits:2},
 focus:{name:"魔導の研究",cost:1,kind:"power",text:"この戦闘中、毎ターンのドロー＋1",powerDraw:1},
 flare:{name:"毒炎",cost:1,kind:"attack",text:"6ダメージ。毒の敵なら＋6",damage:6,poisonBonus:6}
});
export function getB1Card(id){const up=typeof id==="string"&&id.endsWith("~"),base=up?id.slice(0,-1):id;const card=CARDS[base];if(!card)return null;if(!up)return card;const next={...card,name:card.name+"＋"};const stat=["damage","block","heal","poison","weaken","vulnerable","energyGain","draw","strengthGain","powerDraw"].find(k=>Number.isFinite(card[k])&&card[k]>0);if(stat){const bonus=["damage","block","heal"].includes(stat)?3:1;next[stat]+=bonus;next.text=card.text+"（"+stat+"＋"+bonus+"）";}else{next.cost=Math.max(0,card.cost-1);next.text=card.text+"（魔力－1）";}return next;}
export const STARTER = Object.freeze(["bolt","bolt","bolt","bolt","guard","guard","guard","guard","break"]);
export const STAGES = Object.freeze([
 {name:"B1・入口",hint:"硬い敵を相手に攻撃するか防御するか。次の攻撃を予測しよう。",enemies:[{id:"rat",name:"石牙獣",maxHp:42,role:"rat"}],rewards:["ward","double","poison","spark","flow","heal","frost"]},
 {name:"B1・群れ",hint:"小型2体の同時攻撃。片方を先に倒すか、全体攻撃で削るか。",enemies:[{id:"wolf",name:"洞穴の狼",maxHp:17,role:"wolf"},{id:"imp",name:"盾の小鬼",maxHp:16,role:"imp"}],rewards:["charge","chain","fragile","focus","flare","lightning","drain","scatter"]},
 {name:"B1・祭壇",hint:"呪術師は初手で力を溜め、毎ターン強くなる。長期戦は危険。",enemies:[{id:"priest",name:"洞窟の呪術師",maxHp:52,role:"ritual"}],rewards:["flow","strength","double","poison","ward","flare","heal","lightning"]},
 {name:"B1・強敵",hint:"強敵が大技と連続攻撃を使う。大技の予告を見て防御を合わせよう。",enemies:[{id:"brute",name:"深層の番兵",maxHp:82,role:"elite"}],rewards:["strength","focus","charge","double","flare","ward","drain","fragile"]},
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
const clone=x=>JSON.parse(JSON.stringify(x));
export function createB1Game(options={}){
 let seed=(Number(options.seed)>>>0)||20261010;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const testMaxHp=Number.isInteger(options.maxHp)&&options.maxHp>=1&&options.maxHp<=999?options.maxHp:75;
 let s={phase:"starter",stage:0,turn:1,hp:testMaxHp,maxHp:testMaxHp,energy:3,block:0,attacksThisTurn:0,powerDraw:0,strength:0,selected:null,deck:Array.isArray(options.testDeck)&&options.testDeck.length>0&&options.testDeck.length<=30&&options.testDeck.every(id=>Object.hasOwn(CARDS,id))?[...options.testDeck]:[...STARTER],hand:[],draw:[],discard:[],exhaust:[],powers:[],enemies:[],rewards:[],gold:0,shopPending:false,shopUsed:false,shopPurchases:[],restPending:false,restUsed:false,restChoice:null,selectedPath:null,routeHistory:[],log:["最初に得意な魔法を1枚選んで地下迷宮へ。"]};
 function note(t){s.log.unshift(t);s.log=s.log.slice(0,18);}
 const alive=()=>s.enemies.filter(e=>e.hp>0);
 const find=id=>s.enemies.find(e=>e.id===id&&e.hp>0);
 function drawCards(n){for(let i=0;i<n&&s.hand.length<10;i++){if(!s.draw.length){if(!s.discard.length)break;s.draw=shuffle(s.discard.splice(0));}s.hand.push(s.draw.pop());}}
 function start(){
  const stage=s.stage===1?B1_FORK_ROUTES[s.selectedPath||"pack"]:STAGES[s.stage];s.enemies=stage.enemies.map(e=>({...clone(e),hp:e.maxHp,weaken:0,poison:0,vulnerable:0,block:0,strength:0,channelDamage:0,channelBroken:false}));s.turn=1;s.block=0;s.energy=3;s.attacksThisTurn=0;s.powerDraw=0;s.strength=0;
  s.hand=[];s.discard=[];s.exhaust=[];s.powers=[];s.draw=shuffle([...s.deck]);s.selected=s.enemies.find(e=>e.role!=="boss")?.id||s.enemies[0].id;s.phase="battle";drawCards(5);note(stage.name+"：戦闘開始。");
 }
 function selectStarter(id){if(s.phase!=="starter"||!["lightning","scatter","flow"].includes(id))return false;s.deck.push(id);start();return true;}
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
 function checkVictory(){
  if(alive().length>0)return false;
  if(s.stage===STAGES.length-1){s.phase="won";note("地下迷宮B1を突破！");}
  else{if(!s.practiceMode){s.gold+=s.stage===3?35:20;note("ゴールドを獲得。所持："+s.gold+"G。");}const healed=Math.min(6,s.maxHp-s.hp);s.hp+=healed;s.phase="reward";s.rewards=shuffle([...STAGES[s.stage].rewards]).slice(0,3);note("勝利！HPを"+healed+"回復。技を1枚覚えるか、見送ろう。");}
  return true;
 }
 function play(index,targetId){
  if(s.phase!=="battle"||!Number.isInteger(index)||index<0||index>=s.hand.length)return false;
  const id=s.hand[index],card=getB1Card(id);if(!card||s.energy<card.cost)return false;
  const targeted=["attack","multi","poison","fragile"].includes(card.kind);
  const target=targeted?find(targetId||s.selected):null;
  if(targeted&&!target)return false;
  s.hand.splice(index,1);
  s.energy-=card.cost;
  if(card.kind==="attack"||card.kind==="multi"){
   const base=card.damage+s.strength+(card.chain&&s.attacksThisTurn>0?6:0)+(card.poisonBonus&&target.poison>0?card.poisonBonus:0);
   hit(target,base,card.hits||1);s.attacksThisTurn+=(card.hits||1);
   if(card.weaken&&target.hp>0){target.weaken+=card.weaken;note(target.name+"に弱体＋"+card.weaken+"。");}
   if(card.vulnerable&&target.hp>0){target.vulnerable+=card.vulnerable;note(target.name+"に脆弱＋"+card.vulnerable+"。");}
   if(card.heal){const n=Math.min(card.heal,s.maxHp-s.hp);s.hp+=n;note("HPを"+n+"回復。");}
  }else if(card.kind==="all"){
   const armor=protectors()*2;
   for(const e of alive()){
    const base=e.vulnerable>0?Math.floor((card.damage+s.strength)*1.5):card.damage+s.strength;
    const raw=Math.max(0,base-(e.role==="boss"?armor:0));
    const blocked=Math.min(e.block,raw);e.block-=blocked;
    const n=Math.min(e.hp,raw-blocked);
    e.hp-=n;recordBossDamage(e,n);note(e.name+"に"+n+"ダメージ。");
   }
   s.attacksThisTurn++;
  }else if(card.kind==="heal"){
   const n=Math.min(card.heal,s.maxHp-s.hp);s.hp+=n;note("HPを"+n+"回復。");
  }else if(card.kind==="guard"){s.block+=card.block;note("防御＋"+card.block+"。");}
  else if(card.kind==="poison"){target.poison+=card.poison;note(target.name+"に毒＋"+card.poison+"。");}
  else if(card.kind==="fragile"){target.vulnerable+=card.vulnerable;note(target.name+"に脆弱＋"+card.vulnerable+"。");}
  else if(card.kind==="energy"){s.energy+=card.energyGain;note("魔力＋"+card.energyGain+"。");}
  else if(card.kind==="power"){if(card.powerDraw){s.powerDraw+=card.powerDraw;note("毎ターンのドロー＋"+card.powerDraw+"。");}
   if(card.strengthGain){s.strength+=card.strengthGain;note("この戦闘中、攻撃威力＋"+card.strengthGain+"。");}}
  if(card.draw){drawCards(card.draw);note("カードを"+card.draw+"枚引いた。");}
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
  for(const e of [...s.enemies]){
   if(e.hp<=0)continue;
   // Poison hits before the enemy acts, even if charging, then weakens by 1.
   if(e.poison>0){
    const n=Math.min(e.poison,e.hp);e.hp-=n;recordBossDamage(e,n);e.poison=Math.max(0,e.poison-1);
    note(e.name+"は毒で"+n+"ダメージ。");
   }
   if(e.hp<=0)continue;
   // Enemy block is available during the player's turn; it expires on enemy action.
   e.block=0;
   const action=intent(e);
   if(action.kind==="attack"){
    let total=0,totalBlocked=0;
    for(let hitNo=0;hitNo<(action.hits||1);hitNo++){
     const raw=e.weaken>0?Math.floor(action.damage*.75):action.damage;
     const blocked=Math.min(s.block,raw);s.block-=blocked;
     const harm=raw-blocked;s.hp=Math.max(0,s.hp-harm);
     total+=harm;totalBlocked+=blocked;
     if(s.hp<=0)break;
    }
    note(e.name+"の"+action.label+"：防御"+totalBlocked+"、HP被害"+total+"。");
    if(s.hp<=0){s.phase="lost";note("HPが0になった。再挑戦してみよう。");break;}
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
  s.block=0;
  if(s.phase==="lost")return true;
  if(checkVictory())return true;
  s.discard.push(...s.hand.splice(0));s.turn++;s.energy=3;s.attacksThisTurn=0;
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
const SHOP_STOCK=Object.freeze([{id:"ward",price:35},{id:"chain",price:40}]);
function buyShop(id){
 if(s.phase!=="between"||s.stage!==2||!s.shopPending||s.shopUsed||s.practiceMode)return false;
 const item=SHOP_STOCK.find(item=>item.id===id);
 if(!item||s.gold<item.price||s.shopPurchases.includes(id))return false;
 s.gold-=item.price;s.deck.push(item.id);s.shopPurchases.push(item.id);
 note("商店："+getB1Card(item.id).name+"を"+item.price+"Gで購入。");return true;
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
 return {snapshot,selectStarter,startBossPractice,play,endTurn,chooseReward,chooseRest,buyShop,leaveShop,choosePath,nextBattle};
}
