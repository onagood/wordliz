/* Wordliz service worker: precache the game, then stale-while-revalidate —
   offline play works from the first visit, updates arrive one load later. */
const CACHE='wordliz-v4';
const ASSETS=['./','./index.html','./words_en.js','./gloss_en.js',
  './manifest.webmanifest','./icon-192.png','./icon-512.png',
  './fonts/rubik-latin.woff2','./fonts/rubik-latin-ext.woff2','./fonts/rubik-cyrillic.woff2',
  './fonts/plexmono-600-latin.woff2'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith((async()=>{
    const cached=await caches.match(e.request,{ignoreSearch:true});
    const net=fetch(e.request).then(res=>{
      if(res&&res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}
      return res;
    }).catch(()=>null);
    return cached||await net||caches.match('./index.html');
  })());
});
