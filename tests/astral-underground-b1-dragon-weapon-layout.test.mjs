import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../v4-1/underground-b1-playtest.html",import.meta.url),"utf8");
const weaponCss=readFileSync(new URL("../v4-1/underground-b1-reward-shop-status.css",import.meta.url),"utf8");
const dragonCss=readFileSync(new URL("../v4-1/underground-b1-phone-hand-visibility.css",import.meta.url),"utf8");
const portraitCss=readFileSync(new URL("../v4-1/underground-b1-dragon-visuals.css",import.meta.url),"utf8");

test("weapon screen uses a dedicated overlay state that is removed between scenes",()=>{
 assert.match(html,/panel\.classList\.toggle\("b1-weapon-open",s\.phase==="between"&&Boolean\(s\.weaponPending\)\)/);
 assert.match(html,/site\.hidden=false;choices\.replaceChildren\(\)/);
 assert.match(html,/game\.chooseWeapon\(id\)/);
 assert.match(html,/game\.chooseWeapon\(null\)/);
 assert.match(html,/id="weaponChoices"[^>]*aria-label="武器を選ぶ"/);
});

test("weapon overlay allocates actual bounded height and a 3-column row",()=>{
 const css=weaponCss.slice(weaponCss.indexOf("/* B1 visual repair:"));
 assert.ok(css.length>2500,"must have dedicated layout rules");
 assert.match(css,/#journeyPanel\.b1-weapon-open > \.pilot-overlay-window\{/);
 assert.match(css,/display:flex;flex-direction:column/);
 assert.match(css,/height:min\(440px,calc\(100dvh - 24px\)\)/);
 assert.match(css,/#journeyPanel\.b1-weapon-open #weaponSite\.b1-weapon-site\{[\s\S]*?min-height:0/);
 assert.match(css,/#journeyPanel\.b1-weapon-open #weaponChoices\.b1-weapon-choices\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-rows:minmax\(0,1fr\);grid-auto-rows:minmax\(0,1fr\)/);
 assert.match(css,/flex:1 1 0%;width:100%;height:auto;min-height:0/);
 assert.match(css,/#journeyPanel\.b1-weapon-open #weaponChoices \.b1-weapon-choice\{[\s\S]*?min-height:0/);
 assert.match(css,/#journeyPanel\.b1-weapon-open #weaponSite \.b1-weapon-skip\{[\s\S]*?flex:0 0 auto/);
 assert.match(css,/@media \(orientation:landscape\) and \(max-height:620px\)/);
 assert.match(css,/@media \(orientation:portrait\) and \(max-width:580px\)/);
});

test("dragon portrait moves from the middle to a smaller upper-left safe area",()=>{
 const css=dragonCss.slice(dragonCss.indexOf("/* B1 dragon display repair:"));
 assert.ok(css.length>800);
 assert.match(css,/#playScreen \.stage #b1DragonCompanion\{[\s\S]*?left:clamp\(12px,4\.5vw,72px\)/);
 assert.match(css,/top:clamp\(105px,27%,184px\)/);
 assert.match(css,/bottom:auto;right:auto/);
 assert.match(css,/width:clamp\(65px,8\.2vw,106px\)/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/@media \(orientation:landscape\) and \(max-height:620px\)/);
 assert.match(css,/top:clamp\(72px,25%,124px\)/);
 assert.match(css,/width:clamp\(44px,6\.7vw,70px\)/);
 assert.match(portraitCss,/\.pilot-mode \.b1-dragon-portrait::before\{width:104cqw/,"existing dragon sprite rendering stays intact");
 assert.match(html,/const dragonVisual=getB1DragonVisual\(s\.dragonStage\)/);
 assert.match(html,/companion\.hidden=!dragonVisual/);
});

test("bump installed PWA build in sync across HTML, JS and public release file",()=>{
 const js=readFileSync(new URL("../v4-1/b1-update.mjs",import.meta.url),"utf8");
 const release=JSON.parse(readFileSync(new URL("../v4-1/b1-release.json",import.meta.url),"utf8"));
 assert.match(release.build,/^[0-9]{4}[.][0-9]{2}[.][0-9]{2}[.][0-9]+$/);
 assert.ok(html.includes('data-b1-build="'+release.build+'"'));
 assert.ok(js.includes('B1_BUILD = "'+release.build+'"'));
});
