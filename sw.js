const CACHE="shinka-dungeon-v7";
const RUNTIME_CACHE="shinka-dungeon-runtime-v1";

self.addEventListener("install",()=>self.skipWaiting());

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys
      .filter(k=>k.startsWith("shinka-dungeon-")&&k!==CACHE&&k!==RUNTIME_CACHE)
      .map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING")self.skipWaiting();
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);

  if(url.pathname.includes("/assets/runtime/")){
    event.respondWith((async()=>{
      const cache=await caches.open(RUNTIME_CACHE);
      const cached=await cache.match(req);
      if(cached)return cached;
      const fresh=await fetch(req);
      if(fresh.ok)cache.put(req,fresh.clone());
      return fresh;
    })());
    return;
  }

  event.respondWith(fetch(req,{cache:"no-store"}).catch(()=>caches.match(req)));
});
