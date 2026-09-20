const CACHE_NAME = 'me-inc-v7.9';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './icon.png',
    './共用核心系統/程式碼/00_state.js',
    './共用核心系統/程式碼/01_cloud.js',
    './股價系統/程式碼/03_stock.js',
    './記帳系統/程式碼/04_accounting.js',
    './甘特圖系統/程式碼/05_gantt.js',
    './共用核心系統/程式碼/02_tasks.js',
    './共用核心系統/程式碼/06_calendar.js',
    './共用核心系統/程式碼/07_ui.js',
    './共用核心系統/程式碼/08_flowchart_v4.js'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// Clean up old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
