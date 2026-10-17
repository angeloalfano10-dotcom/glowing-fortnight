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

## Brand v2: night ink to sunrise

The app wears the new offhours identity: Night Ink `#0A1026`, one gradient (blue `#8BA0FF` → lavender `#D6C5D6` → peach `#FFD6A6` → orange `#FF9857`) used sparingly, Manrope, and the crescent moon. The look is a lowkey sunset that follows the day.

- **Tokens:** `css/tokens.css` (Dusk dark, Dawn light) and `css/brand.css` (loaded last: sky, gradient, hero, tab bar, charts).
- **The sky:** `html[data-phase]` is `morning`, `day`, `evening` or `night`, from the next alarm. Every screen has a faint matching glow behind it, plus a whisper of grain.
- **Tonight hero:** the sun sinks as bed-by gets closer, then a moon holds the sky while the dawn glow builds toward the alarm. A **Wake stepper** (±15 min) changes the alarm without leaving Today, and Bed by updates live.
- **Gradient is for the one thing:** the primary button, switches on, progress, the tab lens, the sleep bars. Everything else stays quiet.
- **Theme row:** now only chooses what NOCTIS's own screen looks like (White or Warm). The app always uses Dusk or Dawn.
- **Icons:** `node tools/make-icons.cjs` draws the moon icon and launch screens with no dependencies.

## Round 2: every flow

Reference screens came from Refero (stacked full-width sign-in buttons, a glowing wheel band for wake time, a trust card before the calendar permission, one primary action at the bottom). `css/flows.css` holds the styles.

- **Sign-in** (`js/screens/account.js`, `js/services/account.mock.js`): optional, passwordless. Apple, Google, or an emailed six-digit code, as a setup step ("Save your setup", with Skip for now) and as a sheet from Profile. It is simulated, says so quietly, and any six digits work except 000000. The account service is a fourth swappable interface.
- **Calendar connect:** a trust card first (shows exactly what is read: title and start time, never notes, guests or links), then honest connecting steps, then a result with the calendars it found and the first event NOCTIS will tell you about tomorrow. Setup uses provider cards. The contract matches Google Calendar's API (the same calls Composio exposes), so the real service drops in.
- **Today:** a Tomorrow morning card (weather at wake time and a wake-to-first-event timeline), an avatar that opens Profile, and the wake stepper.
- **Alarm editor:** quick times, a live "7 h 30 asleep, estimated" line, a glowing wheel band and a sunrise bar that shows when the light starts. The Alarms tab says "Rings in 11 h 15 min".
- **Profile:** an account card (avatar ring, email, sign out) or a Sign in card.

## The app and NOCTIS side by side

On a computer, the main link opens **`showcase.html`** by itself. It shows the app on an iPhone next to NOCTIS on the bedside table. They are linked: `showcase.html` relays messages between the two frames (`js/link.js` in the app, a small block at the end of `noctis-os-prototype.html`). Set the alarm in the app (or the Wake stepper) and NOCTIS follows; set it on NOCTIS (picker or "Wake me at 6:30") and the app follows. Screen theme, resting face and brightness go app → NOCTIS, and what NOCTIS is showing (alarm ringing, briefing, asleep) goes back to the app's live device mirror. Last writer wins, so there is no echo. On a real phone this becomes the Bluetooth / Wi-Fi channel.

- Under the phone: **Skip setup** pairs the simulated NOCTIS with sample settings and goes straight to the tabs. **Restart** reloads the app.
- Under NOCTIS: theme, resting face (Eyes or Clock), jump to a time of day (including Wind-down and Wake-up), and Ask NOCTIS questions. On the device itself: tap, swipe, swipe up, press and hold.
- On a phone the main link opens just the app. `?frame=1` opens the app alone in a phone frame on a computer (there is also a link in the footer).
- On a narrow window the two stack, app first.

## NOCTIS OS prototype 0.5

`noctis-os-prototype.html` is still the source of truth for the device. 0.5 brings it closer to the app's design language without changing how it works, and keeps to what an ESP32-S3 can draw (transform, opacity, solid colours; no blur):

- **Clock digits roll:** when a minute changes, only the digits that changed slide up into place.
- **Page dots:** the current dot is a small lens that follows your swipe and stretches between dots.
- **Glass, the cheap way:** tiles, pills, the island and the picker band get a 1 px highlight rim instead of a blur.
- **Control Centre** tiles rise in one after another; **switches** stretch under your finger.
- **Briefing:** the temperature and the sleep estimate count up as their card appears.
- **Wind-down:** 30 min before bed-by NOCTIS says "Wind down · bed by 23:15" once, and the eyes get drowsy. This matches the app's wind-down reminder.
- **Resting face:** Eyes (default) or Clock, the same option as in the app. With Clock, a tap shows the eyes for a few seconds.
- Manrope loads from this repo (Google Fonts only as a fallback), the file declares UTF-8, and `?embed=1` / `?theme=warm` are there for the showcase.

## Design pass: what makes it feel premium

A redesign built on five ideas from the "psychology of good apps" reference, kept inside the offhours rules (calm, no scores, every sleep figure says "estimate"):

- **Goal gradient.** Onboarding has a real progress bar with "Step 2 of 6" and "About 2 min left", and it starts already filled a little (endowed progress). On Today, the Tonight hero is a ring that fills as bed-by gets closer, then as the night runs to the alarm. A "Make mornings yours" card shows `3 of 5` and only the next two open steps.
- **Peak and end.** The last onboarding screen is the peak: the eyes hop, then each thing you set ticks in one by one (paired, alarm, calendar) with a haptic. Finishing the checklist on Today ends with an "All set" island.
- **Labor illusion.** Pairing takes at least a few seconds and says what it is doing: connecting, securing the connection, checking it can reach you.
- **Von Restorff.** One thing per screen is different. Tonight is the only dark card. The only amber, pressable button (`.pill.primary`, with a bottom edge that compresses) is the main action. Everything else is quiet.
- **Choice overload.** Fewer, grouped choices: two checklist steps at a time, empty states with one action.

New pieces: `progressBar`, `progressRing` and `tick` in `js/screens/common.js`; hero, primary button, spacing and elevation tokens in `css/tokens.css`.

Applied across the other tabs, from the app-design-trends and mobile-UI references:

- **One hero per screen, cards not nested.** The next alarm is the hero on Alarms, with the same dark card as Tonight. Sleep shows time asleep as an estimate against the 7 h 30 that bed-by plans for.
- **Fewer choices.** The NOCTIS tab went from five groups to three (Display, Sound, Device).
- **Gestures with a visible alternative.** Press and hold an alarm for Edit, Duplicate and Delete. Sheets still swipe down.
- **Empty states with one action.** No alarms gives a full empty state and an "Add an alarm" button. A place search with no result says what to try next.
- **Something always happening.** Skeleton placeholders while nights load, a progress ring and bars that fill in, ticks that draw themselves, a pressable primary button.
- **Legibility over glass.** The tab bar glass is now about 90% opaque, so labels stay readable on any content (the trends reference warns about this). Touch targets are 44 px or more.
- **Character through movement.** The eyes are the app's character: they hop when pairing succeeds and when setup finishes, and sleep in empty states. No mouth, no cartoon expressions.

Left out on purpose: Duolingo-style streaks and scores. They would turn sleep into a performance, which NOCTIS must not do.

## Demo panel

**Press and hold the "offhours" wordmark** (top left on Today, top centre in setup) to open the Demo panel:

- **Screens:** jump to any setup step, any tab, the week view, the alarm editor or the update flow.
- **Time of day:** Live, Morning, Afternoon, Evening, Night. These jump around the *next* alarm, so evening and night always have one. Today reorders its cards from this.
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
| **Today** | A greeting (with your name if you add one) and three cards, reordered through the day: **Tonight** (bed-by, your alarm, a bedtime pattern from your own nights, wind-down reminder) · **Last night** (estimate, a mini night strip, how it compares with your usual) · **Your NOCTIS** (live device thumbnail, the room now, and how that compares with your nights). Morning puts last night first; evening puts tonight first. |
| **Sleep** | **Night:** step back through two weeks of nights. Time asleep with a settled/restless strip and snoring marks (drag to read any moment), the room overnight (drag to read the temperature), snoring with the snore-clips switch right there. **Week:** nightly average against the 7 h 30 that bed-by plans for (tap a night, open it), when you fell asleep against bed-by, and two patterns from your own data. |
| **Alarms** | Every alarm in one list: big time, days, a switch. The next one is marked, with a heads-up when the first event sits close to it. Tap to edit (wheels, days, wake style, light 10/20/30 min before, tone with preview, delete). Below: the wind-down reminder and how bed-by is worked out. |
| **NOCTIS** | A live render of your NOCTIS in its finish (tap it and the eyes become the colon of the time). Display (brightness, dim with the room, resting face eyes or clock, 24 h), sound, automatic updates, Wi-Fi, finish, about, unpair. |
| **Profile** | You, not the device: your first name for the greeting, nights / alarms / calendars at a glance, calendars and weather location, theme and light or dark, privacy (room sensing, snore clips, Ask NOCTIS, delete my sleep data), about, replay the intro. No account: everything stays on the phone and NOCTIS. |

**Liquid Glass and motion.** The tab bar is a floating glass capsule. The current tab sits under a glass lens that stretches as it moves; press and slide across the bar to drag the lens from tab to tab (with a tick as you cross each one). The bar tucks itself smaller while you scroll down. The compact header is glass too and fades in with the scroll. Cards rise in one after another when you switch tabs, times roll digit by digit when they change, durations count up, chart bars grow from the baseline, the room line draws itself, and switches stretch under your finger. All of it turns into simple fades with Reduce Motion.

The one pair of eyes travels too: from the splash into the device on Today, and from Today into the big device on the NOCTIS tab and back.

**Tomorrow's briefing is NOCTIS only.** NOCTIS is on Wi-Fi and syncs its own briefing (calendar, weather, alarm). There is no send step and no briefing card in the app.

## Insights, not just numbers

`js/services/insights.js` turns the night estimates into plain sentences about *your* nights. It's real logic that works on whatever the device reports.

- **One night:** how it compares with your usual, when you fell asleep against bed-by, when you were most restless and what the room was doing then, when the snoring happened.
- **The week:** whether nights you were asleep near bed-by ran longer, whether cooler rooms went with longer nights (work nights only, so a lie-in doesn't skew it), how much later free mornings start, how consistent your bedtime was, whether snoring follows later nights, and the trend across the week. It ranks them and shows the strongest two.
- **In context:** Today's Tonight card shows your bedtime pattern, and the NOCTIS card compares the room now with your longer nights.

Every line that mentions sleep or snoring says "estimate", and an insight only appears when the difference is big enough to notice. There are no scores and no health claims.

## Taken from the team's reference app, and left out on purpose

Kept: Sleep's night/week split with a room chart and patterns, multiple alarms with wake-style details, the wind-down reminder, delete my sleep data, automatic updates and the resting face option. The look stays offhours: Manrope, the warm palette, big light numerals and the eyes.

Left out: **Smart wake** (it implies detecting light sleep, which NOCTIS can't verify from room sensing), the **smiling face** (the OS rule is no mouth), and **account / sign out** (there's no backend yet, so it would be fake).

## File structure

```
index.html                 app shell, iOS meta, launch images
showcase.html              the app and NOCTIS side by side
noctis-os-prototype.html   NOCTIS OS prototype (device source of truth)
manifest.webmanifest       PWA manifest (standalone, icons)
sw.js                      offline cache for the app shell
css/
  tokens.css               colour and glass tokens: White and Warm × light and dark, type, motion
  base.css                 reset, app shell, type styles
  components.css           pills, Control Centre tiles, switch, segmented, slider,
                           grouped lists, sheets, Dynamic Island, wheel picker
  device.css               NOCTIS render ported from noctis-os-prototype.html
  screens.css              splash, setup, tabs, cards, charts, NOCTIS, profile, motion
  frame.css                desktop phone frame
js/
  app.js                   boot, theme, navigation, device sync, night data
  ctx.js                   shared app context
  lib/                     dom helpers, springs, time and bedtime maths, store, haptics, speech,
                           tones (alarm tones, synthesised for preview)
  ui/
    eyes.js                the eyes engine (same springs, blinks and behaviours as the device)
                           and the single travelling pair of stage eyes
    device-view.js         live NOCTIS render: idle, clock, sleep, alarm, briefing, voice, off
    charts.js              night strip, room line, week bars, bedtime dots
    motion.js              staggered entry, rolling digits, count-up
    wheel.js stack.js sheet.js controls.js island.js icons.js
  services/                ← the swappable layer
    contracts.js           the interfaces (JSDoc)
    index.js               the one place that picks implementations
    device.mock.js         simulated NOCTIS
    calendar.mock.js       simulated Apple and Google calendars
    weather.openmeteo.js   live weather and city search (Open-Meteo), sample fallback
    storage.local.js       localStorage
    briefing.js            mirrors what NOCTIS will say tomorrow (for the device render)
    insights.js            insights from your own nights (real logic)
  screens/                 splash, onboarding, shell (tabs), today, sleep, alarms, alarm (editor),
                           noctis, profile, update, sheets, demo
assets/                    Manrope (self-hosted, OFL), icons, iOS launch images
tools/make-icons.cjs       regenerates icons and launch images (Playwright)
```

## The mock interfaces

The app only talks to four services (`js/services/contracts.js`):

- **DeviceService**: `scan`, `pair`, `wifiNetworks`, `joinWifi`, `configure`, `nights`, `room`, `deleteSleepData`, `checkUpdate`, `installUpdate`, `unpair`, `status`, `on('status'|'mode')`. Native: CoreBluetooth for pairing and Wi-Fi provisioning, then Wi-Fi.
- **CalendarService**: `providers`, `accounts`, `connect`, `disconnect`, `setCalendar`, `firstEvent(date)`. Native: EventKit for Apple, and Google OAuth through a small backend (never on the ESP32).
- **WeatherService**: `morning(place, date)`, `search`, `guess` (from the time zone, no permission needed), `locate`. Can stay on Open-Meteo.
- **StorageService**: `get`, `set`, `remove`, `clear`. Native: UserDefaults or Keychain.

To go native, write implementations with the same methods and change the imports in `js/services/index.js`. Nothing else changes. Demo-only hooks (`simulate`, `setOnline`, `setFlag`, `setEmpty`) are used only by the Demo panel.

NOCTIS is on Wi-Fi and syncs its own briefing (greeting, weather at wake time, first event and time to it), so the phone never sends it. The app builds the same briefing locally only to mirror the device (the live render and Ask NOCTIS answers).

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
6. **NOCTIS fetches its own briefing over Wi-Fi.** Calendar access still needs the phone's consent (EventKit) or a small backend for Google, which NOCTIS then reads from.
7. **Calendar sign-in is simulated**, with an honest consent sheet that collects no credentials.

## What a browser can't do (and the native app will)

- Bluetooth on iPhone: Safari has no Web Bluetooth. Pairing and Wi-Fi provisioning are simulated.
- Calendar access: EventKit or OAuth needs the native app or a backend.
- Haptics: on iPhone (Safari 18+) a system switch tick is used where it works. Elsewhere there are none.
