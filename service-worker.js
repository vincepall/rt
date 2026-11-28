const CACHE_NAME = "pwa-cache-v87";

// Lijst van bestanden om te cachen bij installatie
const FILES_TO_CACHE = [
  "/rt/",
  "/rt/index.html",
  "/rt/styles.css",
  "/rt/rt-assistant.js",
  "/rt/radi-voorbeelden.json",
  "/rt/radi-startvragen.json",
  "/rt/Draadjesv2.html",
  "/rt/manifest.json",
  "/rt/LW_Verdeler.html",
  "/rt/Lascategorie.png",
  "/rt/MinFFD.html",
  "/rt/OpnamesrichtlijnklasseB.png",
  "/rt/RT192.png",
  "/rt/RT512.png",
  "/rt/Schedulematen.png",
  "/rt/afzettinggamma.html",
  "/rt/bronnen.csv",
  "/rt/materiaalfactor.csv",
  "/rt/pruts.png",
  "/rt/stralingstijd.html",
  "/rt/cw2.html",
  "/rt/filmsoortverandering.html",
  "/rt/focusverandering.html",
  "/rt/verval2.html",
  "/rt/opnamesklasseb.html",
  "/rt/klasseb1.png",
  "/rt/klasseb2.png",
  "/rt/script.js",
  "/rt/bundelbreedte.html",
  "/rt/opstelling13klassea.png",
  "/rt/opstelling2klassea.png",
  "/rt/alarm.wav",
  "/rt/handigelinks.html",
  "/rt/verzet.html",
  "/rt/buistabel.html",
  "/rt/smart300.png",
  "/rt/filmkwaliteit.html",
  "/rt/ceramrondstraler.png",
  "/rt/d4balteau107.png",
  "/rt/d4balteau119.png",
  "/rt/d7balteau107.png",
  "/rt/d7balteau119.png",
  "/rt/balteaurondstraleroud.png",
  "/rt/balteauspotgfd306.png",
  "/rt/tape1.PNG",
  "/rt/tape2.PNG",
  "/rt/tape3.PNG",
  "/rt/tape4.PNG",
  "/rt/bglight.png",
  "/rt/bgpunk.png",
  "/rt/bgpunk-frame.webp",
  "/rt/schuif1.png",
  "/rt/schuif2.png",
  "/rt/schuif3.png",
  "/rt/schuif4.png",
  "/rt/schuifje.html",
  "/rt/kvregel.html",
  "/rt/onstream.html",
  "/rt/pruts.html",
  "/rt/gevuldeleiding.html",
  "/rt/bronkeuze2.html",
  "/rt/onstreamffd.html",
  "/rt/mtptlijst.html",
  "/rt/MTPT.html",
  "/rt/mtbank.html",
  "/rt/zinnen.html",
  "/rt/tekens.html",
  "/rt/opnames.html",
  "/rt/print_overzicht.html",
  "/rt/lasfout.html",
  "/rt/uren.html",
  "/rt/filmvoorraad.html",
];

// Installeer de service worker en cache de essentiële bestanden (robuust per bestand)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        FILES_TO_CACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch((err) => {
            console.warn("Kon bestand niet cachen bij installatie:", url, err);
          }),
        ),
      ),
    ),
  );
  self.skipWaiting(); // Activeer direct de nieuwe service worker
});

// Activeer de service worker en verwijder oude caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Verwijder oude cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Network-First voor code/data (altijd direct de nieuwste versie bij internet, offline uit cache)
// Cache-First voor grote statische media (afbeeldingen/audio)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/service-worker.js")) return;

  const isCodeOrData =
    req.mode === "navigate" ||
    /\.(?:html|js|css|json|csv)$/i.test(url.pathname) ||
    url.pathname.endsWith("/");

  if (isCodeOrData) {
    event.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() =>
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.match(req, { ignoreSearch: true })),
        ),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cachedResponse) => {
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      }),
    ),
  );
});
