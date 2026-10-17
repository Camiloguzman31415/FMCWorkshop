// Service Worker para FMC Workshop - Soporte PWA y Modo Offline
const CACHE_NAME = 'fmc-workshop-v1.3';

const STATIC_ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'cube.js',
  'fmc-solver.js',
  'three.min.js',
  'OrbitControls.js',
  'favicon.svg',
  'icon-192.png',
  'icon-512.png',
  'manifest.json'
];

// Instalación: Pre-cacheados todos los archivos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activación: Limpieza de caches antiguas y toma de control inmediata
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepción de peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo interceptar peticiones GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Cache para Google Fonts
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          return new Response('', { status: 408, headers: { 'Content-Type': 'text/css' } });
        });
      })
    );
    return;
  }

  // Peticiones locales de la aplicación
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
        // Estrategia Stale-While-Revalidate: si está en caché, servirlo de inmediato y actualizar en segundo plano
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Si estamos offline y es una navegación, entregar index.html
          if (request.mode === 'navigate') {
            return caches.match('./') || caches.match('index.html');
          }
        });

        return cachedResponse || fetchPromise;
      })
    );
  }
});
