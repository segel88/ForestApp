/* ForestApp PWA - Service Worker */

const CACHE_NAME = 'forestapp-v2.0.0';
const OFFLINE_URL = '/index.html';

// Essential files to cache for offline functionality
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/manifest.json',
    // Add fallback for offline
    '/offline.html'
];

// Files that should be cached on first visit
const DYNAMIC_CACHE_URLS = [
    // Google Fonts (if used)
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    // Any external resources
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('🔧 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Service Worker: Caching static files');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .catch(err => {
                console.error('❌ Service Worker: Cache failed', err);
            })
    );
    
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('✅ Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Ensure the service worker takes control immediately
    self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    // Skip non-HTTP requests
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    // Skip Google Apps Script requests (they need to be online)
    if (event.request.url.includes('script.google.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached version if available
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Try to fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response for caching
                        const responseToCache = response.clone();
                        
                        // Cache the fetched resource for future use
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Network failed, try to serve offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});

// Background sync for saving data when connection is restored
self.addEventListener('sync', event => {
    console.log('🔄 Service Worker: Background sync triggered', event.tag);
    
    if (event.tag === 'forestapp-sync') {
        event.waitUntil(
            // Notify the main app that sync is available
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'BACKGROUND_SYNC',
                        tag: event.tag
                    });
                });
            })
        );
    }
});

// Handle messages from the main application
self.addEventListener('message', event => {
    console.log('📨 Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        // Cache additional URLs requested by the app
        event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
                return cache.addAll(event.data.urls);
            })
        );
    }
});

// Push notification support (for future features)
self.addEventListener('push', event => {
    console.log('🔔 Service Worker: Push received', event);
    
    const options = {
        body: event.data ? event.data.text() : 'Notifica ForestApp',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'forestapp-notification',
        actions: [
            {
                action: 'open',
                title: 'Apri App',
                icon: '/assets/icons/icon-96x96.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('ForestApp Pro', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('🔔 Service Worker: Notification clicked', event);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Periodic background sync (for future features)
self.addEventListener('periodicsync', event => {
    console.log('⏰ Service Worker: Periodic sync', event.tag);
    
    if (event.tag === 'forestapp-periodic-sync') {
        event.waitUntil(
            // Check for unsaved data and sync if needed
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'PERIODIC_SYNC',
                        tag: event.tag
                    });
                });
            })
        );
    }
});

// Error handling
self.addEventListener('error', event => {
    console.error('❌ Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('❌ Service Worker Unhandled Rejection:', event.reason);
});

console.log('🌲 ForestApp Service Worker loaded successfully!');