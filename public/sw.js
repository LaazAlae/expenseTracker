// Professional PWA Service Worker - Online Only, Instant Loading
const CACHE_NAME = 'expense-tracker-v1.0.0';
const STATIC_CACHE = 'expense-tracker-static-v1.0.0';

// Critical resources for instant loading
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/components.js',
  '/icons.js',
  '/manifest.json',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Install event - cache critical resources immediately
self.addEventListener('install', (event) => {
  console.log('PWA Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('PWA Service Worker: Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      })
      .then(() => {
        console.log('PWA Service Worker: Critical resources cached');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('PWA Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
              console.log('PWA Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('PWA Service Worker: Activated');
        return self.clients.claim(); // Take control of all clients
      })
  );
});

// Fetch event - Network first for API, Cache first for static resources
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always check network connectivity first
  if (!navigator.onLine) {
    // If offline, only serve cached static resources, block API calls
    if (request.url.includes('/api/')) {
      event.respondWith(
        new Response(
          JSON.stringify({ error: 'This app requires an internet connection to function.' }), 
          {
            status: 503,
            statusText: 'Service Unavailable - No Internet Connection',
            headers: { 'Content-Type': 'application/json' }
          }
        )
      );
      return;
    }
  }

  // API requests - Network only (no caching for data consistency)
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch((error) => {
        console.log('PWA Service Worker: API request failed:', error);
        return new Response(
          JSON.stringify({ error: 'Network error - please check your internet connection.' }), 
          {
            status: 503,
            statusText: 'Network Error',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Static resources - Cache first for instant loading
  if (CRITICAL_RESOURCES.some(resource => request.url.includes(resource))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Update cache in background
            fetch(request).then((response) => {
              if (response.ok) {
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(request, response.clone());
                });
              }
            }).catch(() => {}); // Silent fail for background updates
            
            return cachedResponse; // Return cached version immediately
          }
          
          // Not in cache, fetch from network
          return fetch(request).then((response) => {
            if (response.ok) {
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, response.clone());
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // All other requests - Network first
  event.respondWith(
    fetch(request).catch(() => {
      // For navigation requests, serve the cached index.html
      if (request.destination === 'document') {
        return caches.match('/index.html');
      }
      throw new Error('Resource not available offline');
    })
  );
});

// Background sync for when network comes back online
self.addEventListener('sync', (event) => {
  console.log('PWA Service Worker: Background sync triggered');
  if (event.tag === 'background-sync') {
    // Could implement background data sync here if needed
    console.log('PWA Service Worker: Performing background sync');
  }
});

// Update notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Log service worker lifecycle
console.log('PWA Service Worker: Script loaded');