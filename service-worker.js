const SW_VERSION = 'v3';
const STATIC_CACHE = `tiempos-static-${SW_VERSION}`;
const RUNTIME_CACHE = `tiempos-runtime-${SW_VERSION}`;
const MAX_RUNTIME_ENTRIES = 80;

const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './network.js',
    './script.js',
    './librerias/lucide.min.js',
    './librerias/sweetalert2.all.min.js',
    './librerias/flatpickr.min.js',
    './librerias/flatpickr.min.css',
    './librerias/flatpickr-l10n-es.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

function shouldCacheRuntimeRequest(req) {
    const url = new URL(req.url);
    // Nunca cachear llamadas externas (ej. Apps Script JSONP) ni endpoints dinámicos.
    if (url.origin !== self.location.origin) return false;
    if (url.search && url.search.length > 0) return false;
    // Solo estáticos que aportan navegación offline sin crecer sin control.
    return ['document', 'script', 'style', 'image', 'font'].includes(req.destination);
}

async function putRuntimeWithLimit(req, res) {
    if (!shouldCacheRuntimeRequest(req)) return;
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(req, res);
    const keys = await cache.keys();
    if (keys.length <= MAX_RUNTIME_ENTRIES) return;
    const overflow = keys.length - MAX_RUNTIME_ENTRIES;
    for (let i = 0; i < overflow; i++) {
        await cache.delete(keys[i]);
    }
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // Navegaciones: network-first con fallback a cache.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    putRuntimeWithLimit(req, copy);
                    return res;
                })
                .catch(async () => {
                    const cached = await caches.match(req);
                    return cached || caches.match('./index.html');
                })
        );
        return;
    }

    // Assets: stale-while-revalidate simple.
    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    putRuntimeWithLimit(req, copy);
                    return res;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
