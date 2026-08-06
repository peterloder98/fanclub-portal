/* Minimal Service Worker — ermöglicht „App installieren“ (Chrome/Android).
   Kein fetch-Handler: Next.js/RSC und LiveKit dürfen nicht umgeleitet werden,
   sonst kann die Seite kurz aufblitzen und dann mit „couldn't load“ abbrechen. */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});
