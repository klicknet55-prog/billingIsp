// Service worker NetManage: cache app shell + network-first untuk halaman.
// Mendukung kebutuhan offline dasar kolektor (lihat daftar tugas terakhir).
const CACHE = "netmanage-v5";
const SHELL = ["/", "/kolektor", "/offline"];
const OFFLINE_URL = "/offline";

function isRscRequest(request) {
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  if (request.headers.get("Next-Url")) return true;
  return false;
}

function isDashboardPath(pathname) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/isp") ||
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/kolektor")
  );
}

function cachePut(request, response) {
  if (!response || !response.ok) return;
  const copy = response.clone();
  caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
}

function offlineResponse() {
  return caches.match(OFFLINE_URL).then(
    (page) => page || new Response("Offline", { status: 503, statusText: "Offline" })
  );
}

function networkFirst(request, offlineFallback) {
  return fetch(request)
    .then((res) => {
      cachePut(request, res);
      return res;
    })
    .catch(() =>
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return offlineFallback ? offlineResponse() : undefined;
      })
    );
}

function networkOnly(request, offlineFallback) {
  return fetch(request).catch(() => (offlineFallback ? offlineResponse() : undefined));
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request)
      .then((res) => {
        cachePut(request, res);
        return res;
      })
      .catch(() => undefined);
  });
}

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

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/api/")) return;

  // Jangan cache flight RSC — sumber halaman kosong saat navigasi client-side.
  if (isRscRequest(request)) {
    event.respondWith(networkOnly(request, false));
    return;
  }

  // Network-first untuk chunk Next.js — hindari JS lama di cache (tab/filter tidak responsif).
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(networkFirst(request, false));
    return;
  }

  // Dashboard: selalu ambil data segar; hindari cache HTML/RSC usang.
  if (request.mode === "navigate" && isDashboardPath(url.pathname)) {
    event.respondWith(networkOnly(request, true));
    return;
  }

  // Network-first untuk navigasi publik; fallback ke cache lalu halaman offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  // Cache-first untuk aset statis.
  event.respondWith(cacheFirst(request));
});
