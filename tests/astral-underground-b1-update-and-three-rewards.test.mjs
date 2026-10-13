import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {B1_BUILD,initB1Updater} from "../v4-1/b1-update.mjs";
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../v4-1/underground-b1-phone-hand-visibility.css",import.meta.url),"utf8");
const release=JSON.parse(readFileSync(new URL("../v4-1/b1-release.json",import.meta.url),"utf8"));

test("visible installed version and public release descriptor are aligned",()=>{
 assert.equal(release.build,B1_BUILD);
 assert.ok(html.includes('data-b1-build="'+B1_BUILD+'"'));
 assert.match(html,/id="b1MobileUpdate"[^>]*>最新版に更新/);
 assert.match(html,/id="b1MobileVersion"/);
 assert.match(html,/id="b1MobileUpdateStatus"[^>]*aria-live="polite"/);
 assert.match(html,/src="\.\/b1-update\.mjs"/);
});
test("landscape reward: 3 columns stay visible in the viewport and names precede full effects",()=>{
 const block=css.slice(css.indexOf("/* B1 2026-10-14: Android landscape reward"));
 assert.ok(block.length>3500,"landscape reward final override exists");
 assert.match(block,/@media \(orientation:landscape\) and \(max-width:1100px\) and \(max-height:620px\)/);
 assert.match(block,/#rewardCards\.pilot-rewards\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(block,/grid-template-rows:minmax\(0,1fr\)/);
 assert.match(block,/overflow:hidden;align-items:stretch;align-content:stretch/);
 assert.match(block,/height:100%;min-height:0;max-height:none/);
 assert.match(block,/height:35%;min-height:0;max-height:none/);
 assert.match(block,/flex:0 0 35%/);
 assert.match(block,/\.pilot-card-copy strong\{[\s\S]*?position:static/);
 assert.match(block,/\.pilot-card-copy \.desc\{[\s\S]*?overflow:visible/);
 assert.match(block,/-webkit-line-clamp:unset;line-clamp:unset/);
 assert.match(html,/game\.chooseReward\(id\)/);
 assert.match(html,/rewards\.hidden=false;skip\.hidden=false/);
});
test("only the mobile battle hand loses decorative frame lines",()=>{
 const block=css.slice(css.indexOf("/* Decorative outlines are noisy"));
 assert.match(block,/#playScreen #hand\.hand \.pilot-card\.b1-arcane-card/);
 assert.match(block,/content:none;display:none/);
 assert.match(block,/border:1px solid #aa956f88/);
 assert.match(block,/\.b1-picked\{/);
 assert.match(block,/:focus-visible\{/);
 assert.doesNotMatch(block,/#rewardCards/,"do not change reward framing");
});
function setup({online=true,newVersion="2026.10.15.1",allow=true}={}){
 let handler,assigns=[],fetches=[],confirmMessages=[];
 const version={textContent:""},status={textContent:""},button={disabled:false,addEventListener:(type,fn)=>{assert.equal(type,"click");handler=fn;}};
 const doc={documentElement:{dataset:{b1Build:B1_BUILD}},getElementById:(id)=>({
  b1MobileUpdate:button,b1MobileVersion:version,b1MobileUpdateStatus:status
 })[id]};
 const win={
  location:{href:"https://example.org/shinka-dungeon/v4-1/underground-b1-playtest.html",assign:(url)=>assigns.push(url)},
  fetch:async(url,opts)=>{fetches.push([url,opts]);if(!online)throw Error("offline");return {ok:true,json:async()=>({build:newVersion})};},
  confirm:(msg)=>{confirmMessages.push(msg);return allow;}
 };
 assert.equal(initB1Updater(win,doc),true);
 return {button,version,status,click:()=>handler(),assigns,fetches,confirmMessages};
}
test("update checks network bypassing caches and warns before leaving current game",async()=>{
 const t=setup();
 assert.match(t.version.textContent,/表示中/);
 await t.click();
 assert.equal(t.fetches.length,1);
 assert.equal(t.fetches[0][1].cache,"no-store");
 assert.match(t.fetches[0][0],/b1-release\.json\?_check=/);
 assert.equal(t.assigns.length,1);
 assert.match(t.confirmMessages[0],/進行が失われる可能性/);
 assert.match(t.assigns[0],/b1-refresh=/);
 assert.equal(t.button.disabled,false);
});
test("cancel or offline never destroys the current in-memory run",async()=>{
 const declined=setup({allow:false});await declined.click();
 assert.equal(declined.assigns.length,0);
 const offline=setup({online:false});await offline.click();
 assert.equal(offline.assigns.length,0);
 assert.match(offline.status.textContent,/確認できません/);
});
test("checking same version remains possible, and reload still asks permission",async()=>{
 const t=setup({newVersion:B1_BUILD});await t.click();
 assert.match(t.status.textContent,/再読み込み中/);
 assert.equal(t.assigns.length,1);
});
