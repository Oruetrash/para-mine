const CACHE = 'mine-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.json', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png']))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  if (r.mode === 'navigate' || /\.(js|css)$/.test(new URL(r.url).pathname)) {
    // network-first
    e.respondWith(
      fetch(r)
        .then((res) => {
          const c = res.clone();
          caches.open(CACHE).then((x) => x.put(r, c));
          return res;
        })
        .catch(() => caches.match(r))
    );
  } else {
    e.respondWith(caches.match(r).then((m) => m || fetch(r)));
  }
});
