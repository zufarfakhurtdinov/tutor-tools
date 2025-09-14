# Caching Strategy for Audio Transcription App

## Overview

This document outlines comprehensive caching strategies to improve performance and enable offline functionality for the single-page HTML audio transcription application.

## 1. Browser Caching (Automatic)

### CDN Caching
- **Mechanism**: Modern CDNs (jsDelivr, unpkg, cdnjs) automatically set proper cache headers
- **Duration**: Typically 24-48 hours for library files
- **Benefits**: Zero configuration required, works immediately
- **Coverage**: All JavaScript libraries loaded via `<script>` tags and ES module imports

### HTTP Cache
- **Mechanism**: Browser's built-in HTTP cache stores downloaded resources
- **Storage**: Memory cache (session) and disk cache (persistent)
- **Automatic**: No code changes required

## 2. Service Worker Caching (Recommended)

### Implementation

Add before closing `</body>` tag in `index.html`:
```javascript
<script>
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed'));
}
</script>
```

### Service Worker File (`sw.js`)

```javascript
const CACHE_NAME = 'audio-transcription-app-v1';
const LIBRARIES_TO_CACHE = [
    // Core libraries (update versions as needed)
    'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.0/dist/transformers.min.js',
    'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js',
    'https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.esm.js',
    'https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/lame.all.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',

    // Main application
    '/',
    '/index.html'
];

// Install event - cache libraries
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching libraries');
                return cache.addAll(LIBRARIES_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Only handle GET requests for our cached resources
    if (event.request.method === 'GET' &&
        (event.request.url.includes('cdn.jsdelivr.net') ||
         event.request.url.includes('unpkg.com') ||
         event.request.url.includes('cdnjs.cloudflare.com') ||
         event.request.url === self.location.origin + '/' ||
         event.request.url === self.location.origin + '/index.html')) {

        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Return cached version or fetch from network
                    return response || fetch(event.request)
                        .then((fetchResponse) => {
                            // Cache new resources
                            const responseClone = fetchResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                            return fetchResponse;
                        });
                })
                .catch(() => {
                    // Offline fallback for main page
                    if (event.request.url === self.location.origin + '/' ||
                        event.request.url === self.location.origin + '/index.html') {
                        return caches.match('/index.html');
                    }
                })
        );
    }
});
```

## 3. IndexedDB Model Caching

### Hugging Face Transformers Model Caching

```javascript
// Configure model caching in main application
import { env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.0/dist/transformers.min.js';

// Enable persistent model caching
env.allowLocalModels = true;
env.allowRemoteModels = true;
env.cacheDir = '.hf-transformers-cache'; // IndexedDB storage key
env.localModelPath = '/models/'; // Virtual path for cached models

// Optional: Custom cache configuration
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.0/dist/';
```

### Cache Management Functions

```javascript
// Check cache status
async function getCacheStatus() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponses = await cache.keys();
        return {
            librariesCached: cachedResponses.length,
            cacheSize: await getCacheSize(cache),
            modelsCached: await getModelCacheStatus()
        };
    } catch (error) {
        console.error('Cache status check failed:', error);
        return null;
    }
}

// Clear all caches (for debugging/reset)
async function clearAllCaches() {
    try {
        // Clear service worker cache
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));

        // Clear IndexedDB model cache (implementation depends on transformers.js version)
        // This will force re-download of models on next use
        console.log('All caches cleared');
        return true;
    } catch (error) {
        console.error('Cache clearing failed:', error);
        return false;
    }
}
```

## 4. Implementation Strategy

### Phase 1: Basic Caching (Minimal Implementation)
- Rely on automatic browser/CDN caching
- No additional code required
- Libraries cached automatically for 24+ hours

### Phase 2: Enhanced Caching (Recommended)
- Add service worker for explicit cache control
- Enable IndexedDB model caching
- Provide offline functionality after first load

### Phase 3: Advanced Caching (Optional)
- Add cache status indicators in UI
- Implement cache management controls
- Add progressive loading with cache-first strategy

## 5. Cache Storage Estimates

| Resource Type | Size | Storage Method |
|---------------|------|----------------|
| JavaScript Libraries | ~2-5MB | Service Worker Cache |
| Whisper Model (small) | ~150-200MB | IndexedDB |
| Audio Files (temp) | 0-100MB | Memory (not cached) |
| **Total Storage** | **~150-305MB** | **Mixed** |

## 6. Browser Compatibility

### Service Worker Support
- **Chrome**: Full support (required for app)
- **Storage Quota**: ~60% of available disk space
- **IndexedDB Limit**: ~50% of storage quota

### Fallback Strategy
- If Service Worker fails: Rely on HTTP cache
- If IndexedDB fails: Re-download models each session
- App remains functional with reduced performance

## 7. Development Notes

### Testing Cache Implementation
```javascript
// Force cache refresh (for development)
const CACHE_NAME = 'audio-transcription-app-v2'; // Increment version

// Check if running in development
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if (isDevelopment) {
    // Disable caching in development
    self.addEventListener('fetch', (event) => {
        event.respondWith(fetch(event.request));
    });
}
```

### Cache Debugging
```javascript
// Add to main application for debugging
window.debugCache = {
    status: getCacheStatus,
    clear: clearAllCaches,
    info: () => navigator.storage.estimate()
};
```

## 8. Maintenance

### Cache Updates
- Service Worker cache updates automatically when `sw.js` changes
- Model cache persists until manually cleared or browser storage limit reached
- Monitor cache size and implement cleanup if needed

### Version Management
- Increment `CACHE_NAME` version when updating libraries
- Old caches automatically cleaned up by service worker
- Models remain cached across application updates