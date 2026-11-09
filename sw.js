// Bump VERSION on every release: this is what triggers the "Update available" banner.
const VERSION = '1.0.0';
const CACHE = 'caffeine-' + VERSION;
const FONT_CACHE = 'caffeine-fonts';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))));
  // no skipWaiting here: the page shows the banner and asks first
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache after first load so the app looks right offline
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // App shell: serve from the versioned cache, fall back to network
  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => hit ||
      fetch(req).catch(() => req.mode === 'navigate' ? caches.match('index.html') : undefined))
  );
});
