const state={enemyHp:48,playerHp:60,energy:3,block:0,focus:false,weak:false,frozen:false,busy:false,iceEvo:null};
const $=s=>document.querySelector(s), wait=ms=>new Promise(r=>setTimeout(r,ms));
const mage=$(".actor.player"),foe=$(".actor.foe"),dmg=$("#damageText"),log=$("#battleLog");
function render(){
 $("#enemyHp").textContent=state.enemyHp;$("#enemyHpBar").style.width=(state.enemyHp/48*100)+"%";
 $("#playerHp").textContent=state.playerHp;$("#playerHpBar").style.width=(state.playerHp/60*100)+"%";
 $("#energy").textContent=state.energy;$("#playerStatus").textContent="ブロック "+state.block+(state.focus?" ｜ 集中":"");
 $("#intent").textContent=state.frozen?"次の行動：凍結中":"次の行動：斬撃 "+(state.weak?6:8);
 document.querySelectorAll(".card").forEach(c=>{let cost=+c.querySelector(".cost").textContent;c.disabled=state.busy||cost>state.energy||state.enemyHp<=0});
 if(state.enemyHp<=0){$("#victory").classList.add("show");log.textContent="勝利！"}
}
function popDamage(n,onPlayer=false){dmg.textContent="-"+n;dmg.className="damage-text"+(onPlayer?" player-dmg":"");void dmg.offsetWidth;dmg.classList.add("pop")}
async function hitEnemy(n){await wait(260);foe.classList.add("hit");state.enemyHp=Math.max(0,state.enemyHp-n);popDamage(n);render();await wait(300);foe.classList.remove("hit")}
async function cast(type,cost,base){if(state.busy||state.energy<cost||state.enemyHp<=0)return;state.busy=true;state.energy-=cost;render();mage.classList.add("cast");let n=base+(state.focus?3:0);state.focus=false;
 if(type==="ice"){log.textContent="《氷の矢》！";let fx=$("#iceFx");fx.classList.remove("fly");void fx.offsetWidth;fx.classList.add("fly");state.frozen=true}
 if(type==="bolt"){log.textContent="《雷撃》！";let fx=$("#boltFx");fx.classList.remove("strike");void fx.offsetWidth;fx.classList.add("strike")}
 if(type==="dark"){log.textContent="《闇弾》！";let fx=$("#darkFx");fx.classList.remove("fly");void fx.offsetWidth;fx.classList.add("fly");state.weak=true}
 await hitEnemy(n);mage.classList.remove("cast");state.busy=false;render()}
document.querySelector('[data-card="ice"]').onclick=()=>cast("ice",1,state.iceEvo==="spear"?10:state.iceEvo==="blizzard"?7:6);
document.querySelector('[data-card="bolt"]').onclick=()=>cast("bolt",2,11);
document.querySelector('[data-card="dark"]').onclick=()=>cast("dark",1,5);
document.querySelector('[data-card="guard"]').onclick=()=>{if(state.busy||state.energy<1)return;state.energy--;state.block+=7;log.textContent="《光壁》：7ブロック";render()};
document.querySelector('[data-card="focus"]').onclick=()=>{if(state.busy||state.focus)return;state.focus=true;log.textContent="《集中》：次の魔法 +3";render()};
$("#endTurn").onclick=async()=>{if(state.busy||state.enemyHp<=0)return;state.busy=true;render();
 if(state.frozen){log.textContent="凍結でスケルトンの動きが鈍った！";state.frozen=false;await wait(650)}
 else{let raw=state.weak?6:8;state.weak=false;log.textContent="スケルトンナイトの斬撃！";foe.classList.add("attack");await wait(260);let slash=$("#slashFx");slash.classList.remove("slash");void slash.offsetWidth;slash.classList.add("slash");mage.classList.add("hit");let n=Math.max(0,raw-state.block);state.block=Math.max(0,state.block-raw);state.playerHp=Math.max(0,state.playerHp-n);popDamage(n,true);render();await wait(420);foe.classList.remove("attack");mage.classList.remove("hit")}
 state.energy=3;state.busy=false;log.textContent=state.playerHp<=0?"敗北…":"あなたのターン";render()};
$("#rewardBtn").onclick=()=>$("#reward").classList.add("show");
document.querySelectorAll("[data-evo]").forEach(b=>b.onclick=()=>{state.iceEvo=b.dataset.evo;$("#reward").classList.remove("show");$("#victory").classList.remove("show");log.textContent=(state.iceEvo==="spear"?"《氷槍》":"《吹雪》")+"へ進化した！";document.querySelector('[data-card="ice"] strong').textContent=state.iceEvo==="spear"?"氷槍":"吹雪";render()});
render();