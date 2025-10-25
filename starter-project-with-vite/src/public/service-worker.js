const APP_SHELL_CACHE = 'dicoding-stories-shell-v1';
const STATIC_CACHE = 'dicoding-stories-static-v1';
const DYNAMIC_CACHE = 'dicoding-stories-dynamic-v1';
const OFFLINE_URL = '/offline.html';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/offline.html', '/favicon.png'];
const API_BASE = 'https://story-api.dicoding.dev/v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => ![APP_SHELL_CACHE, STATIC_CACHE, DYNAMIC_CACHE].includes(key)).map((key) => caches.delete(key)));

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) {
            return preload;
          }

          const networkResponse = await fetch(request);
          const cache = await caches.open(APP_SHELL_CACHE);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          const cache = await caches.open(APP_SHELL_CACHE);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }

  if (url.origin === self.location.origin && isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.url.startsWith(API_BASE)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/screenshots/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2')
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    return caches.match(OFFLINE_URL);
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'Dicoding Stories';
  const options = {
    body: payload.body || 'Cerita terbaru siap dibaca.',
    icon: payload.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    image: payload.image,
    data: {
      url: payload.url || (payload.storyId ? `/#/story/${payload.storyId}` : '/#/'),
    },
    actions: [
      {
        action: 'open-story',
        title: 'Lihat Detail',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/#/';

  if (action && action !== 'open-story') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl)) {
          client.focus();
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
