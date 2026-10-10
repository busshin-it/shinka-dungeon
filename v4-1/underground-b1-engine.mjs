// Isolated B1 playtest. Never reads or changes existing game saves.
export const CARDS = Object.freeze({
 bolt:{name:"魔弾",cost:1,kind:"attack",text:"敵1体に5ダメージ",damage:5},
 lightning:{name:"雷撃",cost:2,kind:"attack",text:"敵1体に11ダメージ",damage:11},
 scatter:{name:"散弾",cost:2,kind:"all",text:"敵全体に4ダメージ",damage:4},
 chain:{name:"連鎖雷",cost:1,kind:"attack",text:"4ダメージ。先に呪文を使っていれば＋4",damage:4,chain:true},
 heal:{name:"小治癒",cost:1,kind:"heal",text:"自分のHPを5回復",heal:5},
 drain:{name:"吸命",cost:2,kind:"attack",text:"6ダメージ。自分のHPを3回復",damage:6,heal:3},
 frost:{name:"氷の矢",cost:1,kind:"weaken",text:"敵の次の攻撃を3弱める",weaken:3},
 poison:{name:"毒の印",cost:1,kind:"poison",text:"敵に毒2（攻撃後に発動・減らない）",poison:2},
 fragile:{name:"脆弱の印",cost:1,kind:"fragile",text:"敵が次に受ける攻撃ダメージ＋3",fragile:3},
 guard:{name:"守り",cost:1,kind:"guard",text:"このターン防御5",block:5}
});
export const STARTER = Object.freeze(["bolt","bolt","bolt","guard","guard","heal","frost","poison"]);
export const STAGES = Object.freeze([
 {name:"B1・入口",hint:"敵の行動を見ながら、攻めるか守るかを選ぼう。",enemies:[{id:"rat",name:"洞穴ねずみ",maxHp:17,role:"rat"}],rewards:["lightning","scatter","heal"]},
 {name:"B1・中層",hint:"2体の敵。倒す順番を考えよう。",enemies:[{id:"wolf",name:"洞穴の狼",maxHp:14,role:"wolf"},{id:"imp",name:"盾の小鬼",maxHp:14,role:"imp"}],rewards:["chain","drain","fragile"]},
 {name:"B1・最深部",hint:"護衛2体がボスを守る。溜め2回の後、地鳴りが来る。",enemies:[{id:"left",name:"盾の小鬼・左",maxHp:11,role:"guard"},{id:"boss",name:"地底の祭司",maxHp:40,role:"boss"},{id:"right",name:"盾の小鬼・右",maxHp:11,role:"guard"}],rewards:[]}
]);
const clone=x=>JSON.parse(JSON.stringify(x));
export function createB1Game(options={}){
 let seed=(Number(options.seed)>>>0)||20261010;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 let s={phase:"starter",stage:0,turn:1,hp:48,maxHp:48,energy:3,block:0,usedSpell:false,selected:null,deck:[...STARTER],hand:[],draw:[],discard:[],enemies:[],rewards:[],log:["最初に得意な魔法を1枚選んで地下迷宮へ。"]};
 function note(t){s.log.unshift(t);s.log=s.log.slice(0,18);}
 const alive=()=>s.enemies.filter(e=>e.hp>0);
 const find=id=>s.enemies.find(e=>e.id===id&&e.hp>0);
 function refill(){while(s.hand.length<5){if(!s.draw.length){if(!s.discard.length)break;s.draw=shuffle(s.discard.splice(0));}s.hand.push(s.draw.pop());}}
 function start(){
  const stage=STAGES[s.stage];s.enemies=stage.enemies.map(e=>({...clone(e),hp:e.maxHp,weaken:0,poison:0,fragile:0}));s.turn=1;s.block=0;s.energy=3;s.usedSpell=false;
  s.hand=[];s.discard=[];s.draw=shuffle([...s.deck]);s.selected=s.enemies.find(e=>e.role!=="boss")?.id||s.enemies[0].id;s.phase="battle";refill();note(stage.name+"：戦闘開始。");
 }
 function selectStarter(id){if(s.phase!=="starter"||!["lightning","scatter","chain"].includes(id))return false;s.deck.push(id);start();return true;}
 function protectors(){return s.stage===2?alive().filter(e=>e.role==="guard").length:0;}
 function hit(target,base){
  if(!target||target.hp<=0)return 0;
  const armor=target.role==="boss"?protectors()*2:0;
  const actual=Math.max(0,base+(target.fragile||0)-armor);
  const usedFragile=target.fragile>0;
  target.fragile=0;
  target.hp=Math.max(0,target.hp-actual);
  note(target.name+"に"+actual+"ダメージ"+(armor?"（護衛軽減 "+armor+"）":"")+(usedFragile?"（脆弱）":"")+"。");
  return actual;
 }
 function checkVictory(){
  if(alive().length>0)return false;
  if(s.stage===STAGES.length-1){s.phase="won";note("地下迷宮B1を突破！");}
  else{s.phase="reward";s.rewards=[...STAGES[s.stage].rewards];note("勝利！技を1枚覚えるか、見送ろう。");}
  return true;
 }
 function play(index,targetId){
  if(s.phase!=="battle"||!Number.isInteger(index)||index<0||index>=s.hand.length)return false;
  const id=s.hand[index],card=CARDS[id];if(!card||s.energy<card.cost)return false;
  const targeted=["attack","weaken","poison","fragile"].includes(card.kind);
  const target=targeted?find(targetId||s.selected):null;
  if(targeted&&!target)return false;
  s.hand.splice(index,1);s.discard.push(id);s.energy-=card.cost;
  const priorSpell=s.usedSpell;if(card.kind!=="guard")s.usedSpell=true;
  if(card.kind==="attack"){
   hit(target,card.damage+(card.chain&&priorSpell?4:0));
   if(card.heal){const old=s.hp;s.hp=Math.min(s.maxHp,s.hp+card.heal);note("吸命でHPを"+(s.hp-old)+"回復。");}
  }else if(card.kind==="all"){
   // Simultaneous hit: protector count is based on living guards at start.
   const armor=protectors()*2;const targets=alive();
   for(const e of targets){
    const val=Math.max(0,card.damage+e.fragile-(e.role==="boss"?armor:0));
    e.hp=Math.max(0,e.hp-val);e.fragile=0;
    note(e.name+"へ"+val+"ダメージ"+(e.role==="boss"&&armor?"（護衛軽減 "+armor+"）":"")+"。");
   }
  }else if(card.kind==="heal"){
   const old=s.hp;s.hp=Math.min(s.maxHp,s.hp+card.heal);note("HPを"+(s.hp-old)+"回復。");
  }else if(card.kind==="guard"){s.block+=card.block;note("防御＋"+card.block+"。");}
  else if(card.kind==="weaken"){target.weaken+=card.weaken;note(target.name+"の次の攻撃−"+card.weaken+"。");}
  else if(card.kind==="poison"){target.poison+=card.poison;note(target.name+"に毒＋"+card.poison+"。");}
  else if(card.kind==="fragile"){target.fragile+=card.fragile;note(target.name+"に脆弱＋"+card.fragile+"。");}
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
