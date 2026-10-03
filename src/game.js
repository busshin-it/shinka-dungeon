const state={enemyHp:48,playerHp:60,energy:3,block:0,focus:false,busy:false};
const $=s=>document.querySelector(s);
const enemyHp=$("#enemyHp"), enemyBar=$("#enemyHpBar"), energy=$("#energy"), log=$("#battleLog");
const mage=$(".actor.player"), foe=$(".actor.foe"), fx=$("#iceFx"), dmg=$("#damageText");
function render(){enemyHp.textContent=state.enemyHp;enemyBar.style.width=(state.enemyHp/48*100)+"%";energy.textContent=state.energy+"/3";document.querySelectorAll(".card").forEach(c=>{const cost=+c.querySelector(".cost").textContent;c.disabled=state.busy||cost>state.energy||state.enemyHp<=0});if(state.enemyHp<=0)log.textContent="勝利！ スケルトンナイトを倒した。";}
function missingImage(img){img.style.display="none";const f=img.nextElementSibling;if(f&&f.classList.contains("fallback"))f.style.display="block"}
document.querySelectorAll(".actor img").forEach(img=>img.addEventListener("error",()=>missingImage(img)));
$("#iceFx").addEventListener("error",()=>{$("#iceFx").style.display="none"});
document.querySelectorAll(".card img").forEach(img=>img.addEventListener("error",()=>{img.style.display="none"}));
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
async function ice(){if(state.busy||state.energy<1||state.enemyHp<=0)return;state.busy=true;state.energy--;render();log.textContent="魔法師は《氷の矢》を唱えた！";mage.classList.add("cast");await wait(170);fx.classList.remove("fly");void fx.offsetWidth;fx.classList.add("fly");await wait(390);foe.classList.add("hit");const damage=6+(state.focus?3:0);state.focus=false;state.enemyHp=Math.max(0,state.enemyHp-damage);dmg.textContent="-"+damage;dmg.classList.remove("pop");void dmg.offsetWidth;dmg.classList.add("pop");render();await wait(300);mage.classList.remove("cast");foe.classList.remove("hit");state.busy=false;render()}
function guard(){if(state.busy||state.energy<1)return;state.energy--;state.block+=6;log.textContent="魔力障壁：6ブロックを得た。";render()}
function focus(){if(state.busy)return;state.focus=true;log.textContent="集中：次の魔法ダメージ+3。";document.querySelector('[data-card="focus"]').disabled=true}
document.querySelector('[data-card="ice"]').onclick=ice;document.querySelector('[data-card="guard"]').onclick=guard;document.querySelector('[data-card="focus"]').onclick=focus;
$("#endTurn").onclick=async()=>{if(state.busy||state.enemyHp<=0)return;state.busy=true;log.textContent="スケルトンナイトの攻撃！";foe.classList.add("hit");await wait(250);foe.classList.remove("hit");let damage=Math.max(0,8-state.block);state.playerHp=Math.max(0,state.playerHp-damage);state.block=0;$("#playerHp").textContent=state.playerHp;$("#playerHpBar").style.width=(state.playerHp/60*100)+"%";state.energy=3;state.busy=false;log.textContent=damage?damage+"ダメージを受けた。":"攻撃を防いだ。";render()};render();