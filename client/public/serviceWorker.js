// Service Worker for enabling SharedArrayBuffer support
// Required for CheerpX/WebVM to work on GitHub Pages

// This service worker intercepts all requests and adds the necessary headers
// to enable cross-origin isolation, which is required for SharedArrayBuffer

const CACHE_NAME = 'cogwebvm-agent-zero-v1';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch event - add COOP/COEP headers to enable SharedArrayBuffer
self.addEventListener('fetch', (event) => {
  // Only handle same-origin requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          
          // Clone the response and add headers
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
          
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        } catch (error) {
          console.error('[ServiceWorker] Fetch failed:', error);
          throw error;
        }
      })()
    );
  } else if (event.request.url.includes('disks.webvm.io') || 
             event.request.url.includes('rt.browserpod.io') ||
             event.request.url.includes('cheerpx')) {
    // Pass through CheerpX/BrowserPod requests with CORS
    event.respondWith(
      fetch(event.request, {
        mode: 'cors',
        credentials: 'omit'
      }).catch((error) => {
        console.error('[ServiceWorker] External fetch failed:', error);
        throw error;
      })
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
