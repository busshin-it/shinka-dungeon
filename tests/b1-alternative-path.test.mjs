import test from "node:test";
import assert from "node:assert/strict";
import {getB1AlternativePathHint} from "../v4-1/underground-b1-alternative-path.mjs";

test("no alternative hint without weapon or for matching weapon synergy",()=>{
 assert.equal(getB1AlternativePathHint(null,{lightning:true},false),null);
 assert.equal(getB1AlternativePathHint("thunderStaff",{lightning:true},true),null);
});
test("off-weapon path shows a truthful label without changing cards",()=>{
 const card={kind:"guard",block:5};
 const original=structuredClone(card);
 assert.equal(getB1AlternativePathHint("oldClub",card,false).label,"別軸：防御");
 assert.deepEqual(card,original);
 assert.equal(getB1AlternativePathHint("oldClub",{kind:"attack",weapon:true},false),null);
});
test("dragon label names the egg prerequisite",()=>{
 assert.match(getB1AlternativePathHint("oldClub",{kind:"dragonFeed"},false).detail,/竜の卵/);
});
