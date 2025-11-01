/**
 * Service Worker - Client-side caching and offline support
 */

const CACHE_NAME = 'scp-card-generator-v1.0.0';
const STATIC_CACHE = 'scp-static-v1.0.0';
const DYNAMIC_CACHE = 'scp-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/css/design-system.css',
    '/css/scp-theme.css',
    '/css/card-generator.css',
    '/css/responsive.css',
    '/css/scp-animations.css',
    '/css/accessibility.css',
    '/js/client/data-models.js',
    '/js/client/validation.js',
    '/js/client/error-handler.js',
    '/js/client/performance-optimizer.js',
    '/js/client/api-client.js',
    '/js/client/site-manager.js',
    '/js/client/card-generator.js',
    '/js/client/batch-processor.js',
    '/js/client/ui-controller.js',
    '/js/client/app.js',
    '/assets/scp-logo.svg',
    '/assets/logo-dark.svg',
    '/favicon.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
    /\/api\/sites$/,
    /\/api\/sites\/[^\/]+\/departments$/,
    /\/api\/health$/
];

// Files that should never be cached
const NEVER_CACHE = [
    /\/api\/batch-generate$/,
    /\/api\/batch-status\//,
    /\/api\/download-batch\//,
    /\/api\/upload-data$/,
    /\/api\/metrics$/
];

/**
 * Install event - cache static files
 */
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('📦 Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('✅ Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Failed to cache static files:', error);
            })
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker activated');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - handle requests with caching strategy
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip requests that should never be cached
    if (NEVER_CACHE.some(pattern => pattern.test(url.pathname))) {
        return;
    }
    
    // Handle different types of requests
    if (isStaticFile(url.pathname)) {
        event.respondWith(handleStaticFile(request));
    } else if (isAPIRequest(url.pathname)) {
        event.respondWith(handleAPIRequest(request));
    } else {
        event.respondWith(handleDynamicRequest(request));
    }
});

/**
 * Check if request is for a static file
 */
function isStaticFile(pathname) {
    return STATIC_FILES.includes(pathname) || 
           pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

/**
 * Check if request is for an API endpoint
 */
function isAPIRequest(pathname) {
    return pathname.startsWith('/api/');
}

/**
 * Handle static file requests - Cache First strategy
 */
async function handleStaticFile(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If not in cache, fetch from network
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Static file request failed:', error);
        
        // Try to return cached version as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
        }
        
        throw error;
    }
}

/**
 * Handle API requests - Network First with cache fallback
 */
async function handleAPIRequest(request) {
    const url = new URL(request.url);
    
    // Check if this API endpoint should be cached
    const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
    
    try {
        // Always try network first for API requests
        const networkResponse = await fetch(request);
        
        // Cache successful responses for cacheable endpoints
        if (networkResponse.ok && shouldCache) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('API request failed, trying cache:', error);
        
        // Try cache as fallback
        if (shouldCache) {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                // Add header to indicate cached response
                const response = cachedResponse.clone();
                response.headers.set('X-Cache', 'SW-FALLBACK');
                return response;
            }
        }
        
        // Return offline response for critical API endpoints
        if (url.pathname === '/api/sites') {
            return new Response(JSON.stringify({
                success: true,
                sites: [],
                offline: true,
                message: 'Offline mode - limited functionality'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        throw error;
    }
}

/**
 * Handle dynamic requests - Network First
 */
async function handleDynamicRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Try cache as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

/**
 * Background sync for failed requests
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

/**
 * Handle background sync
 */
async function doBackgroundSync() {
    console.log('🔄 Performing background sync...');
    
    try {
        // Retry failed API requests
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response);
                }
            } catch (error) {
                console.warn('Background sync failed for:', request.url);
            }
        }
        
        console.log('✅ Background sync completed');
    } catch (error) {
        console.error('❌ Background sync failed:', error);
    }
}

/**
 * Handle push notifications (future feature)
 */
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '/favicon.png',
            badge: '/assets/scp-logo.svg',
            tag: 'scp-notification',
            requireInteraction: true
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});

/**
 * Message handling for communication with main thread
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_CACHE_SIZE':
            getCacheSize().then(size => {
                event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
            });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
            });
            break;
            
        case 'PREFETCH_RESOURCES':
            prefetchResources(data.urls);
            break;
    }
});

/**
 * Get total cache size
 */
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
}

/**
 * Prefetch resources
 */
async function prefetchResources(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
            }
        } catch (error) {
            console.warn('Failed to prefetch:', url);
        }
    }
}

console.log('🔧 Service Worker loaded');