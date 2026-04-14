/**
 * Service Worker — PWA caching and update strategy
 * Implements cache-first for assets, network-first for API/auth
 *
 * See docs/PWA_UPDATE_SYSTEM.md for the full update workflow
 */

const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `app-cache-v${CACHE_VERSION}`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
];

// Network-first paths — always attempt network, fall back to cache
const NETWORK_FIRST_PATHS = [
  '/functions/v1/',   // Supabase edge functions
  '/auth/',           // Auth endpoints
  '/rest/v1/',        // Supabase REST API
];

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache strategy ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin except for known Supabase domains
  if (url.origin !== self.location.origin && !url.hostname.includes('supabase')) return;

  // Network-first for API paths
  const isNetworkFirst = NETWORK_FIRST_PATHS.some(path => url.pathname.startsWith(path));

  if (isNetworkFirst) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response('Offline', { status: 503 });
  }
}

// ── Message: SKIP_WAITING from PWAUpdateNotification component ────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
