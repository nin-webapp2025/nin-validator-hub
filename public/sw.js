const CACHE_NAME = "sparklabid-v4";
const APP_SHELL_URLS = ["/", "/auth", "/logo.svg", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
  );
  self.clients.claim();
});

function shouldBypass(requestUrl) {
  return (
    requestUrl.origin !== self.location.origin ||
    requestUrl.hostname.includes("supabase.co") ||
    requestUrl.pathname.startsWith("/api/")
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || caches.match("/");
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (shouldBypass(requestUrl)) return;

  if (
    requestUrl.pathname.startsWith("/assets/") ||
    ["style", "script", "image", "font"].includes(event.request.destination)
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
  }
});

self.addEventListener("push", (event) => {
  const options = {
    body: event.data?.text() || "New notification",
    icon: "/logo.svg",
    badge: "/logo.svg",
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification("SparklabID - Identity Verification", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
