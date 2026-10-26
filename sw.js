// Offline support for Trig Sub Drill.
// Bump CACHE when the page changes so phones pick up the new version.
const CACHE = 'trig-sub-drill-v1';
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache first, so the handwriting and math fonts work offline.
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(req).then(hit => hit || fetch(req).then(res => {
          cache.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // The app itself: answer from the cache right away, refresh it in the background.
  const key = req.mode === 'navigate' ? 'index.html' : req;
  const cached = caches.open(CACHE).then(c => c.match(key, { ignoreSearch: true }));
  const network = fetch(req).then(res => {
    if (!res.ok) return res;
    const copy = res.clone();
    return caches.open(CACHE).then(c => c.put(key, copy)).then(() => res);
  });
  event.waitUntil(network.catch(() => {}));
  event.respondWith(cached.then(hit => hit || network));
});
