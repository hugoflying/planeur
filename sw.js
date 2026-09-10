/* GlideDeck service worker */
const CACHE = 'glidedeck-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  'https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(()=>{})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Page / navigation : cache d'abord (offline garanti), maj en arriere-plan
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match('./index.html');
      const network = fetch(req).then(res => { cache.put('./index.html', res.clone()); return res; }).catch(() => null);
      return cached || (await network) || new Response('Hors ligne', { status: 503 });
    })());
    return;
  }

  // Autres ressources : cache d'abord, sinon reseau (et on met en cache)
  e.respondWith(
    caches.match(req).then(c => c || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(cc => cc.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => c))
  );
});
