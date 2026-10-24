// Service worker for the installed web app: keeps the game playable offline. `vite build` (vite.config.ts) fills in
// CACHE and FILES and writes it to dist/sw.js; `npm run dev` never registers it.
const CACHE = __CACHE__;
const FILES = __FILES__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// A new build's cache replaces the old one.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The page comes from the network when it can, so a new version loads on the next launch, and from the cache offline.
// Everything else has a content hash in its name (or is an icon), so the cached copy is always right.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put('./', copy));
          }
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)));
});
