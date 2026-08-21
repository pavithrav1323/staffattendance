const CACHE_NAME = 'staff-tracker-geo-v1';
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
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API requests or cross-origin requests (e.g. backend API)
  if (
    url.pathname.startsWith('/api/') ||
    url.origin !== self.location.origin
  ) {
    event.respondWith(
      fetch(request).catch((error) => {
        console.error('Service worker fetch failed:', error);
        return new Response('Network error', { status: 408, statusText: 'Network Error' });
      })
    );
    return;
  }

  // Cache-first for app shell assets; network for everything else
  if (SHELL_ASSETS.some((path) => url.pathname === path)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).catch((error) => {
          console.error('Service worker cache fetch failed:', error);
          return new Response('Network error', { status: 408, statusText: 'Network Error' });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).catch((error) => {
      console.error('Service worker fetch failed:', error);
      return new Response('Network error', { status: 408, statusText: 'Network Error' });
    })
  );
});
