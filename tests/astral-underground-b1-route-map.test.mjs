import test from "node:test";
import assert from "node:assert/strict";
import {createB1RouteMap,availableB1Rooms,chooseB1Room,validateB1Route} from "../v4-1/underground-b1-route-map.mjs";
test("15 floors, mandatory first battles, floor 8 treasure, floor 15 rest, boss 16",()=>{
 const map=createB1RouteMap(1234);
 assert.equal(map.floors.length,15);
 assert.equal(map.boss.floor,16);
 assert.ok(map.floors[0].every(x=>x.type==="battle"));
 assert.ok(map.floors[7].every(x=>x.type==="treasure"));
 assert.ok(map.floors[14].every(x=>x.type==="rest"));
});
test("the same seed builds exactly the same connected map",()=>{
 assert.deepEqual(createB1RouteMap(45),createB1RouteMap(45));
 assert.notDeepEqual(createB1RouteMap(45),createB1RouteMap(46));
 for(let seed=1;seed<=100;seed++){
  const map=createB1RouteMap(seed);
  let path=[];
  while(path.length<15){
   const choices=availableB1Rooms(map,path);
   assert.ok(choices.length>0);
   path=chooseB1Room(map,path,choices[choices.length-1]);
   assert.ok(path);
  }
  assert.deepEqual(availableB1Rooms(map,path),["boss"]);
  assert.ok(validateB1Route(map,[...path,"boss"]));
 }
});
test("cannot jump floors, select disconnected nodes, repeat nodes or forge route",()=>{
 const map=createB1RouteMap(9);
 assert.equal(chooseB1Room(map,[],"boss"),null);
 const first=chooseB1Room(map,[],"f1-l0");
 assert.ok(first);
 assert.equal(chooseB1Room(map,first,"f3-l0"),null);
 assert.equal(chooseB1Room(map,first,"f1-l0"),null);
 assert.equal(validateB1Route(map,["f1-l0","f3-l0"]),false);
});
