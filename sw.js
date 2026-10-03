const CACHE="shinka-dungeon-v6";
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith("shinka-dungeon-")).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(fetch(event.request,{cache:"no-store"}).catch(()=>caches.match(event.request)));
});
