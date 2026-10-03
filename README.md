# offhours: the NOCTIS companion app

The phone app for setting up and running NOCTIS. It's a mobile web app that installs to the iPhone Home Screen and behaves like a native app. Plain HTML, CSS and JavaScript modules. No build step, no backend, no tracking.

Everything that needs hardware or accounts (Bluetooth, the device itself, calendar sign-in, sleep data) runs against a **mock layer** behind small interfaces. A native app can swap those mocks for real Bluetooth and OAuth. Weather is live from Open-Meteo, with a labelled sample if it can't connect.

## Run it locally

```bash
npm start            # serves this folder on http://localhost:8080
# or, without Node:
python3 -m http.server 8080
```

On a desktop browser the app shows inside a centred iPhone frame. Add `?frame=0` to the URL to drop the frame, or `?frame=1` to force it.

## Put it on your phone (GitHub Pages)

1. Push this repo to GitHub (the branch with these files).
2. On GitHub, open **Settings → Pages**. Under **Build and deployment**, set **Source: Deploy from a branch**, pick the branch and **/ (root)**, then **Save**.
3. After about a minute the link appears at the top of the Pages settings, for example `https://<user>.github.io/<repo>/`.
4. On the iPhone, open the link in **Safari**, tap **Share → Add to Home Screen**. Open it from the Home Screen: full screen, its own icon, works offline.

The app uses relative paths throughout, so it works from a sub-folder like `/<repo>/` with no changes.

**Netlify:** drag the folder onto app.netlify.com/drop, or connect the repo with an empty build command and publish directory `.`.
**Vercel:** import the repo, Framework preset **Other**, no build command, output directory `.`.

After a redeploy, the first open still shows the cached version and the next open shows the new one. When you ship a release, bump `VERSION` in `sw.js`.

## Demo panel

**Press and hold the "offhours" wordmark** (top left on Home, top centre in setup) to open the Demo panel:

- **Screens:** jump to any setup step, any Home page, the alarm sheet, NOCTIS settings or the update flow.
- **Time of day:** Live, Morning, Afternoon, Evening, Night. These jump around the *next* alarm, so evening and night always have one. Home picks its page from this, and the evening briefing sends itself.
- **NOCTIS:** play Rest, Time, Alarm (then Stop and the briefing), Briefing, Ask, Offline, Back online, Restart on the live device mirror.
- **Sample data:** update available, calendar events, sleep estimates, live or sample weather.
- **Look:** White or Warm theme, Auto, Light or Dark.
- **Start over:** clears everything and reloads.

For the console, `window.offhours` exposes the app context.

## Screens

| | |
|---|---|
| **Splash** | Dark screen, the eyes open, the wordmark arrives, then the eyes fly to where they're needed next. |
| **Setup** | Welcome · Pair (eyes scan, think, then hop) · Wi-Fi (2.4 GHz, wrong password gets a head shake) · Finish (the eyes fly into the device render) · Name · Calendars · Wake time with live "Bed by" · Ready. |
| **Home** | Three pages you swipe, like iOS Weather: **Last night** (estimate) · **Tonight** (Bed by, alarm tile with switch) · **Tomorrow** (briefing preview on a NOCTIS screen, Play with voice, Send). It opens on Last night in the morning and Tonight otherwise. |
| **Alarm** | Scroll wheels (native iOS momentum), live Bed by (alarm − 7 h 30 − 15 min), repeat days, wake with Light / Sound / Pulse. |
| **NOCTIS** | Tap the eyes button at top right: the eyes fly into a live render of your NOCTIS in its finish. Tap the render and the eyes become the colon of the time. Below that sit location, calendars, display, sound, privacy, Wi-Fi, finish, software update, about and unpair. |

## File structure

```
index.html                 app shell, iOS meta, launch images
manifest.webmanifest       PWA manifest (standalone, icons)
sw.js                      offline cache for the app shell
css/
  tokens.css               colour tokens: White and Warm × light and dark, type, motion
  base.css                 reset, app shell, type styles
  components.css           pills, Control Centre tiles, switch, segmented, slider,
                           grouped lists, sheets, Dynamic Island, wheel picker
  device.css               NOCTIS render ported from noctis-os-prototype.html
  screens.css              splash, setup, home, NOCTIS, update
  frame.css                desktop phone frame
js/
  app.js                   boot, theme, navigation, device sync, evening briefing
  ctx.js                   shared app context
  lib/                     dom helpers, springs, time and bedtime maths, store, haptics, speech
  ui/
    eyes.js                the eyes engine (same springs, blinks and behaviours as the device)
                           and the single travelling pair of stage eyes
    device-view.js         live NOCTIS render: idle, clock, sleep, alarm, briefing, voice, off
    wheel.js stack.js sheet.js controls.js island.js icons.js
  services/                ← the swappable layer
    contracts.js           the interfaces (JSDoc)
    index.js               the one place that picks implementations
    device.mock.js         simulated NOCTIS
    calendar.mock.js       simulated Apple and Google calendars
    weather.openmeteo.js   live weather and city search (Open-Meteo), sample fallback
    storage.local.js       localStorage
    briefing.js            builds tomorrow's briefing (real logic, not a mock)
  screens/                 splash, onboarding, home, alarm, noctis, update, sheets, demo
assets/                    Manrope (self-hosted, OFL), icons, iOS launch images
tools/make-icons.cjs       regenerates icons and launch images (Playwright)
```

## The mock interfaces

The app only talks to four services (`js/services/contracts.js`):

- **DeviceService**: `scan`, `pair`, `wifiNetworks`, `joinWifi`, `configure`, `sendBriefing`, `nights`, `checkUpdate`, `installUpdate`, `unpair`, `status`, `on('status'|'mode')`. Native: CoreBluetooth for pairing and Wi-Fi provisioning, then BLE or Wi-Fi.
- **CalendarService**: `providers`, `accounts`, `connect`, `disconnect`, `setCalendar`, `firstEvent(date)`. Native: EventKit for Apple, and Google OAuth through a small backend (never on the ESP32).
- **WeatherService**: `morning(place, date)`, `search`, `guess` (from the time zone, no permission needed), `locate`. Can stay on Open-Meteo.
- **StorageService**: `get`, `set`, `remove`, `clear`. Native: UserDefaults or Keychain.

To go native, write implementations with the same methods and change the imports in `js/services/index.js`. Nothing else changes. Demo-only hooks (`simulate`, `setOnline`, `setFlag`, `setEmpty`) are used only by the Demo panel.

The phone builds the briefing (greeting, weather at wake time, first event and time to it, plus speech text) and pushes it to NOCTIS. NOCTIS only displays and speaks it, and adds its own sleep estimate in the morning.

## Rules this app keeps (from CLAUDE.md)

- No medical claims, no sleep score. Sleep and snoring always say "estimate", with "Estimated from sound in the room. Not a measurement."
- No analytics, no tracking, no third-party scripts. The font is self-hosted. The only network request is weather, which sends coordinates only to Open-Meteo, with no referrer.
- Recordings are off by default. The app never touches the microphone. The copy says audio is processed on NOCTIS and never uploaded.
- Settings live in `localStorage`. Wi-Fi passwords go to the (mock) device and are not stored in the app.
- One idea per screen, the eyes as the face (no mouth), Manrope only, colours as tokens, `prefers-reduced-motion` respected.

## Assumptions (flag any that are wrong)

1. **Theme:** both themes are built and switchable. The app defaults to **Warm**, and the same choice drives the device render. Appearance follows the phone (Auto), with Light and Dark overrides.
2. **12 / 24 h:** defaults from the phone's locale. You can change it in settings.
3. **Six finishes:** Pale maple, Ash, Oak, Cherry, Walnut, Black oak. Ash and Cherry are my picks to make up six. All are design studies.
4. **Alarm** uses 5-minute steps like the device picker, one time with repeat days. Wake styles are Light, Sound and Pulse, all on by default (Pulse depends on open question 3).
5. **Location** is guessed from the phone's time zone (no permission prompt) and can be changed by search or GPS. If that fails it falls back to Limassol.
6. **The briefing sends at the start of evening** (bedtime − 3 h) while the app is open, or with Send now. A real iPhone app needs a background task or a small backend push for this.
7. **Calendar sign-in is simulated**, with an honest consent sheet that collects no credentials.

## What a browser can't do (and the native app will)

- Bluetooth on iPhone: Safari has no Web Bluetooth. Pairing and Wi-Fi provisioning are simulated.
- Calendar access: EventKit or OAuth needs the native app or a backend.
- Background work: the evening send runs only while the app is open.
- Haptics: on iPhone (Safari 18+) a system switch tick is used where it works. Elsewhere there are none.
