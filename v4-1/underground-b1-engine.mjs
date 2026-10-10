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
 spark:{name:"火花",cost:0,kind:"attack",text:"3ダメージ",damage:3},
 flow:{name:"術式循環",cost:1,kind:"draw",text:"カードを2枚引く",draw:2},
 ward:{name:"氷の結界",cost:1,kind:"guard",text:"防御7。カードを1枚引く",block:7,draw:1},
 charge:{name:"魔力点火",cost:0,kind:"energy",text:"魔力＋1。廃棄",energyGain:1,exhaust:true},
 double:{name:"双雷",cost:1,kind:"multi",text:"4ダメージを2回",damage:4,hits:2},
 focus:{name:"魔導の研究",cost:1,kind:"power",text:"この戦闘中、毎ターンのドロー＋1",powerDraw:1},
 flare:{name:"毒炎",cost:1,kind:"attack",text:"6ダメージ。毒の敵なら＋6",damage:6,poisonBonus:6}
});
export const STARTER = Object.freeze(["bolt","bolt","bolt","bolt","guard","guard","guard","guard","frost"]);
export const STAGES = Object.freeze([
 {name:"B1・入口",hint:"敵の行動を見ながら、攻めるか守るかを選ぼう。",enemies:[{id:"rat",name:"洞穴ねずみ",maxHp:17,role:"rat"}],rewards:["ward","double","poison","spark","flow","heal"]},
 {name:"B1・中層",hint:"2体の敵。倒す順番を考えよう。",enemies:[{id:"wolf",name:"洞穴の狼",maxHp:14,role:"wolf"},{id:"imp",name:"盾の小鬼",maxHp:14,role:"imp"}],rewards:["charge","chain","fragile","focus","flare","lightning","drain"]},
 {name:"B1・最深部",hint:"護衛2体がボスを守る。溜め2回の後、地鳴りが来る。",enemies:[{id:"left",name:"盾の小鬼・左",maxHp:11,role:"guard"},{id:"boss",name:"地底の祭司",maxHp:40,role:"boss"},{id:"right",name:"盾の小鬼・右",maxHp:11,role:"guard"}],rewards:[]}
]);
const clone=x=>JSON.parse(JSON.stringify(x));
export function createB1Game(options={}){
 let seed=(Number(options.seed)>>>0)||20261010;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const testMaxHp=Number.isInteger(options.maxHp)&&options.maxHp>=1&&options.maxHp<=999?options.maxHp:48;
 let s={phase:"starter",stage:0,turn:1,hp:testMaxHp,maxHp:testMaxHp,energy:3,block:0,attacksThisTurn:0,powerDraw:0,selected:null,deck:[...STARTER],hand:[],draw:[],discard:[],exhaust:[],enemies:[],rewards:[],log:["最初に得意な魔法を1枚選んで地下迷宮へ。"]};
 function note(t){s.log.unshift(t);s.log=s.log.slice(0,18);}
 const alive=()=>s.enemies.filter(e=>e.hp>0);
 const find=id=>s.enemies.find(e=>e.id===id&&e.hp>0);
 function drawCards(n){for(let i=0;i<n&&s.hand.length<10;i++){if(!s.draw.length){if(!s.discard.length)break;s.draw=shuffle(s.discard.splice(0));}s.hand.push(s.draw.pop());}}
 function start(){
  const stage=STAGES[s.stage];s.enemies=stage.enemies.map(e=>({...clone(e),hp:e.maxHp,weaken:0,poison:0,vulnerable:0}));s.turn=1;s.block=0;s.energy=3;s.attacksThisTurn=0;s.powerDraw=0;
  s.hand=[];s.discard=[];s.exhaust=[];s.draw=shuffle([...s.deck]);s.selected=s.enemies.find(e=>e.role!=="boss")?.id||s.enemies[0].id;s.phase="battle";drawCards(5);note(stage.name+"：戦闘開始。");
 }
 function selectStarter(id){if(s.phase!=="starter"||!["lightning","scatter","flow"].includes(id))return false;s.deck.push(id);start();return true;}
 function protectors(){return s.stage===2?alive().filter(e=>e.role==="guard").length:0;}
 function hit(target,base,hits=1){
  if(!target||target.hp<=0)return 0;
  let total=0;
  for(let i=0;i<hits&&target.hp>0;i++){
   const armor=target.role==="boss"?protectors()*2:0;
   const boosted=target.vulnerable>0?Math.floor(base*1.5):base;
   const actual=Math.min(target.hp,Math.max(0,boosted-armor));
   target.hp-=actual;total+=actual;
  }
  note(target.name+"に合計"+total+"ダメージ"+(hits>1?"（"+hits+"回攻撃）":"")+"。");
  return total;
 }
 function checkVictory(){
  if(alive().length>0)return false;
  if(s.stage===STAGES.length-1){s.phase="won";note("地下迷宮B1を突破！");}
  else{s.phase="reward";s.rewards=shuffle([...STAGES[s.stage].rewards]).slice(0,3);note("勝利！技を1枚覚えるか、見送ろう。");}
  return true;
 }
 function play(index,targetId){
  if(s.phase!=="battle"||!Number.isInteger(index)||index<0||index>=s.hand.length)return false;
  const id=s.hand[index],card=CARDS[id];if(!card||s.energy<card.cost)return false;
  const targeted=["attack","multi","poison","fragile"].includes(card.kind);
  const target=targeted?find(targetId||s.selected):null;
  if(targeted&&!target)return false;
  s.hand.splice(index,1);
  s.energy-=card.cost;
  if(card.exhaust||card.kind==="power")s.exhaust.push(id);else s.discard.push(id);
  if(card.kind==="attack"||card.kind==="multi"){
   const base=card.damage+(card.chain&&s.attacksThisTurn>0?6:0)+(card.poisonBonus&&target.poison>0?card.poisonBonus:0);
   hit(target,base,card.hits||1);s.attacksThisTurn+=(card.hits||1);
   if(card.weaken&&target.hp>0){target.weaken+=card.weaken;note(target.name+"に弱体＋"+card.weaken+"。");}
   if(card.heal){const n=Math.min(card.heal,s.maxHp-s.hp);s.hp+=n;note("HPを"+n+"回復。");}
  }else if(card.kind==="all"){
   const armor=protectors()*2;
   for(const e of alive()){
    const base=e.vulnerable>0?Math.floor(card.damage*1.5):card.damage;
    const n=Math.min(e.hp,Math.max(0,base-(e.role==="boss"?armor:0)));
    e.hp-=n;note(e.name+"に"+n+"ダメージ。");
   }
   s.attacksThisTurn++;
  }else if(card.kind==="heal"){
   const n=Math.min(card.heal,s.maxHp-s.hp);s.hp+=n;note("HPを"+n+"回復。");
  }else if(card.kind==="guard"){s.block+=card.block;note("防御＋"+card.block+"。");}
  else if(card.kind==="poison"){target.poison+=card.poison;note(target.name+"に毒＋"+card.poison+"。");}
  else if(card.kind==="fragile"){target.vulnerable+=card.vulnerable;note(target.name+"に脆弱＋"+card.vulnerable+"。");}
  else if(card.kind==="energy"){s.energy+=card.energyGain;note("魔力＋"+card.energyGain+"。");}
  else if(card.kind==="power"){s.powerDraw+=card.powerDraw;note("この戦闘中、毎ターンのドロー＋"+card.powerDraw+"。");}
  if(card.draw){drawCards(card.draw);note("カードを"+card.draw+"枚引いた。");}
  checkVictory();return true;
 }
 function intent(e){
  if(!e||e.hp<=0)return{kind:"none",label:"撃破"};
  const t=s.turn;
  if(e.role==="boss"){
   const seq=(t-1)%4;
   return seq===0?{kind:"rest",label:"溜め 1/2"}:seq===1?{kind:"rest",label:"溜め 2/2"}:seq===2?{kind:"attack",label:"地鳴り 12",damage:12}:{kind:"rest",label:"疲労・隙"};
  }
  if(e.role==="guard"||e.role==="imp")return (t+(e.id==="right"?1:0))%2===0?{kind:"rest",label:"防御態勢"}:{kind:"attack",label:"小突き 3",damage:3};
  if(e.role==="rat")return t%3===2?{kind:"rest",label:"様子を見る"}:{kind:"attack",label:"噛みつき 4",damage:4};
  if(e.role==="wolf")return t%3===2?{kind:"rest",label:"身構える"}:{kind:"attack",label:"飛びかかり 5",damage:5};
  return{kind:"attack",label:"攻撃 4",damage:4};
 }
 function endTurn(){
  if(s.phase!=="battle")return false;
  for(const e of [...s.enemies]){
   if(e.hp<=0)continue;
   const a=intent(e);
   if(a.kind==="attack"){
    const raw=Math.max(0,a.damage-e.weaken);e.weaken=0;
    const absorbed=Math.min(s.block,raw);s.block-=absorbed;
    const harm=raw-absorbed;s.hp=Math.max(0,s.hp-harm);
    note(e.name+"の"+a.label+"：防御"+absorbed+"、HP被害"+harm+"。");
    if(s.hp<=0){s.phase="lost";note("HPが0になった。再挑戦してみよう。");break;}
    if(e.poison>0){e.hp=Math.max(0,e.hp-e.poison);note(e.name+"の攻撃後に毒"+e.poison+"ダメージ。");}
   }else note(e.name+"： "+a.label+"。");
  }
  s.block=0;
  if(s.phase==="lost")return true;
  if(checkVictory())return true;
  s.discard.push(...s.hand.splice(0));s.turn++;s.energy=3;s.usedSpell=false;refill();return true;
 }
 function chooseReward(id){
  if(s.phase!=="reward"||(id!==null&&!s.rewards.includes(id)))return false;
  if(id){s.deck.push(id);note(CARDS[id].name+"を習得。");}else note("報酬は見送った。");
  s.phase="between";return true;
 }
 function nextBattle(){if(s.phase!=="between"||s.stage>=STAGES.length-1)return false;s.stage++;start();return true;}
 function snapshot(){return clone({...s,intents:s.enemies.map(e=>({id:e.id,...intent(e)})),stageName:STAGES[s.stage].name,stageHint:STAGES[s.stage].hint});}
 return {snapshot,selectStarter,play,endTurn,chooseReward,nextBattle};
}
