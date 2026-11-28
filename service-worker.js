const CACHE='accad-dashboard-1.0.3';
const FILES=["./","index.html","manifest.json","app.js","web-core/app.css","web-core/dashboard.css","web-core/config.js","web-core/theme.js","assets/LOGO.jpg","assets/accad-pack/icon-dashboard-192.png","assets/accad-pack/icon-dashboard-512.png","assets/accad-pack/icon-dashboard-maskable-512.png"];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('accad-dashboard-')&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
e.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));}return res;}).catch(()=>caches.match(r,{ignoreSearch:true}).then(c=>c||caches.match('./'))));});
