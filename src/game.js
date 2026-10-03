const CARD={
 ice:{name:"氷の矢",cost:1,text:"6ダメージ・凍結",kind:"ice",art:"image"},
 bolt:{name:"雷撃",cost:2,text:"11ダメージ",kind:"lightning",art:"ϟ"},
 dark:{name:"闇弾",cost:1,text:"5ダメージ・弱体",kind:"dark",art:"●"},
 guard:{name:"光壁",cost:1,text:"7ブロック",kind:"guard",art:"◇"},
 focus:{name:"集中",cost:0,text:"次の魔法 +3",kind:"focus",art:"✦"},
 frostNova:{name:"霜の輪",cost:1,text:"4ダメージ・敵攻撃 -4",kind:"ice",art:"❄"},
 manaBurst:{name:"魔力奔流",cost:1,text:"次の魔法 +6",kind:"focus",art:"✧"},
 mirror:{name:"鏡の結界",cost:1,text:"5ブロック・3反射",kind:"guard",art:"◈"}
};
const state={enemyHp:48,playerHp:60,energy:3,block:0,focus:false,weak:false,frozen:false,busy:false,iceEvo:null,enemyTurn:1,
 draw:["ice","guard","bolt","dark","focus","ice","guard","dark"],discard:[],hand:[],used:[],bonusFocus:0,reflect:0,enemyPenalty:0,battle:1,maxEnemy:48,mapStage:0,nextBattle:2};
const $=s=>document.querySelector(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
const mage=$(".actor.player"),foe=$(".actor.foe"),field=$(".battlefield"),dmg=$("#damageText"),log=$("#battleLog");
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function refill(){if(!state.draw.length&&state.discard.length)state.draw=shuffle(state.discard.splice(0))}
function drawTo(n=5){while(state.hand.length<n){refill();if(!state.draw.length)break;state.hand.push(state.draw.pop())}}
function cardName(id){if(id==="ice"&&state.iceEvo)return state.iceEvo==="spear"?"氷槍":"吹雪";return CARD[id].name}
function cardText(id){if(id==="ice"&&state.iceEvo)return state.iceEvo==="spear"?"10ダメージ":"7ダメージ・強凍結";return CARD[id].text}
function renderHand(){
 const hand=$("#hand");hand.innerHTML="";
 state.hand.forEach((id,i)=>{const c=CARD[id],b=document.createElement("button");b.className="card "+c.kind;b.dataset.index=i;
 const art=c.art==="image"?'<img src="./assets/cards/file_0000000026948209a5bf61548ca87c69.png" alt="">':`<div class="simple-art">${c.art}</div>`;
 b.innerHTML=`<span class="cost">${c.cost}</span>${art}<strong>${cardName(id)}</strong><small>${cardText(id)}</small>`;
 b.disabled=state.busy||c.cost>state.energy||state.enemyHp<=0;b.onclick=()=>play(i);hand.appendChild(b)});
 $("#drawCount").textContent=state.draw.length;$("#discardCount").textContent=state.discard.length
}
function render(){
 $("#enemyHp").textContent=state.enemyHp;$("#enemyMax").textContent=state.maxEnemy;$("#enemyHpBar").style.width=(state.enemyHp/state.maxEnemy*100)+"%";
 $("#playerHp").textContent=state.playerHp;$("#playerHpBar").style.width=(state.playerHp/60*100)+"%";
 $("#energy").textContent=state.energy;$("#playerStatus").textContent="ブロック "+state.block+(state.focus?" ｜ 集中":"");
 $("#intent").textContent=state.frozen?"次の行動：凍結中":"次の行動："+enemyIntent();
 renderHand();if(state.enemyHp<=0){$("#victory").classList.add("show");log.textContent="勝利！"}
}
function enemyIntent(){
 if(state.battle===1)return "斬撃 "+(state.weak?6:8);
 if(state.battle===2)return state.enemyTurn%2?"霊刃 "+(state.weak?7:10):"呪詛 4 + 弱体";
 return state.enemyTurn%3===0?"重撃 "+(state.weak?11:14):state.enemyTurn%3===1?"炎爪 "+(state.weak?8:11):"防壁 + 次撃強化";
}
function popDamage(n,onPlayer=false){dmg.textContent="-"+n;dmg.className="damage-text"+(onPlayer?" player-dmg":"");void dmg.offsetWidth;dmg.classList.add("pop");field.classList.remove("impact");void field.offsetWidth;field.classList.add("impact");field.addEventListener("animationend",()=>field.classList.remove("impact"),{once:true})}
async function playerPose(kind,ms=420){mage.classList.remove("guard-cast","focus-cast");mage.classList.add(kind);await wait(ms);mage.classList.remove(kind)}
async function hitEnemy(n){await wait(240);foe.classList.add("hit");state.enemyHp=Math.max(0,state.enemyHp-n);popDamage(n);render();await wait(280);foe.classList.remove("hit")}
async function spell(type,base){mage.classList.add("cast");let n=base+(state.focus?3:0)+state.bonusFocus;state.focus=false;state.bonusFocus=0;
 if(type==="ice"){log.textContent="《"+cardName("ice")+"》！";let fx=$("#iceFx");fx.classList.remove("fly");void fx.offsetWidth;fx.classList.add("fly");fx.addEventListener("animationend",()=>fx.classList.remove("fly"),{once:true});state.frozen=true}
 if(type==="bolt"){log.textContent="《雷撃》！";let fx=$("#boltFx");fx.classList.remove("strike");void fx.offsetWidth;fx.classList.add("strike");fx.addEventListener("animationend",()=>fx.classList.remove("strike"),{once:true})}
 if(type==="dark"){log.textContent="《闇弾》！";let fx=$("#darkFx");fx.classList.remove("fly");void fx.offsetWidth;fx.classList.add("fly");fx.addEventListener("animationend",()=>fx.classList.remove("fly"),{once:true});state.weak=true}
 await hitEnemy(n);mage.classList.remove("cast")
}
async function play(i){if(state.busy)return;const id=state.hand[i],c=CARD[id];if(!id||state.energy<c.cost)return;
 state.busy=true;state.energy-=c.cost;state.hand.splice(i,1);state.used.push(id);state.discard.push(id);render();
 if(id==="ice")await spell("ice",state.iceEvo==="spear"?10:state.iceEvo==="blizzard"?7:6);
 if(id==="bolt")await spell("bolt",11);if(id==="dark")await spell("dark",5);
 if(id==="guard"){state.block+=7;log.textContent="《光壁》：7ブロック";await playerPose("guard-cast")}
 if(id==="focus"){state.focus=true;log.textContent="《集中》：次の魔法 +3";await playerPose("focus-cast",520)}
 if(id==="frostNova"){state.enemyPenalty=Math.max(state.enemyPenalty,4);await spell("ice",4)}
 if(id==="manaBurst"){state.bonusFocus+=6;log.textContent="《魔力奔流》：次の魔法 +6";await playerPose("focus-cast",520)}
 if(id==="mirror"){state.block+=5;state.reflect=3;log.textContent="《鏡の結界》：5ブロック・反射3";await playerPose("guard-cast")}
 state.busy=false;render()
}
$("#endTurn").onclick=async()=>{if(state.busy||state.enemyHp<=0)return;state.busy=true;render();
 state.discard.push(...state.hand.splice(0));
 if(state.frozen){log.textContent="凍結で敵の攻撃を封じた！";state.frozen=false;await wait(550)}
 else{
 let raw=8,curse=false;
 if(state.battle===1)raw=8;
 if(state.battle===2){if(state.enemyTurn%2){raw=10}else{raw=4;curse=true}}
 if(state.battle===3){const phase=state.enemyTurn%3;if(phase===0)raw=14;else if(phase===1)raw=11;else{raw=0;state.enemyPenalty=Math.max(0,state.enemyPenalty-2);log.textContent="守護者が防壁を展開した";await wait(500)}}
 if(state.weak)raw=Math.max(0,raw-2);raw=Math.max(0,raw-state.enemyPenalty);state.weak=false;state.enemyPenalty=0;
 if(raw>0){log.textContent=(state.battle===1?"スケルトンの斬撃！":state.battle===2?(curse?"亡霊騎士の呪詛！":"亡霊騎士の霊刃！"):"守護者の攻撃！");foe.classList.add("attack");await wait(260);let slash=$("#slashFx");slash.classList.remove("slash");void slash.offsetWidth;slash.classList.add("slash");mage.classList.add("hit");let n=Math.max(0,raw-state.block);state.block=Math.max(0,state.block-raw);state.playerHp=Math.max(0,state.playerHp-n);popDamage(n,true);if(n>0&&state.reflect>0)state.enemyHp=Math.max(0,state.enemyHp-state.reflect);state.reflect=0;if(curse)state.enemyPenalty=-2;render();await wait(400);foe.classList.remove("attack");mage.classList.remove("hit")}
 state.enemyTurn++;
}
 state.block=0;state.energy=3;drawTo(5);state.busy=false;
 if(state.playerHp<=0){log.textContent="敗北…";$("#defeat").classList.add("show")}else log.textContent="新しい手札を引いた";
 render()};
$("#rewardBtn").onclick=()=>{
 if(state.battle===1){$("#evolutionStep").hidden=false;$("#cardRewardStep").hidden=true}
 else{$("#evolutionStep").hidden=true;$("#cardRewardStep").hidden=false}
 $("#reward").classList.add("show")
};
document.querySelectorAll("[data-evo]").forEach(b=>b.onclick=()=>{state.iceEvo=b.dataset.evo;$("#evolutionStep").hidden=true;$("#cardRewardStep").hidden=false});
function finishReward(id){
 if(id)state.discard.push(id);$("#reward").classList.remove("show");$("#victory").classList.remove("show");
 if(state.battle>=3){$("#runClear").classList.add("show");return}
 state.mapStage++;
 updateDungeonMap();
 $("#mapHint").textContent="次に進む部屋を選んでください。";
 $("#mapScreen").classList.add("show")
}
document.querySelectorAll("[data-reward]").forEach(b=>b.onclick=()=>finishReward(b.dataset.reward));
$("#skipReward").onclick=()=>finishReward(null);
function prepareBattle(n){
 state.battle=n;state.enemyTurn=1;state.maxEnemy=n===2?62:78;state.enemyHp=state.maxEnemy;state.energy=3;state.block=0;state.focus=false;state.weak=false;state.frozen=false;state.enemyPenalty=0;state.reflect=0;state.hand=[];state.draw=shuffle([...state.draw,...state.discard]);state.discard=[];drawTo(5);
 $("#enemyName").textContent=n===2?"亡霊騎士":"古城の守護者";log.textContent=n===2?"第2戦：亡霊騎士。攻撃と呪詛が交互に来る":"最終戦：古城の守護者。行動パターンを読もう";render()
}
function updateDungeonMap(){
 document.querySelectorAll(".dnode").forEach(n=>{if(n.classList.contains("start"))return;n.classList.remove("available");n.classList.add("locked")});
 let ids=state.mapStage===1?["enemy","event","shop"]:state.mapStage===2?["elite","rest"]:["boss"];
 ids.forEach(id=>{const n=document.querySelector('[data-node="'+id+'"]');if(n){n.classList.remove("locked");n.classList.add("available")}});
}
function openEvent(type){
 $("#mapScreen").classList.remove("show");$("#eventScreen").classList.add("show");
 const kind=$("#eventKind"),title=$("#eventTitle"),txt=$("#eventText");
 if(type==="shop"){kind.textContent="MERCHANT";title.textContent="旅の商人";txt.textContent="試作：魔力を整え、HPを6回復した。";state.playerHp=Math.min(60,state.playerHp+6)}
 if(type==="event"){kind.textContent="UNKNOWN";title.textContent="青白い泉";txt.textContent="泉の魔力がカードに宿る。次の戦闘で集中状態から始まる。";state.focus=true}
 if(type==="rest"){kind.textContent="REST";title.textContent="静かな篝火";txt.textContent="休息してHPを12回復した。";state.playerHp=Math.min(60,state.playerHp+12)}
}
document.querySelectorAll(".dnode[data-type]").forEach(n=>n.onclick=()=>{
 if(!n.classList.contains("available"))return;
 const type=n.dataset.type;n.classList.remove("available");n.classList.add("cleared");
 if(type==="event"||type==="shop"||type==="rest"){openEvent(type);return}
 $("#mapScreen").classList.remove("show");
 if(type==="enemy"){prepareBattle(2)}
 else if(type==="elite"){prepareBattle(2);state.maxEnemy=68;state.enemyHp=68;$("#enemyName").textContent="亡霊騎士・精鋭";render()}
 else if(type==="boss"){prepareBattle(3)}
});
$("#eventContinue").onclick=()=>{$("#eventScreen").classList.remove("show");state.mapStage++;updateDungeonMap();$("#mapScreen").classList.add("show");render()};
const fsBtn=$("#fullscreenBtn");if(fsBtn)fsBtn.onclick=async()=>{try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock("landscape").catch(()=>{})}else await document.exitFullscreen()}catch(e){}};
document.addEventListener("fullscreenchange",()=>{if(fsBtn)fsBtn.textContent=document.fullscreenElement?"×":"⛶"});
shuffle(state.draw);drawTo(5);render();
$("#restartRun").onclick=()=>location.reload();
$("#retryRun").onclick=()=>location.reload();