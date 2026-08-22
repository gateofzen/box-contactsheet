/* Contact Sheet — アプリとして使えるようにするための最小構成。
   Box のデータは保存しない（トークンや動画を抱え込まないため）。

   本体は必ず新しいものを取りに行く。
   保存されたものを返すのは、通信できないときだけ。 */

const CACHE = "contactsheet-v2";
const SHELL = ["./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", e => {
  // 本体（index.html）は控えに含めない。毎回取りに行く。
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Box や Worker への通信には一切手を出さない
  if (url.hostname.endsWith("box.com") || url.hostname.endsWith("boxcloud.com")
      || url.hostname.endsWith("workers.dev") || url.hostname.endsWith("gstatic.com")){
    return;
  }
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  const isPage = e.request.mode === "navigate"
    || url.pathname.endsWith("/") || url.pathname.endsWith(".html");

  if (isPage){
    // 本体・受信ページは、保存されたものを使わずに取りに行く。
    // ブラウザ側の控えも使わせない。
    e.respondWith(
      fetch(e.request, {cache: "no-store"})
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // 絵などは控えを優先（変わらないものなので）
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }))
  );
});
