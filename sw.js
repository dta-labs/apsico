;
const CACHE_NAME = 'v1_cache',
urlsToCahce = [
    './',
    './images/favicon.webp',
    './css/font-awesome.min.css',
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.6.9/angular.min.js',
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.6.9/angular-route.js',
    'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js'

]

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(urlsToCahce)
            .then(() => self.skipWaiting())
        })
        .catch(err => console.log('Falló registro de caché', err))
    )
})

self.addEventListener('activate', e => {
    const cacheWhiteList = [CACHE_NAME]
    e.waitUntil(
        caches.keys()
        .then(cachesNames => {
            cachesNames.map(cacheName => {
                if (cacheWhiteList.indexOf(cacheName) === -1) {
                    return caches.delete(cacheName)
                }
            })
        })
        .then(() => self.clients.claim())
    )
})

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request)
        .then(res => {
            if (res) {
                return res
            }
            return fetch(e.request)
        })
    )
})

