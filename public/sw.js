// Production build injects the exact hashed app assets; never cache Supabase/API data.
const CACHE_NAME = 'petty-cash-__VERSION__';
const APP_ASSETS = __APP_ASSETS__;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('petty-cash-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () =>
      (await caches.match('/index.html')) || new Response('You are offline. Reconnect to open Petty Cash.', { status: 503 })
    ));
  } else if (APP_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});

self.addEventListener('push', event => {
  // Deliberately generic lock-screen content: no amounts, names or access links.
  event.waitUntil(self.registration.showNotification('Petty Cash', {
    body: 'Cashbook updated',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'petty-cash-update',
    renotify: true,
    data: { url: '/' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    // Never take a URL from a push payload. Open only this app's own root.
    const client = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (client) return client.focus();
    return self.clients.openWindow('/');
  }));
});
self.addEventListener('pushsubscriptionchange', event => {
  // A closed service worker cannot access the private link in localStorage.
  // Drop the expired endpoint; the opt-in control re-registers on next visit.
  event.waitUntil(event.oldSubscription ? event.oldSubscription.unsubscribe() : Promise.resolve());
});
