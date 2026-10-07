import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const ctx = {};
for (const file of ['planning-engine.js','fan-card-text.js']) vm.runInNewContext(read('v4-1/' + file),ctx);
const E=ctx.ShinkaV43,format=ctx.ShinkaFanText.format;
function preview(id,changes={},discard=[]) {
 const game=E.createGame(E.seededRandom(27));game.start();const save=game.exportSave(),s=save.state;
 Object.assign(s,{hand:[id],draw:Array(9-discard.length).fill('guard'),discard,exhaust:[],energy:5},changes);
 s.deck=[...s.hand,...s.draw,...s.discard];assert.equal(game.restoreSave(save),true);return game.previewCard(0);
}
test('Noa selected-card text exposes zero/positive reservations, recover conditions and reflection formula',()=>{
 for(const block of [0,15]){const text=format(preview('starRelay',{block}));assert(text.summary.includes(`次ターン防御${Math.min(10,block)}`));assert(text.rules.includes(`今の防御${block}をすべて消費`));assert(text.rules.includes('次ターンの終わりまで'));}
 for(const turn of [1,2]){const text=format(preview('quietComet',{turn}));assert(text.summary.includes(`攻撃${turn===2?20:10}`));assert(text.rules.includes(turn===2?'（成立）':'（未成立）'));}
 const text=format(preview('mirrorLance',{reflect:20}));assert(text.summary.includes('攻撃14'));assert(text.rules.includes('反射20をすべて消費'));assert(text.rules.includes('反射の2倍'));assert(text.rules.includes('追加上限10'));
});
test('Bookmark text names the exact upgraded target or absence and never promises an immediate draw',()=>{
 const yes=format(preview('starBookmark',{},['bolt+','guard']));assert(yes.summary.includes('山札の上へ：雷撃＋'));assert(yes.rules.includes('今は引かない'));assert(yes.rules.includes('消滅'));
 const no=format(preview('starBookmark',{},['guard']));assert(no.summary.includes('戻せる攻撃札なし'));assert(no.summary.includes('防御2'));
});
test('Noa assets are in the release manifest and every mode entry names the current card count',()=>{
 const files=JSON.parse(read('tools/astral-files.json')),planning=read('v4-1/planning.html');
 for(const name of ['librarian-noa','star-relay','quiet-comet','mirror-lance','star-bookmark']){assert(files.includes(`./assets/${name}.webp`));assert(fs.statSync(new URL(`../v4-1/assets/${name}.webp`,import.meta.url)).size>1000);}
 for(const art of ['starRelay','quietComet','mirrorLance','starBookmark'])assert(planning.includes(`data-card-art="${art}"`));
 for(const file of ['v4-1/index.html','v4-1/game.js','v4-1/planning.html','v4-1/planning-game.js']){const text=read(file);assert(text.includes('55枚'));assert(!text.includes('34枚'));}
 assert(planning.includes('55種類'));assert(read('v4-1/planning-game.js').includes('星綴りの司書ノア'));
});
test('Mirror Lance art keeps its upper-right spearhead in responsive crops',()=>{
 assert.match(read('v4-1/planning.css'),/\.planning-mode\s+\.card-art\[src\$="mirror-lance\.webp"\]\s*\{\s*object-position:\s*right\s+top\s*\}/);
});
