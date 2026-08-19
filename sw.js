/* Contact Sheet — アプリとしてインストールできるようにするための最小構成。
   Box のデータは保存しない（トークンや動画を勝手に抱え込まないため）。
   本体の HTML とアイコンだけを控えておき、電波が悪いときも起動はできるようにする。 */

const CACHE = "contactsheet-v1";
const SHELL = ["./", "./index.html", "./manifest.json",
               "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Box への通信には一切手を出さない（認証や動画を控えると事故のもと）
  if (url.hostname.endsWith("box.com") || url.hostname.endsWith("boxcloud.com")
      || url.hostname.endsWith("workers.dev")){
    return;
  }
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // 本体は「まず通信、だめなら控え」。更新をすぐ反映させるため。
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
