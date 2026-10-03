const CARD_ART={
 ice:"./assets/cards/file_0000000026948209a5bf61548ca87c69.png"
};
const CARD={
 ice:{name:"氷の矢",cost:1,text:"6ダメージ・凍結",kind:"ice",art:"image"},
 bolt:{name:"雷撃",cost:2,text:"11ダメージ",kind:"lightning",art:"ϟ"},
 dark:{name:"闇弾",cost:1,text:"5ダメージ・弱体",kind:"dark",art:"●"},
 guard:{name:"光壁",cost:1,text:"7ブロック",kind:"guard",art:"◇"},
 focus:{name:"集中",cost:0,text:"次の魔法 +3",kind:"focus",art:"✦"},
 frostNova:{name:"霜の輪",cost:1,text:"4ダメージ・敵攻撃 -4",kind:"ice",art:"❄"},
 manaBurst:{name:"魔力奔流",cost:1,text:"次の魔法 +6",kind:"focus",art:"✧"},
 mirror:{name:"鏡の結界",cost:1,text:"5ブロック・3反射",kind:"guard",art:"◈"},
 iceSpear:{name:"氷槍",cost:2,text:"12ダメージ・凍結",kind:"ice",art:"❄"},
 blizzard:{name:"吹雪",cost:2,text:"7ダメージ・凍結・敵攻撃 -3",kind:"ice",art:"❄"},
 chainBolt:{name:"連鎖雷",cost:2,text:"9ダメージ・このターン2枚目なら +4",kind:"lightning",art:"ϟ"},
 abyss:{name:"奈落弾",cost:2,text:"9ダメージ・弱体",kind:"dark",art:"●"},
 manaBarrier:{name:"魔力障壁",cost:1,text:"10ブロック・集中",kind:"guard",art:"◇"}
};
const state={enemyHp:48,playerHp:60,energy:3,block:0,focus:false,weak:false,frozen:false,busy:false,enemyTurn:1,enemyCharge:0,nextBattleFocus:false,
 draw:["ice","guard","bolt","dark","focus","ice","guard","dark"],discard:[],hand:[],used:[],bonusFocus:0,reflect:0,enemyPenalty:0,battle:1,maxEnemy:48,mapStage:0,nextBattle:2,roomsCleared:0,routeDepth:0,weapon:null,forgePower:0,sanctumBlessing:false,fusions:[],
 usage:{cards:{},families:{ice:0,lightning:0,dark:0,guard:0,focus:0}},classEvo:null,classEvoApplied:false,spellsThisTurn:0,lastSpellFamily:null};
const $=s=>document.querySelector(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
const mage=$(".actor.player"),foe=$(".actor.foe"),field=$(".battlefield"),dmg=$("#damageText"),log=$("#battleLog");
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function refill(){if(!state.draw.length&&state.discard.length)state.draw=shuffle(state.discard.splice(0))}
function drawTo(n=5){while(state.hand.length<n){refill();if(!state.draw.length)break;state.hand.push(state.draw.pop())}}
function cardName(id){return CARD[id].name}
function cardText(id){return CARD[id].text}
function cardArt(id,c){
 const src=CARD_ART[id];
 return src?'<img class="card-art-img" src="'+src+'" alt="">':'<span class="card-symbol">'+c.art+'</span>';
}
function renderHand(){
 const hand=$("#hand");hand.innerHTML="";
 state.hand.forEach((id,i)=>{const c=CARD[id],b=document.createElement("button");b.className="card "+c.kind;b.dataset.index=i;
 const art=cardArt(id,c);
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
const CARD_FAMILY={
 ice:"ice",frostNova:"ice",iceSpear:"ice",blizzard:"ice",
 bolt:"lightning",chainBolt:"lightning",
 dark:"dark",abyss:"dark",
 guard:"guard",mirror:"guard",manaBarrier:"guard",
 focus:"focus",manaBurst:"focus"
};
function recordUse(id){state.usage.cards[id]=(state.usage.cards[id]||0)+1;const family=CARD_FAMILY[id];if(family)state.usage.families[family]=(state.usage.families[family]||0)+1}
function previewEnemyDamage(base){return Math.max(0,base+state.enemyCharge-(state.weak?2:0)-state.enemyPenalty)}
function enemyIntent(){
 if(state.battle===1)return "斬撃 "+previewEnemyDamage(8);
 if(state.battle===2)return state.enemyTurn%2?"霊刃 "+previewEnemyDamage(10):"呪詛 "+previewEnemyDamage(4);
 if(state.battle===3)return state.enemyTurn%3===0?"魔力装填（次の攻撃 +3）":state.enemyTurn%2?"氷刃 "+previewEnemyDamage(11):"衝撃波 "+previewEnemyDamage(9);
 const phase=state.enemyTurn%3;
 if(phase===0)return "重撃 "+previewEnemyDamage(15);
 if(phase===1)return "炎爪 "+previewEnemyDamage(12);
 return "魔力充填（次の攻撃 +4）";
}
function popDamage(n,onPlayer=false){dmg.textContent="-"+n;dmg.className="damage-text"+(onPlayer?" player-dmg":"");void dmg.offsetWidth;dmg.classList.add("pop");field.classList.remove("impact");void field.offsetWidth;field.classList.add("impact");field.addEventListener("animationend",()=>field.classList.remove("impact"),{once:true})}
async function playerPose(kind,ms=420){mage.classList.remove("guard-cast","focus-cast");mage.classList.add(kind);await wait(ms);mage.classList.remove(kind)}
async function hitEnemy(n){await wait(240);foe.classList.add("hit");state.enemyHp=Math.max(0,state.enemyHp-n);popDamage(n);render();await wait(280);foe.classList.remove("hit")}
async function spell(type,base,{freeze=type==="ice",applyWeak=type==="dark"}={}){
 mage.classList.add("cast");
 const evo=state.classEvoApplied&&state.classEvo?state.classEvo.name:null;
 let n=base+(state.focus?(evo==="星詠み"?5:3):0)+state.bonusFocus+state.forgePower;
 if(state.weapon?.family===type)n+=2;
 if(evo==="氷結師"&&type==="ice"&&state.frozen)n+=2;
 if(evo==="黒魔導士"&&type==="dark"&&state.weak)n+=3;
 state.focus=false;state.bonusFocus=0;
 state.spellsThisTurn++;
 if(evo==="雷術師"&&state.spellsThisTurn>=2){n+=3;}
 if(evo==="元素術師"&&state.lastSpellFamily&&state.lastSpellFamily!==type)n+=2;
 state.lastSpellFamily=type;
 if(type==="ice"){log.textContent="《氷魔法》！";let fx=$("#iceFx");fx.classList.remove("fly");void fx.offsetWidth;fx.classList.add("fly");fx.addEventListener("animationend",()=>fx.classList.remove("fly"),{once:true});if(freeze)state.frozen=true}
 if(type==="bolt"){log.textContent="《雷撃》！";let fx=$("#boltFx");fx.classList.remove("strike");void fx.offsetWidth;fx.classList.add("strike");fx.addEventListener("animationend",()=>fx.classList.remove("strike"),{once:true})}
 if(type==="dark"){log.textContent="《闇弾》！";let fx=$("#darkFx");fx.classList.remove("fly");void fx.offsetWidth;fx.classList.add("fly");fx.addEventListener("animationend",()=>fx.classList.remove("fly"),{once:true});if(applyWeak)state.weak=true}
 await hitEnemy(n);mage.classList.remove("cast")
}
async function play(i){if(state.busy)return;const id=state.hand[i],c=CARD[id];if(!id||state.energy<c.cost)return;
 state.busy=true;state.energy-=c.cost;state.hand.splice(i,1);state.used.push(id);state.discard.push(id);recordUse(id);render();
 if(id==="ice")await spell("ice",6);
 if(id==="iceSpear")await spell("ice",12);
 if(id==="blizzard"){state.enemyPenalty=Math.max(state.enemyPenalty,3);await spell("ice",7)}
 if(id==="chainBolt"){const bonus=state.spellsThisTurn>=1?4:0;await spell("bolt",9+bonus)}
 if(id==="abyss")await spell("dark",9);
 if(id==="manaBarrier"){state.block+=10;state.focus=true;log.textContent="《魔力障壁》：10ブロック・集中";await playerPose("guard-cast")}
 if(id==="bolt")await spell("bolt",11);if(id==="dark")await spell("dark",5);
 if(id==="guard"){state.block+=7;log.textContent="《光壁》：7ブロック";await playerPose("guard-cast")}
 if(id==="focus"){state.focus=true;log.textContent="《集中》：次の魔法 +3";await playerPose("focus-cast",520)}
 if(id==="frostNova"){state.enemyPenalty=Math.max(state.enemyPenalty,4);await spell("ice",4,{freeze:false})}
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
 if(state.battle===3){const phase=state.enemyTurn%3;if(phase===0){raw=0;state.enemyCharge=3;log.textContent="石像魔導兵が魔力を装填した！ 次の攻撃 +3";await wait(500)}else if(phase===1)raw=11;else raw=9}
 if(state.battle===4){const phase=state.enemyTurn%3;if(phase===0)raw=15;else if(phase===1)raw=12;else{raw=0;state.enemyCharge=4;log.textContent="守護者が魔力を充填した！ 次の攻撃 +4";await wait(500)}}
 if(raw>0){raw=previewEnemyDamage(raw);state.enemyCharge=0;state.weak=false;state.enemyPenalty=0;log.textContent=state.battle===1?"スケルトンの斬撃！":state.battle===2?(curse?"亡霊騎士の呪詛！":"亡霊騎士の霊刃！"):state.battle===3?"石像魔導兵の攻撃！":"守護者の攻撃！";foe.classList.add("attack");await wait(260);let slash=$("#slashFx");slash.classList.remove("slash");void slash.offsetWidth;slash.classList.add("slash");mage.classList.add("hit");let n=Math.max(0,raw-state.block);state.block=Math.max(0,state.block-raw);state.playerHp=Math.max(0,state.playerHp-n);popDamage(n,true);if(n>0&&state.reflect>0)state.enemyHp=Math.max(0,state.enemyHp-state.reflect);state.reflect=0;render();await wait(400);foe.classList.remove("attack");mage.classList.remove("hit")}
 state.enemyTurn++;
}
 state.block=0;state.energy=3;state.spellsThisTurn=0;state.lastSpellFamily=null;drawTo(5);state.busy=false;
 if(state.playerHp<=0){log.textContent="敗北…";$("#defeat").classList.add("show")}else log.textContent="新しい手札を引いた";
 render()};
$("#rewardBtn").onclick=()=>{$("#reward").classList.add("show")};
function finishReward(id){
 if(id)state.discard.push(id);$("#reward").classList.remove("show");$("#victory").classList.remove("show");
 if(state.battle>=4){
 const f=state.usage.families;
 const top=Object.entries(f).sort((a,b)=>b[1]-a[1])[0];
 const fused=state.fusions.length?state.fusions.map(id=>CARD[id].name).join(" / "):"なし";
 $("#runSummary").innerHTML="<b>"+(state.classEvo?.name||"魔法師")+"</b><span>最も使った系統："+({ice:"氷",lightning:"雷",dark:"闇",guard:"結界",focus:"集中"}[top?.[0]]||"―")+" ("+(top?.[1]||0)+"回)</span><span>合成："+fused+"</span><span>装備："+(state.weapon?.name||"なし")+"</span>";
 $("#runClear").classList.add("show");return
}
 state.roomsCleared++;state.routeDepth++;
 updateDungeonMap();
 $("#mapHint").textContent="次に進む部屋を選んでください。";
 $("#mapScreen").classList.add("show")
}
function chooseClassEvolution(){
 const f=state.usage.families;
 const ranked=Object.entries(f).sort((a,b)=>b[1]-a[1]);
 const top=ranked[0]?.[0]||"focus", second=ranked[1]?.[1]||0, topN=ranked[0]?.[1]||0;
 if(topN-second<=1 && Object.values(f).filter(v=>v>0).length>=3)return {name:"元素術師",icon:"✦",trait:"複数属性を織り交ぜた戦い方",ability:"異なる属性の魔法を連続で使うと、2枚目のダメージ +2"};
 const table={
  ice:{name:"氷結師",icon:"❄",trait:"凍結と氷魔法を極めた魔法師",ability:"凍結中の敵への氷ダメージ +2"},
  lightning:{name:"雷術師",icon:"ϟ",trait:"高火力の雷魔法を磨いた魔法師",ability:"同じターンの2枚目の魔法に追加雷撃 3"},
  dark:{name:"黒魔導士",icon:"●",trait:"弱体と闇魔法を重ねる魔法師",ability:"弱体中の敵への闇ダメージ +3"},
  guard:{name:"結界術師",icon:"◇",trait:"防御と反射を軸にした魔法師",ability:"戦闘開始時に4ブロックを得る"},
  focus:{name:"星詠み",icon:"✧",trait:"集中から大魔法を放つ魔法師",ability:"集中の魔法強化量 +2"}
 };
 return table[top]||table.focus;
}
function showClassEvolution(){
 const evo=chooseClassEvolution();state.classEvo=evo;
 $("#classEvoIcon").textContent=evo.icon;$("#classEvoName").textContent=evo.name;
 $("#classEvoTrait").textContent=evo.trait;$("#classEvoAbility").textContent=evo.ability;
 const slug={"氷結師":"frost-mage","雷術師":"thunder-mage","黒魔導士":"dark-mage","結界術師":"barrier-mage","星詠み":"star-seer","元素術師":"elementalist"}[evo.name];
 const card=$(".class-evo-card");card.style.setProperty("--evo-art","url('./assets/classes/"+slug+".png')");
 const f=state.usage.families;$("#classEvoReason").textContent="このランの使用傾向：氷 "+f.ice+" / 雷 "+f.lightning+" / 闇 "+f.dark+" / 結界 "+f.guard+" / 集中 "+f.focus;
 $("#classEvolution").classList.add("show");
}
$("#acceptClassEvo").onclick=()=>{
 state.classEvoApplied=true;
 $("#classEvolution").classList.remove("show");
 log.textContent=state.classEvo.name+"へ進化した。固有能力を試そう。";
 prepareBattle(state.nextBattle||4);
};

document.querySelectorAll("[data-reward]").forEach(b=>b.onclick=()=>finishReward(b.dataset.reward));
$("#skipReward").onclick=()=>finishReward(null);
function maybeEvolveBeforeBoss(n){
 if(n===4&&!state.classEvoApplied){showClassEvolution();return true}
 return false;
}
function prepareBattle(n){
 state.battle=n;state.enemyTurn=1;
 const hpByBattle={1:48,2:62,3:74,4:94};
 state.maxEnemy=hpByBattle[n]||62;state.enemyHp=state.maxEnemy;
 state.energy=3;state.block=(state.classEvoApplied&&state.classEvo?.name==="結界術師")?4:0;
 state.spellsThisTurn=0;state.lastSpellFamily=null;
 state.focus=state.nextBattleFocus||state.sanctumBlessing;state.nextBattleFocus=false;state.sanctumBlessing=false;
 state.weak=false;state.frozen=false;state.enemyPenalty=0;state.enemyCharge=0;state.reflect=0;
 state.hand=[];state.draw=shuffle([...state.draw,...state.discard]);state.discard=[];drawTo(5);
 const names={1:"スケルトンナイト",2:"亡霊騎士",3:"石像魔導兵",4:"古城の守護者"};
 const intros={1:"第1戦：スケルトンナイト",2:"第2戦：亡霊騎士。攻撃と呪詛が交互に来る",3:"深部戦：石像魔導兵。溜めから強打を狙う",4:"最終戦：古城の守護者。進化した力で挑もう"};
 $("#enemyName").textContent=names[n]||"亡霊騎士";
 const enemyArt={1:"./assets/enemies/file_00000000f45082099c3eb3dc4f816258.png",2:"./assets/enemies/wraith-knight.png",3:"./assets/enemies/stone-magus.png",4:"./assets/enemies/castle-guardian.png"};
 const enemyImg=$("#skeleton");const target=enemyArt[n];
 if(n===1)enemyImg.src=target;
 else{const probe=new Image();probe.onload=()=>enemyImg.src=target;probe.src=target}
 log.textContent=intros[n]||"戦闘開始";render()
}
function updateDungeonMap(){
 document.querySelectorAll(".dnode").forEach(n=>{if(n.classList.contains("start"))return;n.classList.remove("available");n.classList.add("locked")});
 let ids=state.routeDepth===1?["enemy","event","shop"]:
         state.routeDepth===2?["elite","rest","treasure"]:
         state.routeDepth===3?["battle3","treasure2"]:
         state.routeDepth===4?["forge","sanctum"]:
         ["boss"];
 ids.forEach(id=>{const n=document.querySelector('[data-node="'+id+'"]');if(n){n.classList.remove("locked");n.classList.add("available")}});
}

const FUSION_RECIPES=[
 {a:"ice",b:"ice",out:"iceSpear"},
 {a:"ice",b:"focus",out:"blizzard"},
 {a:"bolt",b:"focus",out:"chainBolt"},
 {a:"dark",b:"dark",out:"abyss"},
 {a:"guard",b:"dark",out:"mirror"},
 {a:"guard",b:"focus",out:"manaBarrier"}
];
function allDeckCards(){return [...state.draw,...state.discard,...state.hand]}
function cardCount(id){return allDeckCards().filter(x=>x===id).length}
function canFuse(r){return r.a===r.b?cardCount(r.a)>=2:cardCount(r.a)>=1&&cardCount(r.b)>=1}
function removeOneFromDeck(id){
 for(const pile of [state.hand,state.draw,state.discard]){
  const i=pile.indexOf(id);if(i>=0){pile.splice(i,1);return true}
 }
 return false
}
function openFusion(){
 $("#mapScreen").classList.remove("show");
 const box=$("#fusionOptions");box.innerHTML="";
 const available=FUSION_RECIPES.filter(canFuse);
 if(!available.length){
  box.innerHTML='<p class="fusion-empty">今のデッキでは合成できる組み合わせがない。</p>';
 }else{
  available.forEach(r=>{
   const b=document.createElement("button");b.className="fusion-choice";
   b.innerHTML='<span>'+CARD[r.a].name+' ＋ '+CARD[r.b].name+'</span><strong>→ '+CARD[r.out].name+'</strong><small>'+CARD[r.out].text+'</small>';
   b.onclick=()=>completeFusion(r);box.appendChild(b)
  })
 }
 $("#fusionScreen").classList.add("show")
}
function completeFusion(r){
 removeOneFromDeck(r.a);removeOneFromDeck(r.b);state.discard.push(r.out);state.fusions.push(r.out);
 $("#fusionScreen").classList.remove("show");
 advanceMapAfterEvent("合成完了："+CARD[r.out].name)
}
function advanceMapAfterEvent(message){
 state.roomsCleared++;state.routeDepth++;updateDungeonMap();
 $("#mapHint").textContent=message||(
  state.routeDepth===2?"危険な道か、準備を整える道か。":
  state.routeDepth===3?"古城の深部へ進む。":
  state.routeDepth===4?"最後の準備を選ぶ。":"守護者への道が開いた。");
 $("#mapScreen").classList.add("show");render()
}

function openEvent(type){
 $("#mapScreen").classList.remove("show");$("#eventScreen").classList.add("show");
 const kind=$("#eventKind"),title=$("#eventTitle"),txt=$("#eventText"),reward=$("#eventReward");reward.textContent="";
 if(type==="shop"){kind.textContent="MERCHANT";title.textContent="旅の商人";txt.textContent="試作：魔力を整え、HPを6回復した。";state.playerHp=Math.min(60,state.playerHp+6)}
 if(type==="event"){kind.textContent="UNKNOWN";title.textContent="青白い泉";txt.textContent="泉の魔力がカードに宿る。次の戦闘で集中状態から始まる。";state.nextBattleFocus=true}
 if(type==="rest"){kind.textContent="REST";title.textContent="静かな篝火";txt.textContent="休息してHPを12回復した。";reward.textContent="HP +12";state.playerHp=Math.min(60,state.playerHp+12)}
 if(type==="treasure"){kind.textContent="TREASURE";title.textContent="封印された宝箱";const weapons=[{name:"氷晶の杖",family:"ice"},{name:"雷鳴の宝珠",family:"lightning"},{name:"黒曜の魔導書",family:"dark"}];state.weapon=weapons[Math.floor(Math.random()*weapons.length)];txt.textContent="装備を発見した。装備はこのラン中、対応する魔法を強化する。";reward.textContent="装備："+state.weapon.name}
 if(type==="shop")reward.textContent="HP +6";
 if(type==="event")reward.textContent="次戦：集中状態";
 if(type==="sanctum"){kind.textContent="SANCTUM";title.textContent="星読みの祭壇";txt.textContent="祭壇の魔力を受け、次の戦闘を集中状態で開始する。";state.sanctumBlessing=true;state.playerHp=Math.min(60,state.playerHp+6);reward.textContent="HP +6 / 次戦：集中"}
}
document.querySelectorAll(".dnode[data-type]").forEach(n=>n.onclick=()=>{
 if(!n.classList.contains("available"))return;
 const type=n.dataset.type;n.classList.remove("available");n.classList.add("cleared");
 if(type==="forge"){openFusion();return}
 if(type==="event"||type==="shop"||type==="rest"||type==="treasure"||type==="sanctum"){openEvent(type);return}
 $("#mapScreen").classList.remove("show");
 if(type==="enemy"){prepareBattle(2)}
 else if(type==="elite"){prepareBattle(2);state.maxEnemy=72;state.enemyHp=72;state.enemyCharge=2;$("#enemyName").textContent="亡霊騎士・精鋭";log.textContent="エリート戦：強敵だが突破すれば報酬を得られる";render()}
 else if(type==="battle3"){prepareBattle(3)}
 else if(type==="boss"){
 state.nextBattle=4;
 if(!maybeEvolveBeforeBoss(4))prepareBattle(4)
}
});
$("#eventContinue").onclick=()=>{$("#eventScreen").classList.remove("show");state.roomsCleared++;state.routeDepth++;updateDungeonMap();$("#mapHint").textContent=state.routeDepth===2?"危険な道か、準備を整える道か。":state.routeDepth===3?"古城の深部へ進む。":state.routeDepth===4?"最後の準備を選ぶ。":"守護者への道が開いた。";$("#mapScreen").classList.add("show");render()};
const fsBtn=$("#fullscreenBtn");if(fsBtn)fsBtn.onclick=async()=>{try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock("landscape").catch(()=>{})}else await document.exitFullscreen()}catch(e){}};
document.addEventListener("fullscreenchange",()=>{if(fsBtn)fsBtn.textContent=document.fullscreenElement?"×":"⛶"});
shuffle(state.draw);drawTo(5);render();
$("#restartRun").onclick=()=>location.reload();
$("#retryRun").onclick=()=>location.reload();
$("#skipFusion").onclick=()=>{$("#fusionScreen").classList.remove("show");advanceMapAfterEvent("合成せず先へ進んだ")};
