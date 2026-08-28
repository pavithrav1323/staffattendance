const CACHE_VERSION = 'v2';
const CACHE_NAME = `staff-tracker-geo-${CACHE_VERSION}`;
const APP_CACHE_PREFIX = 'staff-tracker-geo-';

const SHELL_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith(APP_CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || url.origin !== self.location.origin;
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isAssetRequest(url) {
  return url.pathname.startsWith('/assets/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API requests or cross-origin requests (backend API)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request).catch((error) => {
        console.error('[SW] API fetch failed:', error);
        return new Response(JSON.stringify({ success: false, message: 'Network error' }), {
          status: 408,
          statusText: 'Network Error',
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // Navigation and /index.html must be network-first so deployments update correctly
  if (isNavigationRequest(request) || url.pathname === '/index.html' || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response('Network error', { status: 408, statusText: 'Network Error' });
          })
        )
    );
    return;
  }

  // Hashed Vite assets can be cached because their filenames change when content changes
  if (isAssetRequest(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((response) => {
            if (!response.ok) return response;
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => new Response('Asset not found', { status: 404, statusText: 'Not Found' }));
      })
    );
    return;
  }

  // Default: network with cache fallback for other static files
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return new Response('Network error', { status: 408, statusText: 'Network Error' });
        })
      )
  );
});
