// Service worker NetManage: cache app shell + network-first untuk halaman.
// Mendukung kebutuhan offline dasar kolektor (lihat daftar tugas terakhir).
const CACHE = "netmanage-v1";
const SHELL = ["/", "/kolektor", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Network-first untuk navigasi; fallback ke cache lalu halaman offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/offline")))
    );
    return;
  }

  // Cache-first untuk aset statis.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
