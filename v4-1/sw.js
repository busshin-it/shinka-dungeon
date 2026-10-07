/* Isolated app worker: only this app's cache prefix and scope are managed. */
const BUILD = '4.13-ebd5c053d7f6';
const SCOPE = new URL(self.registration.scope);
const PREFIX = 'astral-v4-1:' + SCOPE.pathname + ':';
const CACHE = PREFIX + BUILD;
const FILES = ["./app.css","./assets/background.webp","./assets/bell-spirit.webp","./assets/boss.webp","./assets/bow-watcher.webp","./assets/chant-ward.webp","./assets/charge.webp","./assets/ebb-arrow.webp","./assets/ferryman-rune.webp","./assets/frost-pierce.webp","./assets/gatekeeper.webp","./assets/hero.webp","./assets/librarian-noa.webp","./assets/mirror-lance.webp","./assets/moon-mirror.webp","./assets/quiet-comet.webp","./assets/shatter.webp","./assets/shield-strike.webp","./assets/star-bookmark.webp","./assets/star-crossing-causeway.webp","./assets/star-ferry-ward.webp","./assets/star-relay.webp","./assets/tide-star-sentinel.webp","./assets/wraith.webp","./card-art-data.js","./engine.js","./fan-card-text.js","./fan-controller.js","./fan-ui.css","./fan-ui.js","./game.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./index.html","./journey-visual.js","./manifest.webmanifest","./planning-engine.js","./planning-game.js","./planning-v1-engine.js","./planning-v2-engine.js","./planning.css","./planning.html","./pwa.js"];
const INDEX = new URL('./index.html', SCOPE).href;
const PLANNING = new URL('./planning.html', SCOPE).href;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // A failed addAll rejects installation; never report a partial download as ready.
    await cache.addAll(FILES.map(file => new Request(new URL(file, SCOPE).href, {cache:'reload'})));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') {
      const page = url.pathname === new URL(PLANNING).pathname ? PLANNING : INDEX;
      return (await cache.match(page)) || fetch(request);
    }
    return (await cache.match(request)) || fetch(request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_OFFLINE' || !event.ports?.[0]) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const present = await Promise.all(FILES.map(file => cache.match(new URL(file,SCOPE).href)));
      event.ports[0].postMessage({type:'OFFLINE_STATUS',ready:present.every(Boolean),build:BUILD});
    } catch { event.ports[0].postMessage({type:'OFFLINE_STATUS',ready:false,build:BUILD}); }
  })());
});
// No skipWaiting or forced reload: an update waits for old app windows to close.
