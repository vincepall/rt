const CACHE_NAME = 'pwa-cache-v1';

// Lijst van bestanden om te cachen bij installatie
const FILES_TO_CACHE = [
  '/rt/',
  '/rt/index.html',
  '/rt/styles.css',
  '/rt/Draadjesv2.html',
  '/rt/manifest.json',
  '/rt/LW_Verdeler.html',
  '/rt/Lascategorie.png',
  '/rt/MinFFD.html',
  '/rt/OpnamesrichtlijnklasseB.png',
  '/rt/RT192.png',
  '/rt/RT512.png',
  '/rt/Schedulematen.png',
  '/rt/afzettinggamma.html',
  '/rt/bronnen.csv',
  '/rt/cw2.html',
  '/rt/filmsoortverandering.html',
  '/rt/focusverandering.html',
  '/rt/service-worker.js',
  '/rt/verval2.html',
  '/rt/opnamesklasseb.html',
  '/rt/klasseb1.png',
  '/rt/klasseb2.png',
  '/rt/script.js',
  '/rt/bundelbreedte.html',
  '/rt/opstelling13klassea.png',
  '/rt/opstelling2klassea.png',
  '/rt/alarm.wav',
  '/rt/timer.html',
  '/rt/handigelinks.html',
  '/rt/verzet.html',
  '/rt/buistabel.html',
  '/rt/smart300.png',
  '/rt/filmkwaliteit.html',
  '/rt/ceramrondstraler.png',
  '/rt/d4balteau107.png',
  '/rt/d4balteau119.png',
  '/rt/d7balteau107.png',
  '/rt/d7balteau119.png',
  '/rt/balteaurondstraleroud.png',
  '/rt/balteauspotgfd306.png',
  '/rt/tape1.PNG',
  '/rt/tape2.PNG',
  '/rt/tape3.PNG',
  '/rt/tape4.PNG', 
  '/rt/bglight.png',
  '/rt/schuifje1.png',
  '/rt/schuifje2.png',
  '/rt/schuifje3.png',
  '/rt/schuifje4.png',
  '/rt/schuifje.html',
  '/rt/kvregel.html',
  '/rt/onstream.html',
  '/rt/gevuldeleiding.html',
  '/rt/bronkeuze2.html',
  '/rt/onstreamffd.html'
];

// Installeer de service worker en cache de essentiële bestanden
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Bestanden worden gecachet tijdens installatie');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // Activeer direct de nieuwe service worker
});

// Activeer de service worker en verwijder oude caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Verwijder oude cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event met Stale-While-Revalidate strategie zonder offline fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Start een netwerkverzoek in de achtergrond
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Controleer of de netwerkrespons geldig is voordat we de cache bijwerken
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Als het netwerk faalt, gebruik dan de gecachete versie
          return cachedResponse;
        });

        // Geef de gecachete versie onmiddellijk terug, of wacht op de netwerkversie
        return cachedResponse || fetchPromise;
      });
    })
  );
});
