// Security Lab Canvas Service Worker — offline-first + sync
const CACHE = "securitylab-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

self.addEventListener("sync", (e) => {
  if (e.tag === "securitylab-sync") {
    e.waitUntil(
      (async () => {
        const pending = localStorage.getItem("securitylab-pending");
        if (pending) {
          console.log("[sw] sync pending notes:", pending);
          localStorage.removeItem("securitylab-pending");
        }
      })()
    );
  }
});
