// B1 branching route model. Independent of the legacy 12-battle save format.
export const MAP_FLOORS = 15;
export const MAP_WIDTH = 3;
export const ROOM_TYPES = Object.freeze(["battle","elite","event","shop","rest","treasure"]);
function random(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return () => ((state = (Math.imul(state,1664525) + 1013904223) >>> 0) / 4294967296);
}
const nodeId=(floor,lane)=>`f${floor}-l${lane}`;
export function createB1RouteMap(seed=1) {
  const rng=random(seed);
  const floors=[];
  for(let floor=1;floor<=MAP_FLOORS;floor++){
    const nodes=[];
    for(let lane=0;lane<MAP_WIDTH;lane++){
      let type;
      if(floor===1) type="battle";
      else if(floor===8) type="treasure";
      else if(floor===15) type="rest";
      else {
        const choices=floor<=3?["battle","battle","event"]:["battle","battle","event","elite","shop","rest"];
        type=choices[Math.floor(rng()*choices.length)];
      }
      nodes.push({id:nodeId(floor,lane),floor,lane,type,next:[]});
    }
    floors.push(nodes);
  }
  // Each floor has three valid incoming paths. Edges are acyclic and only
  // point one floor forward, so a player can never skip or revisit a room.
  for(let i=0;i<floors.length-1;i++){
    const a=floors[i],b=floors[i+1];
    for(let lane=0;lane<MAP_WIDTH;lane++) a[lane].next.push(b[lane].id);
    for(let lane=0;lane<MAP_WIDTH-1;lane++){
      if(rng()<0.65) a[lane].next.push(b[lane+1].id);
      if(rng()<0.65) a[lane+1].next.push(b[lane].id);
    }
    for(const node of a)node.next=[...new Set(node.next)].sort();
  }
  return {version:1,seed:Number(seed)>>>0,floors,boss:{id:"boss",floor:16,type:"boss"}};
}
export function availableB1Rooms(map,visited=[]) {
  if(!Array.isArray(visited))return [];
  if(visited.length===0)return map.floors[0].map(n=>n.id);
  const all=map.floors.flat();
  const last=all.find(n=>n.id===visited.at(-1));
  if(!last || visited.length!==last.floor)return [];
  if(last.floor===MAP_FLOORS)return ["boss"];
  return [...last.next];
}
export function chooseB1Room(map,visited,id){
  const options=availableB1Rooms(map,visited);
  if(!options.includes(id))return null;
  return [...visited,id];
}
export function validateB1Route(map,visited){
  if(!Array.isArray(visited))return false;
  let path=[];
  for(const id of visited){path=chooseB1Room(map,path,id);if(!path)return false;}
  return true;
}
