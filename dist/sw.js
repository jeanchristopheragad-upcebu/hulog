const CACHE = "hulog-731da056da8a";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(["/","/director","/display","/editor","/documents","/manifest.webmanifest","/icons/icon.svg","/icons/icon-192.png","/icons/icon-512.png","/sample-production.json","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BmBBOkAZ.css","/assets/index-DKJ3YVjs.js","/assets/index.es-CZedLPu7.js","/assets/jspdf.es.min-lY5vUwfi.js","/assets/purify.es-BKvm9NlY.js"]),
      ),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin ||
    event.request.url.includes("/socket.io")
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(
        async () =>
          (await caches.match(event.request)) ||
          (event.request.mode === "navigate"
            ? await caches.match("/display")
            : Response.error()),
      ),
  );
});
