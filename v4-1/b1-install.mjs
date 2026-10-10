// Install prompt for the standalone B1 playtest only.
// Does not register or modify the signed legacy service worker.
export function b1IsAppMode(win=window){
 return Boolean(win.matchMedia?.("(display-mode: standalone)")?.matches||
                win.matchMedia?.("(display-mode: fullscreen)")?.matches||
                win.navigator?.standalone===true);
}
export function initB1Install(win=window,doc=document){
 const button=doc.getElementById("b1Install");
 const guide=doc.getElementById("b1InstallGuide");
 const close=doc.getElementById("b1InstallGuideClose");
 if(!button||!guide||!close)return false;
 let deferred=null;
 const isInstalled=()=>b1IsAppMode(win);
 const update=()=>{button.hidden=isInstalled();};
 update();
 const showGuide=()=>{if(!guide.open)guide.showModal();};
 close.addEventListener("click",()=>guide.close());
 button.addEventListener("click",async()=>{
  if(deferred){
   const requested=deferred;deferred=null;
   try{await requested.prompt();await requested.userChoice;}
   catch{showGuide();}
   button.textContent="アプリにする";
  }else showGuide();
 });
 win.addEventListener("beforeinstallprompt",event=>{
  if(isInstalled())return;
  event.preventDefault();
  deferred=event;
  button.textContent="インストール";
  update();
 });
 win.addEventListener("appinstalled",()=>{
  deferred=null;
  button.hidden=true;
  if(guide.open)guide.close();
 });
 win.addEventListener("pageshow",update);
 return true;
}
if(typeof document!=="undefined")initB1Install(window,document);
