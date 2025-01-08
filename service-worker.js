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
  '/rt/ceramrondstraler.png',
  '/rt/d4balteau107.png',
  '/rt/d4balteau119.png',
  '/rt/d7balteau107.png',
  '/rt/d7balteau119.png',
  '/rt/balteaurondstraleroud.png',
  '/rt/balteauspotgfd306.png',

  
 
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

// Fetch event: gebruik network-first strategie
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Als de netwerkrespons goed is, sla die op in de cache
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => {
        // Als het netwerk faalt, haal het uit de cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          } else if (event.request.mode === 'navigate') {
            // Als het een navigatieverzoek is en er is geen cache, toon de offline pagina
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
