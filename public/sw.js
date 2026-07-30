/* Minimal Service Worker — ermöglicht „App installieren“ (Chrome/Android).
   Kein Offline-Cache: Anfragen gehen immer ans Netz. */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
