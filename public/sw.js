// odak Service Worker
const CACHE_NAME = 'odak-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Bulut eşleme SSE akışlarını, harici API'leri ve soketleri ServiceWorker'dan muaf tut (iOS WebKit çökmesini önler)
  if (
    url.pathname.includes('/sse') ||
    url.hostname.includes('ntfy') ||
    url.protocol.startsWith('chrome')
  ) {
    return;
  }

  // Network-first with silent fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
