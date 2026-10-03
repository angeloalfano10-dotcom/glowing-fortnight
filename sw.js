// Service worker: the app shell works offline. Same-origin files are served from
// the cache and refreshed in the background, so a new deploy shows on the next
// open. Weather requests go straight to the network.

const VERSION = 'offhours-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/components.css',
  './css/device.css',
  './css/frame.css',
  './css/screens.css',
  './css/tokens.css',
  './js/app.js',
  './js/ctx.js',
  './js/lib/dom.js',
  './js/lib/haptics.js',
  './js/lib/speech.js',
  './js/lib/spring.js',
  './js/lib/store.js',
  './js/lib/time.js',
  './js/lib/tones.js',
  './js/screens/alarm.js',
  './js/screens/alarms.js',
  './js/screens/common.js',
  './js/screens/demo.js',
  './js/screens/home.js',
  './js/screens/noctis.js',
  './js/screens/onboarding.js',
  './js/screens/sheets.js',
  './js/screens/sleep.js',
  './js/screens/splash.js',
  './js/screens/stagehelp.js',
  './js/screens/update.js',
  './js/services/briefing.js',
  './js/services/calendar.mock.js',
  './js/services/contracts.js',
  './js/services/device.mock.js',
  './js/services/index.js',
  './js/services/insights.js',
  './js/services/storage.local.js',
  './js/services/weather.openmeteo.js',
  './js/ui/charts.js',
  './js/ui/controls.js',
  './js/ui/device-view.js',
  './js/ui/eyes.js',
  './js/ui/icons.js',
  './js/ui/island.js',
  './js/ui/sheet.js',
  './js/ui/stack.js',
  './js/ui/wheel.js',
  './assets/fonts/manrope-latin-wght-normal.woff2',
  './assets/fonts/manrope-latin-ext-wght-normal.woff2',
  './assets/icons/favicon.svg',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // weather: network only
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req)
        .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
