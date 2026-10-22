/* Service worker do app do entregador: mostra a notificação push e abre o app ao tocar. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let m = {}
  try { m = e.data ? e.data.json() : {} } catch { m = { corpo: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(m.titulo || 'Nova entrega', {
    body: m.corpo || 'Abra o app para ver',
    tag: m.tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: { url: m.url || '/entregador' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || '/entregador', self.location.origin).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abertas) => {
    const app = abertas.find((c) => c.url.startsWith(self.location.origin))
    if (app) return app.navigate(url).then((c) => (c || app).focus())
    return self.clients.openWindow(url)
  }))
})
