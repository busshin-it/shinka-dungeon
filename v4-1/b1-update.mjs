// B1-specific manual refresh control. No service worker registration, no
// cache deletion, and no automatic reload during an active run.
export const B1_BUILD = "2026.10.14.4";

export function initB1Updater(win = window, doc = document){
 const button=doc.getElementById("b1MobileUpdate");
 const version=doc.getElementById("b1MobileVersion");
 const status=doc.getElementById("b1MobileUpdateStatus");
 if(!button||!version||!status)return false;
 const installedBuild=doc.documentElement?.dataset?.b1Build||B1_BUILD;
 version.textContent="表示中: "+installedBuild;
 button.addEventListener("click",async()=>{
  if(button.disabled)return;
  button.disabled=true;
  status.textContent="公開版を確認中…";
  try{
   const release=new URL("./b1-release.json",win.location.href);
   release.searchParams.set("_check",String(Date.now()));
   const response=await win.fetch(release.href,{cache:"no-store"});
   if(!response.ok)throw new Error("build fetch failed");
   const info=await response.json();
   if(typeof info.build!=="string"||!info.build)throw new Error("build field missing");
   const changed=info.build!==installedBuild;
   status.textContent=changed?"新しい版: "+info.build:"公開版を確認済み: "+info.build;
   const message=(changed?"新しい版を読み込みます。":"公開版を再読み込みします。")+
    "\n現在の戦闘の進行が失われる可能性があります。続けますか？";
   if(!win.confirm(message))return;
   status.textContent="再読み込み中…";
   // A unique navigation URL bypasses stale document caches in an installed
   // Android web app. Do not mutate cookies, localStorage or other app data.
   const page=new URL(win.location.href);
   page.searchParams.set("b1-refresh",Date.now().toString());
   win.location.assign(page.href);
  }catch{
   status.textContent="更新を確認できません。通信状態を確認して再試行してください。";
  }finally{button.disabled=false;}
 });
 return true;
}
if(typeof document!=="undefined")initB1Updater(window,document);
