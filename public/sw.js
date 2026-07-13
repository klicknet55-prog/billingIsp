// Service worker NetManage: cache app shell + network-first untuk halaman.
const CACHE = "netmanage-v6";
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

function asResponse(value) {
  return value instanceof Response
    ? value
    : new Response("Service Unavailable", { status: 503, statusText: "Service Unavailable" });
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
        if (offlineFallback) return offlineResponse();
        return new Response(null, { status: 504, statusText: "Gateway Timeout" });
      })
    )
    .then(asResponse);
}

function networkOnly(request, offlineFallback) {
  return fetch(request)
    .catch(() => {
      if (offlineFallback) return offlineResponse();
      return new Response(null, { status: 504, statusText: "Gateway Timeout" });
    })
    .then(asResponse);
}

function cacheFirst(request) {
  return caches
    .match(request)
    .then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          cachePut(request, res);
          return res;
        })
        .catch(() => new Response(null, { status: 404, statusText: "Not Found" }));
    })
    .then(asResponse);
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

  // Jangan intercept flight RSC — biarkan browser/Next.js menanganinya langsung.
  if (isRscRequest(request)) return;

  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(networkFirst(request, false));
    return;
  }

  if (request.mode === "navigate" && isDashboardPath(url.pathname)) {
    event.respondWith(networkOnly(request, true));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  event.respondWith(cacheFirst(request));
});
