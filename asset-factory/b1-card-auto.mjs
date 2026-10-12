/**
 * B1 card-only autonomous art pass.  One pending card per invocation.
 * Separate from the puppet-v2 human-gated Asset Factory queue.
 * Generates at most ONE image request and ONE visual QA request per run.
 * Never publishes a failed candidate or overwrites an existing original.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {pathToFileURL} from "node:url";
import {generateImage,visionQa} from "./lib/openai.mjs";

const ROOT=process.cwd();
export const QUEUE_FILE="asset-factory/b1-card-queue.json";
export const INDEX_FILE="v4-1/b1-auto-card-index.mjs";
const ASSET_DIR="v4-1/assets";

export function nextCard(queue){
 if(queue.enabled!==true)return null;
 const max=Math.max(1,Math.min(2,Number(queue.max_total_attempts)||2));
 return (queue.jobs||[]).filter(j=>j.status==="waiting"&&(j.attempts||0)<max)
  .sort((a,b)=>a.priority-b.priority)[0]||null;
}
export function artPrompt(queue,job){
 return [queue.art_direction,
  "カード名は画像内に描かず、以下の主題の絵だけを描く。",
  "主題："+job.subject,
  "効果："+job.name,
  "背景は暗い城や迷宮のファンタジー世界。ただし人物の登場は任意。",
  "縦長カード用の1枚絵。主役は画面の上寄り中央。目立つ形を大きく、必要な箇所は丁寧に描写。テキスト、文字、数字、UI、フレームなし。",
 ].join("\n");
}
export function buildIndex(queue){
 const ok=(queue.jobs||[]).filter(j=>j.status==="published");
 const map=Object.fromEntries(ok.map(j=>[j.card_id,j.filename]));
 return "// QA合格後にカード専用のGitHub Actionsが更新する原画一覧。\n"
 + "// 未公開カードはここに載せない。画像がない場合は従来のCSSへ戻す。\n"
 + "export const B1_AUTO_CARD_ART = Object.freeze("+JSON.stringify(map,null,2)+");\n";
}
export function markFailure(job,queue,why){
 job.attempts=(job.attempts||0)+1;
 job.status=job.attempts>=Math.min(2,queue.max_total_attempts||2)?"needs_fix":"waiting";
 job.last_error=String(why||"QA failed").slice(0,350);
}
async function writeQueue(queue){
 await fs.writeFile(path.join(ROOT,QUEUE_FILE),JSON.stringify(queue,null,2)+"\n");
}
export async function run(){
 const queue=JSON.parse(await fs.readFile(path.join(ROOT,QUEUE_FILE),"utf8"));
 const job=nextCard(queue);
 if(!job){console.log("[b1-card-art] Nothing scheduled. Queue complete or paused.");return;}
 if(!process.env.OPENAI_API_KEY){console.log("[b1-card-art] OPENAI_API_KEY not connected. No paid image requests made.");return;}
 if(!/^[a-z][a-zA-Z0-9]*$/.test(job.card_id)||job.filename!==`b1-auto-${job.card_id}.webp`)throw Error("unsafe filename");
 const final=path.join(ROOT,ASSET_DIR,job.filename);
 try{await fs.access(final);console.error("[b1-card-art] Existing image not overwritten: "+job.filename);job.status="needs_fix";job.last_error="existing image not overwritten";await writeQueue(queue);return;}catch(e){if(e.code!=="ENOENT")throw e;}
 const prompt=artPrompt(queue,job);
 const spec={type:"card",name:job.name,prompt,transparent:false,aspect_ratio:"2:3",image_quality:"medium",negative:["letters","UI","frame","contact sheet"],art_direction_override:queue.art_direction};
 console.log("[b1-card-art] generating ONE image: "+job.card_id);
 try{
  const generated=await generateImage(spec,prompt,ROOT);
  const inputMeta=await sharp(generated.buffer).metadata();
  if(inputMeta.width<768||inputMeta.height<1024)throw Error("source image resolution too low");
  const image=await sharp(generated.buffer).resize(768,1024,{fit:"cover",position:"north"}).webp({quality:83,effort:6}).toBuffer();
  const qaPng=await sharp(image).png().toBuffer();
  // Fail closed when the semantic QA is unavailable; do not silently publish unreviewed art.
  const qa=await visionQa({art_direction:queue.art_direction},spec,qaPng,
   {pass:true,format:"png",width:768,height:1024,aspect_ratio:"3:4",transparent:false},ROOT);
  job.attempts=(job.attempts||0)+1;
  job.qa_score=Number(qa.score)||0;
  if(qa.pass!==true||job.qa_score<75){
   job.status=job.attempts>=Math.min(2,queue.max_total_attempts||2)?"needs_fix":"waiting";
   job.last_error=String(qa.remediation||qa.issues?.join("; ")||"QA rejected").slice(0,350);
   console.warn("[b1-card-art] rejected: "+job.card_id+" score="+job.qa_score);
   await writeQueue(queue);return;
  }
  await fs.mkdir(path.dirname(final),{recursive:true});
  await fs.writeFile(final,image,{flag:"wx"});
  const verify=await sharp(await fs.readFile(final)).metadata();
  if(verify.format!=="webp"||verify.width!==768||verify.height!==1024)throw Error("saved image validation failed");
  job.status="published";job.updated_at=new Date().toISOString();
  job.bytes=image.length;job.last_error=null;
  queue.generated_count=(queue.generated_count||0)+1;
  await writeQueue(queue);
  await fs.writeFile(path.join(ROOT,INDEX_FILE),buildIndex(queue));
  console.log("[b1-card-art] published "+job.card_id+" as "+job.filename+" ("+image.length+" bytes)");
 }catch(err){
  if(!job.attempts || job.status==="waiting")markFailure(job,queue,err.message);
  await writeQueue(queue);
  console.error("[b1-card-art] generated image not published: "+job.card_id+": "+String(err.message).slice(0,200));
  throw err;
 }
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)
 await run();
