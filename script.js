/* script.js - bootstrap PWA + reconexión */
(function bootstrapPwaAndSync() {
    function rutasPwaDesdePagina() {
        const segs = String(window.location.pathname || '/').split('/').filter(Boolean);
        const depth = segs.length > 0 && /\.html?$/i.test(segs[segs.length - 1])
            ? segs.length - 1
            : segs.length;
        const prefix = depth <= 0 ? './' : '../'.repeat(depth);
        return {
            sw: prefix + 'service-worker.js',
            scope: prefix
        };
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const rutas = rutasPwaDesdePagina();
                await navigator.serviceWorker.register(rutas.sw, { scope: rutas.scope });
            } catch (_) {
                // No interrumpir la app si SW falla.
            }
        });
    }

    if (window.NetworkSync && typeof window.NetworkSync.onConnectivityChange === 'function') {
        window.NetworkSync.onConnectivityChange((online) => {
            if (online && typeof window.NetworkSync.triggerPendingSync === 'function') {
                window.NetworkSync.triggerPendingSync();
            }
        });
    }
}());
