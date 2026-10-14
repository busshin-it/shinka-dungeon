// UI hint only. Ground suggestions in the actual card fields / equipped weapon.
// Never reroll rewards or change costs, effects, combat, or checkpoint state.
const attackKinds=new Set(["attack","multi","all"]);
export function getB1RewardWeaponAffinity(weaponId,card){
 if(!card||typeof card!=="object")return null;
 if(weaponId==="thunderStaff"&&card.lightning===true){
  return {label:"⚡ 雷連鎖",detail:"雷カードを3枚つなぐ助けになる。3枚目が攻撃なら杖が発動"};
 }
 if(weaponId==="oldClub"&&card.weapon===true&&attackKinds.has(card.kind)){
  return {label:"⚔ 初撃強化",detail:"毎ターン最初の物理攻撃に棍棒の追加ダメージ"};
 }
 if(weaponId==="mirrorStaff"&&card.kind==="guard"&&Number(card.block)>0){
  return {label:"◇ 防御連携",detail:"敵の攻撃を防ぐと、月鏡の杖が2ダメージ反射"};
 }
 if(weaponId==="dragonStaff"&&(
    card.kind==="dragon"||card.kind==="dragonFeed"||Number(card.shieldDragonGrowth)>0
  )){
  return {label:"✧ 育竜連携",detail:"竜の成長時に竜骨の杖で防御＋3"};
 }
 return null;
}
