// Bestand: service-worker.js

// Geef een cache-naam voor dynamisch cachen van netwerkverzoeken
const CACHE_NAME = 'dynamic-cache-v1';

// Installeer de service worker
self.addEventListener('install', (event) => {
  console.log('Service worker geïnstalleerd');
  self.skipWaiting();  // Direct activeren van nieuwe versie
});

// Activeer de service worker
self.addEventListener('activate', (event) => {
  console.log('Service worker geactiveerd');
});

// Fetch event: netwerk-first strategie
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)  // Probeer content van het netwerk te halen
      .then((response) => {
        // Als netwerkverzoek succesvol is, sla een kopie op in de cache
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => {
        // Als netwerkverzoek mislukt, haal content uit de cache
        return caches.match(event.request);
      })
  );
});
