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

**Press and hold the "offhours" wordmark** (top left on Today, top centre in setup) to open the Demo panel:

- **Screens:** jump to any setup step, any tab, the week view, the briefing, the alarm editor or the update flow.
- **Time of day:** Live, Morning, Afternoon, Evening, Night. These jump around the *next* alarm, so evening and night always have one. Today reorders its cards from this, and the evening briefing sends itself.
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
| **Today** | A greeting and four cards, reordered through the day: **Tonight** (bed-by, your alarm, a bedtime pattern from your own nights, wind-down reminder) · **Last night** (estimate, a mini night strip, how it compares with your usual) · **Briefing** (tomorrow at a glance, Play speaks it, tap for the full preview) · **Your NOCTIS** (live device thumbnail, the room now, and how that compares with your longer nights). Morning puts last night first; evening puts tonight first. |
| **Sleep** | **Night:** step back through two weeks of nights. Time asleep with a settled/restless strip and snoring marks (drag to read any moment), the room overnight (drag to read the temperature), snoring with the snore-clips switch right there. **Week:** nightly average against the 7 h 30 that bed-by plans for (tap a night, open it), when you fell asleep against bed-by, and two patterns from your own data. |
| **Alarms** | One card per alarm: time, days, light start, tone, pulse. The next alarm shows its bed-by, plus a heads-up when the first event sits close to it. Tap to edit (wheels, days, wake style, light 10/20/30 min before, tone with preview, delete). Below: the wind-down reminder and how bed-by is worked out. |
| **NOCTIS** | A live render of your NOCTIS in its finish (tap it and the eyes become the colon of the time). Display (brightness, dim with the room, resting face eyes or clock, theme, appearance, 24 h), sound, connections, privacy (including delete my sleep data), automatic updates, Wi-Fi, finish, about, unpair. |

The one pair of eyes travels too: from the splash into the device on Today, and from Today into the big device on the NOCTIS tab and back.

## Insights, not just numbers

`js/services/insights.js` turns the night estimates into plain sentences about *your* nights. It's real logic that works on whatever the device reports.

- **One night:** how it compares with your usual, when you fell asleep against bed-by, when you were most restless and what the room was doing then, when the snoring happened.
- **The week:** whether nights you were asleep near bed-by ran longer, whether cooler rooms went with longer nights (work nights only, so a lie-in doesn't skew it), how much later free mornings start, how consistent your bedtime was, whether snoring follows later nights, and the trend across the week. It ranks them and shows the strongest two.
- **In context:** Today's Tonight card shows your bedtime pattern, and the NOCTIS card compares the room now with the temperature of your longer nights.

Every line that mentions sleep or snoring says "estimate", and an insight only appears when the difference is big enough to notice. There are no scores and no health claims.

## Taken from the team's reference app, and left out on purpose

Kept: the floating tab bar, the card layout, Sleep's night/week split with a room chart and patterns, multiple alarms with wake-style details, the wind-down reminder, delete my sleep data, automatic updates, the resting face option, and the inline briefing play button.

Left out: **Smart wake** (it implies detecting light sleep, which NOCTIS can't verify from room sensing), the **smiling face** (the OS rule is no mouth), and **account / sign out** (there's no backend yet, so it would be fake).

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
  screens.css              splash, setup, tabs, cards, charts, NOCTIS, update
  frame.css                desktop phone frame
js/
  app.js                   boot, theme, navigation, device sync, evening briefing
  ctx.js                   shared app context
  lib/                     dom helpers, springs, time and bedtime maths, store, haptics, speech,
                           tones (alarm tones, synthesised for preview)
  ui/
    eyes.js                the eyes engine (same springs, blinks and behaviours as the device)
                           and the single travelling pair of stage eyes
    device-view.js         live NOCTIS render: idle, clock, sleep, alarm, briefing, voice, off
    charts.js              night strip, room line, week bars, bedtime dots
    wheel.js stack.js sheet.js controls.js island.js icons.js
  services/                ← the swappable layer
    contracts.js           the interfaces (JSDoc)
    index.js               the one place that picks implementations
    device.mock.js         simulated NOCTIS
    calendar.mock.js       simulated Apple and Google calendars
    weather.openmeteo.js   live weather and city search (Open-Meteo), sample fallback
    storage.local.js       localStorage
    briefing.js            builds tomorrow's briefing (real logic, not a mock)
    insights.js            insights from your own nights (real logic)
  screens/                 splash, onboarding, shell (tabs), today, sleep, alarms, alarm (editor),
                           noctis, briefing, update, sheets, demo
assets/                    Manrope (self-hosted, OFL), icons, iOS launch images
tools/make-icons.cjs       regenerates icons and launch images (Playwright)
```

## The mock interfaces

The app only talks to four services (`js/services/contracts.js`):

- **DeviceService**: `scan`, `pair`, `wifiNetworks`, `joinWifi`, `configure`, `sendBriefing`, `nights`, `room`, `deleteSleepData`, `checkUpdate`, `installUpdate`, `unpair`, `status`, `on('status'|'mode')`. Native: CoreBluetooth for pairing and Wi-Fi provisioning, then BLE or Wi-Fi.
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
4. **Alarms** use 5-minute steps like the device picker. You can have several. Bed-by follows whichever rings next. Wake styles are Light, Sound and Pulse, all on by default (Pulse depends on open question 3). Tones are Dawn (the prototype's), Soft chime and Birdsong.
5. **Location** is guessed from the phone's time zone (no permission prompt) and can be changed by search or GPS. If that fails it falls back to Limassol.
6. **The briefing sends at the start of evening** (bedtime − 3 h) while the app is open, or with Send now. A real iPhone app needs a background task or a small backend push for this.
7. **Calendar sign-in is simulated**, with an honest consent sheet that collects no credentials.

## What a browser can't do (and the native app will)

- Bluetooth on iPhone: Safari has no Web Bluetooth. Pairing and Wi-Fi provisioning are simulated.
- Calendar access: EventKit or OAuth needs the native app or a backend.
- Background work: the evening send runs only while the app is open.
- Haptics: on iPhone (Safari 18+) a system switch tick is used where it works. Elsewhere there are none.
