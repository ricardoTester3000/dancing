
const cacheName = 'neon-brutality-cache-v1';
const filesToCache = [
    'index.html',
    'style.css',
    'main.js',
    'manifest.json',
    'service-worker.js',
    'assets/bat_icon.png',
    'assets/glow_stick_icon.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(cacheName).then((cache) => cache.addAll(filesToCache))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
