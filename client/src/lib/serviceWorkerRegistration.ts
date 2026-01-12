// Service Worker Registration for CheerpX/WebVM support
// This enables SharedArrayBuffer by adding COOP/COEP headers

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    window.addEventListener('load', async () => {
      try {
        // Check if we already have cross-origin isolation
        if (crossOriginIsolated) {
          console.log('Already cross-origin isolated');
          resolve(null);
          return;
        }

        // Register the service worker
        const registration = await navigator.serviceWorker.register('/serviceWorker.js', {
          scope: '/'
        });

        console.log('Service Worker registered:', registration.scope);

        // Wait for the service worker to be ready
        if (registration.installing) {
          console.log('Service Worker installing');
        } else if (registration.waiting) {
          console.log('Service Worker waiting');
        } else if (registration.active) {
          console.log('Service Worker active');
        }

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, prompt for refresh
                console.log('New service worker available');
                if (confirm('New version available. Reload to update?')) {
                  window.location.reload();
                }
              }
            });
          }
        });

        // If not yet controlled by service worker, reload
        if (!navigator.serviceWorker.controller) {
          console.log('Reloading to enable service worker control...');
          window.location.reload();
        }

        resolve(registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        reject(error);
      }
    });
  });
}

export function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return Promise.resolve(false);
  }

  return navigator.serviceWorker.ready.then((registration) => {
    return registration.unregister();
  });
}

// Check if SharedArrayBuffer is available
export function isSharedArrayBufferAvailable(): boolean {
  try {
    new SharedArrayBuffer(1);
    return true;
  } catch {
    return false;
  }
}

// Check cross-origin isolation status
export function getCrossOriginIsolationStatus(): {
  isolated: boolean;
  coep: string | null;
  coop: string | null;
} {
  return {
    isolated: crossOriginIsolated,
    coep: document.featurePolicy?.allowsFeature('cross-origin-isolated') ? 'require-corp' : null,
    coop: crossOriginIsolated ? 'same-origin' : null
  };
}
