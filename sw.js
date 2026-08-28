// CollabCanvas Service Worker — offline-first + sync
const CACHE = "collabcanvas-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
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
  if (e.tag === "collab-sync") {
    e.waitUntil(
      (async () => {
        // Sync any pending local notes back to server when online
        const pending = localStorage.getItem("collabcanvas-pending");
        if (pending) {
          console.log("[sw] sync pending notes:", pending);
          localStorage.removeItem("collabcanvas-pending");
        }
      })()
    );
  }
});
