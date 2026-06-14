// Service Worker simplifié - évite les bugs de cache
const CACHE = 'fcsm-v3'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  // Supprime tous les anciens caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // Ne met en cache que les assets statiques (JS, CSS, images)
  const url = new URL(e.request.url)
  
  // Ignore toutes les APIs externes
  if (url.hostname !== location.hostname) return

  // Ignore les requêtes non-GET
  if (e.request.method !== 'GET') return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Met en cache seulement si succès
        if (res.ok && (url.pathname.includes('/assets/') || url.pathname === '/')) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => {
        // Fallback cache si hors ligne
        return caches.match(e.request)
          .then(cached => cached || caches.match('/'))
      })
  )
})
