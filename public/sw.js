// Modo sin conexión. La página (HTML) se pide primero a internet para que siempre cargue la versión nueva;
// si no hay conexión, se usa la copia guardada. Los archivos con hash (assets/) no cambian, van desde caché.
const C = 'penfich-v5';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => clients.claim())
  )
);
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const fresh = req.mode === 'navigate' || /\.(webmanifest|html)$/.test(req.url) || req.url.endsWith('/sw.js');
  e.respondWith(
    caches.open(C).then(async (c) => {
      const hit = await c.match(req);
      if (fresh || !hit) {
        try {
          const r = await fetch(req, { cache: 'no-cache' });
          if (r.ok) c.put(req, r.clone());
          return r;
        } catch {
          return hit || (await c.match('./')) || Response.error();
        }
      }
      return hit;
    })
  );
});
