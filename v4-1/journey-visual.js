/* Stateless illustrations for existing routes. Reads snapshots; never changes game state. */
(() => {
 const $=s=>document.querySelector(s);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const portrait=e=>`<img class="journey-enemy ${e.art==='bowWatcher'?'watcher':e.art==='bellSpirit'?'bell':''}" src="${$('#enemyImages').content.querySelector(`[data-art="${e.art}"]`).getAttribute('src')}" alt="${esc(e.name)}">`;
 const hp=(n,max,label='HP')=>`<span class="travel-hp"><b>♥ ${n}/${max}</b><span class="travel-hp-track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${n}"><i style="width:${100*n/max}%"></i></span></span>`;
 function map(s,E){const second=s.route?[s.route==='moon'?'wraith':'stone']:['wraith','stone'];const pair=s.chapter2Options||{library:'archive',wind:'wind'};const hasCauseway=Boolean(E.tideStarSentinel);const fourth=s.route2?[s.route2==='causeway'?'tideStarSentinel':s.chapter2Encounter||pair[s.route2]]:[pair.library,pair.wind,...(hasCauseway?['tideStarSentinel']:[])];const groups=[['skeleton'],second,['trial'],fourth,['elite'],['moth']];const target=s.phase==='route'?2:s.phase==='chapter'?4:s.phase==='ready'?s.battle+1:s.battle;return `<nav class="journey-map" aria-label="全6戦の道。${hasCauseway?'第2戦は二つ、第4戦は三つの道から選びます':'第2戦と第4戦は二つの道から選びます'}">${groups.map((ids,i)=>`<div class="map-stop ${i+1<target?'visited':i+1===target?'next-stop':''}" ${i+1===target?'aria-current="step"':''}><span class="map-step">${i+1}${ids.length>1?' 分岐':''}</span><div class="map-enemies">${ids.map(id=>portrait(E[id])).join('')}</div><small>${ids.length>1?ids.length===3?'3体から1体':'どちらか1体':i===2?'第1章ボス':i===5?'最終ボス':E[ids[0]].name}</small></div>`).join('')}</nav>`;}
 function route(s,E){return `<div class="choices two visual-routes"><button class="choice" type="button" data-route="moon">${portrait(E.wraith)}<div class="route-copy"><strong>☾ 月の泉</strong><span class="boon-chip">♥ 回復 最大12</span><b>${E.wraith.name}</b><small>連撃に弱体・反射が効く</small></div></button><button class="choice" type="button" data-route="forge" ${s.hp<=6?'disabled':''}>${portrait(E.stone)}<div class="route-copy"><strong>ϟ 雷の工房</strong><span class="boon-chip risky">♥ −6 → 攻撃＋2</span><small>以後、毎ターン最初の攻撃を強化</small><b>${E.stone.name}</b><small>${s.hp<=6?'HP7以上で選べます':'詠唱を攻撃で崩せる'}</small></div></button></div>`;}
 function ready(s,e,card){const first=[...new Set([s.lastReward,s.pendingUpgrade].filter(id=>id && s.deck.includes(id)))];return `<section class="ready-scene">${portrait(e)}<div><h3>${esc(e.name)}</h3><span class="enemy-preview-hp">♥ ${e.hp}</span>${s.route2==='causeway'?'<span class="causeway-boon">星渡りの回廊 · 開始魔力3 / 上限5</span>':''}<p>${esc(e.lesson)}</p><div class="travel-summary">${hp(s.hp,s.maxHp,'旅人のHP')}<span>▤ ${s.deck.length}枚</span></div></div></section><p class="ready-preparation">${first.length?`<small>初手：${first.map(id=>esc(card(id).name)).join('・')}</small>`:''}${s.forge?'<small>ϟ 毎ターン最初の攻撃＋2</small>':''}${s.insight?'<small>▤ 初手6枚</small>':''}</p>`;}
 function rewardOpponents(s,E){
  if(s.phase!=='reward'||s.battle<1||s.battle>=6)return [];
  const paths=s.battle===1?[['moon','月の泉','wraith'],['forge','雷の工房','stone']]:s.battle===3?
   [['library','星図の書庫',s.chapter2Options.library],['wind','雷雲の渡り廊',s.chapter2Options.wind],...(E.tideStarSentinel?[['causeway','星渡りの回廊','tideStarSentinel']]:[])]:
   [[null,'次の相手',s.battle===2?'trial':s.battle===4?'elite':'moth']];
  return paths.map(([path,label,id])=>({path,label,id,name:E[id].name,hp:E[id].hp}));
 }
 function rewardPreview(s,E,pattern){
  const opponents=rewardOpponents(s,E);if(!opponents.length)return '';
  return `<details class="reward-forecast" open><summary>次の第${s.battle+1}戦を見て選ぶ${opponents.length>1?' · このあと道を選択':''}</summary><div><ul>${opponents.map(e=>`<li><strong>${esc(e.label)}：${esc(e.name)} · HP${e.hp}</strong><br>行動順：${esc(pattern(e.id))}</li>`).join('')}</ul><p>弱体・防御を使う前の基本威力です。実際のHP被害は戦闘中の予告で確認できます。</p></div></details>`;
 }
 window.ShinkaJourney=Object.freeze({portrait,hp,map,route,ready,rewardOpponents,rewardPreview});
})();
