const CACHE_NAME = 'petty-cash-v2';

// Install event - skip waiting so new versions activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache for navigation only
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests (HTML pages), let assets load normally
  if (event.request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache the response for offline use
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('/index.html');
        });
      })
  );
});
