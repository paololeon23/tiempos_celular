/* script.js - bootstrap PWA + reconexión */
(function bootstrapPwaAndSync() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                await navigator.serviceWorker.register('./service-worker.js');
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
