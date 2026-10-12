import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { generateImage } from './lib/openai.mjs';

// Isolated card-only batch. Never touches the character/puppet queue or its human gate.
// Approved game's existing art is never overwritten.
const CARDS = [
  { id:'scatter', name:'散弾', effect:'敵全体へ6ダメージ', subject:'複数の敵へ飛散する紫色の魔力弾', composition:'奥から手前へ放射状に広がる魔力の衝撃', colors:'紫と薄紅' },
  { id:'chain', name:'連鎖雷', effect:'先の攻撃と連携して威力が増す雷', subject:'敵の間を連続して跳ねる青白い稲妻', composition:'三つの敵影をジグザグにつなぐ雷光', colors:'群青と電光白' },
  { id:'heal', name:'小治癒', effect:'HPを6回復', subject:'割れた小さな護符から放たれる再生の光', composition:'暗い手元へ柔らかな緑の光が集まる近景', colors:'翡翠と金' },
  { id:'drain', name:'吸命', effect:'敵にダメージを与え体力を回復', subject:'倒れかけた敵から術者の手へ流れる生命の粒子', composition:'対角線に引き寄せられる赤紫の生命の光', colors:'深紅と菫' },
  { id:'poison', name:'毒の印', effect:'毒を蓄積させる呪印', subject:'石に焼き付いた毒の紋章と緑の霧', composition:'大きな呪印の近接画面、背後に古い石壁', colors:'翠緑と黒' }
];
const root=process.cwd();
const outDir=path.join(root,'v4-1/assets');
const max=Math.min(2,Math.max(1,Number(process.env.CARD_ART_BATCH_LIMIT||1)));
const run=async()=>{
 await fs.mkdir(outDir,{recursive:true});
 let made=0;
 for(const card of CARDS){
  if(made>=max) break;
  const filename='b1-auto-'+card.id+'.webp';
  const full=path.join(outDir,filename);
  try { await fs.access(full); console.log('skip existing',filename); continue; } catch {}
  const prompt=`High quality detailed Japanese fantasy game 2D illustration, painterly light and rich shadows, vivid but controlled colors, coherent polished card-art style. SINGLE illustration, vertical composition. Subject: ${card.subject}. Action and composition: ${card.composition}. Main palette: ${card.colors}. Card meaning: ${card.effect}. Readable at thumbnail size; central clear focal point, atmospheric supporting background. No card border, no lettering, no numbers, no logo, no watermark, no interface. Do not add a dragon or generic recurring female character. No montage. Original character and composition, not a copy of any existing game art.`;
  const job={asset_id:'b1-card-'+card.id,type:'card',name:card.name,aspect_ratio:'3:4',transparent:false,image_quality:'high'};
  const result=await generateImage(job,prompt,root);
  // generateImage returns buffer or result wrapper depending on factory version.
  const buffer=Buffer.isBuffer(result)?result:(result?.buffer||result?.image);
  if(!Buffer.isBuffer(buffer)) throw new Error('Unexpected image result shape: refusing to save an invalid asset');
  const meta=await sharp(buffer).metadata();
  if(meta.width<700||meta.height<900) throw new Error('Generated illustration too small');
  await sharp(buffer).resize(768,1024,{fit:'cover',position:'attention'}).webp({quality:83}).toFile(full);
  const verify=await sharp(full).metadata();
  if(verify.width!==768||verify.height!==1024||verify.format!=='webp') throw new Error('Post-processing check failed');
  console.log('generated',card.id,filename);
  made++;
 }
 console.log('Generated '+made+' card illustration(s); existing game image mapping is intentionally unchanged.');
};
run().catch(e=>{console.error(e);process.exitCode=1;});
