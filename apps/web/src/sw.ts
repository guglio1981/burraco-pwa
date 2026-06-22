/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// vite-plugin-pwa injects the asset manifest here at build time
precacheAndRoute(self.__WB_MANIFEST);

// ── Aggiornamento immediato ─────────────────────────────────
// Con strategia injectManifest, registerType:'autoUpdate' NON basta: senza
// questi due il nuovo SW resta "waiting" e l'utente continua col build vecchio
// finché non chiude tutte le schede. Così invece il nuovo SW prende subito il
// controllo e (con autoUpdate) la pagina si ricarica da sola sull'ultima versione.
self.addEventListener('install', () => { void self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

// ── Push notifications ──────────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  url: string;
  icon?: string;
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  const data = event.data.json() as PushPayload;
  const notifOpts: NotificationOptions & { vibrate?: number[] } = {
    body: data.body,
    icon: data.icon ?? '/icons/icon-192.png',
    badge: '/icons/favicon-32.png',
    data: { url: data.url },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(data.title, notifOpts));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string }).url ?? '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const win = clients.find((c) => 'navigate' in c) as WindowClient | undefined;
        if (win) {
          void win.focus();
          void win.navigate(url);
        } else {
          void self.clients.openWindow(url);
        }
      }),
  );
});
