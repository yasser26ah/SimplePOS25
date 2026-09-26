/* SimplePOS Service Worker — estrategia offline-first */
const VERSION = 'v3';
const SHELL_CACHE = `simplepos-shell-${VERSION}`;
const DATA_CACHE = `simplepos-data-${VERSION}`;
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Navegación (SPA): red primero, cache de respaldo; assets estáticos: cache-first.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // las mutaciones van por la app, no por el SW

  const url = new URL(req.url);

  if (req.mode === 'navigate' || (req.destination === '' && url.origin === self.location.origin)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() =>
          caches
            .match('/index.html')
            .then((cached) => cached ?? caches.match('/') ?? new Response('Offline', { status: 503 }))
        )
    );
    return;
  }

  if (url.origin === self.location.origin && /\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ??
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});

// El cliente avisa "hay ventas pendientes" → dispara sync en segundo plano.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SIMPLEPOS_PENDING_SALES' && 'sync' in (self.registration ?? {})) {
    self.registration.sync
      .register('simplepos-sync-sales')
      .catch(() => {
        /* el navegador puede rechazarlo; la app reintenta por su cuenta */
      });
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'simplepos-sync-sales') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'SIMPLEPOS_RUN_SYNC' });
  }
}
