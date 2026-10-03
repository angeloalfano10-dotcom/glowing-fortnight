# NOCTIS and offhours: project context

Read this first. It explains what we are building, why, and the rules that must not be broken. Where something is undecided it says so. Do not guess those parts, ask.

---

## 1. What this is

**offhours** (always lowercase, one word) is a Junior Achievement student company. Brand line: **"Own your off hours."**

**NOCTIS** (always uppercase) is its first product: a **smart bedside companion**. It is a small timber object with a square touch screen that sits on a bedside table.

**Purpose:** people fall asleep scrolling and wake up to a screen of notifications. NOCTIS replaces the phone at the bedside so the phone can stay in another room. It does the two jobs people actually use the phone for in bed: **alarm** and **knowing about tomorrow**.

Product line: **"LESS PHONE AT NIGHT. A SMARTER MORNING."**

Planned retail price: **€89**. Production cost target: **under about €40**. Cost is the main business problem, so avoid anything that adds hardware cost.

### Who it is for
Design-aware adults with disposable income who care about sleep and the feel of their home. They want useful technology without a clinical look, a toy-like personality, or another source of bedside clutter.

### What it is NOT (hard rules)
- **Not a medical device.** Never claim to diagnose, treat or improve any sleep condition or sleep quality.
- **Not a sleep tracker.** No sleep stages, heart rate, SpO2, sleep score. Sleep duration and snoring are **estimates from room sensing**, and every screen and every line of copy that shows them must say "estimate" or "estimated".
- No messages, feeds, social apps or phone notification mirroring. (Overnight notification summaries were dropped because of iPhone and privacy limits.)
- AI is only used where it genuinely helps. Never use "AI-powered" as marketing.
- Do not describe any capability the product cannot verify.

---

## 2. Hardware (working prototype, specs may change)

From the live site, offhours.tech:

| | |
|---|---|
| Display | 4-inch **square** touch display, **480 × 480**, always on, dims automatically to room light |
| Body | 90 × 85 × 91 mm (W × D × H), warm timber, sloped back, ribbed texture, flush display |
| Finishes | Six timber options, pale maple to black oak (design studies, not final) |
| Sensors | Temperature, humidity, ambient light, microphone |
| Audio | Built-in speaker, 40 mm driver |
| Wake methods | Screen light, sound, quiet haptic pulse |
| Connectivity | Wi-Fi 2.4 GHz, Bluetooth LE |
| Power | USB-C, 5 V |

**Prototype board:** a Waveshare ESP32-S3 touchscreen board. *The exact board model is not recorded here. Confirm it before writing display or touch drivers.* No custom PCB at prototype stage.

**Hardware arrives 2 November 2026.** The OS is being built now so it is ready.

Constraints that shape every software decision:
- ESP32-S3 class MCU. Limited RAM and flash. No GPU blur, no heavy shaders.
- Prefer **transform, opacity, scale and solid colours**. Avoid backdrop blur, large gradients, per-pixel effects.
- Keep font count small (one family, few weights) to save flash.
- Microphone audio is **processed on-device**. Conversations are not stored. Short recordings are saved to the app only if the user switches that on.

---

## 3. Product functionality

### Core loop (evening → night → morning)
1. **Evening:** the user sets tomorrow's alarm (by voice or on screen). NOCTIS checks the first calendar event and shows when to be in bed.
2. **Night:** the display fades to a soft dim clock. The phone stays in another room.
3. **Morning:** light, sound and a quiet haptic pulse wake the user, then a spoken and on-screen **briefing**.

### Features
- **Alarm:** gradual wake (screen light rises, sound ramps up over about 25 s), snooze, stop. Routine-aware (weekdays).
- **Morning briefing:** greeting, weather, first event and time until it, estimated sleep and snoring. Example from the site: "Thursday 1 October, 7:10. Good morning." / sleep 7 h 24 / snoring about 12 min / room 22.8° / weather 26° sunny.
- **Ask NOCTIS:** voice questions about calendar, weather and alarm, answered in one sentence and spoken back with TTS. The prototype really talks. Examples: "What's the weather today?", "How did I sleep?", "What's first today?", "Wake me at 6:30."
- **Room sensing:** temperature, humidity, light, sound (snoring, restlessness). Feeds the morning summary and auto-dimming.
- **Connections:** Google Calendar, Apple Calendar, local weather forecast.
- **Companion phone app** (Ben and Nick are building it): setup, calendar and Wi-Fi, settings. Calendar OAuth must NOT run on the ESP32. The phone or a small backend pushes a ready-made briefing to the device, and the device only displays and speaks it. Generating TTS audio in the cloud and just playing it on the device is the preferred route for cost.

---

## 4. NOCTIS OS: UI and UX (the current focus)

A **working interactive prototype** already exists (`noctis-os-prototype.html`, a single file, opens in any browser). **Treat it as the source of truth for behaviour, timing and layout.** The firmware should match it. Open it, play with it, then read the code.

### Design principles
- **One idea per screen.** A dense multi-data UI was tried and rejected as overwhelming. At most about four text items on any screen.
- **The eyes are the default state.** The device sits on a table showing two eyes. Not a dashboard, not a clock.
- **No mouth. Round-ish eyes. Not emotive.** A mouth and big expressions were rejected as cartoonish and off-brand. Personality comes from **movement**, not facial expression.
- **iPhone-inspired, still offhours.** Lock-screen style bold clock, Control Centre style tiles, iOS-like switch, scroll-wheel time picker, Dynamic Island style confirmations. Keep the offhours warmth and restraint.
- Calm, considered, never flashy. No neon, no blue tech gradients, no gamer look.

### The signature interaction
**Tap → the eyes become the colon of the time.** The left eye moves up, the right eye moves down, both shrink into the two dots of the colon, and the hours and minutes appear either side. Tap again (or wait about 9 s) and the colon grows back into eyes. This is the centrepiece. Protect it.

### Modes
`boot` → `idle` (eyes) ⇄ `clock` (time and glances) · `sleep` (night) · `controls` · `picker` (alarm time) · `voice` · `alarm` · `briefing`

| Mode | What shows |
|---|---|
| boot | NOCTIS wordmark, then eyes open |
| idle | Two eyes, blinking, with idle behaviours (below) |
| clock | Date, big time with the eyes as the colon, one status line. Swipe for glances |
| glances (swipe left/right) | Weather · Up next · Bedroom (temp and humidity) |
| sleep | Eyes closed as soft curves, slow breathing, screen dimmed. Tap shows a dim clock |
| controls (swipe up) | Alarm tile with switch, vertical brightness slider, Sleep, Sound |
| picker | Two scroll wheels (hour, minutes in 5s), Cancel / Save |
| voice (hold) | Eyes enlarge, screen edge glows, question appears word by word, answer spoken |
| alarm | Warm light rises, eyes open slowly, become the colon, Snooze / Stop |
| briefing | "Good morning." then weather, first event, sleep estimate, spoken, auto-advancing, tap to skip |

### Gestures
Tap · swipe left/right (glances) · swipe up (controls) · swipe down (close) · press and hold ~0.56 s (ask NOCTIS). Touch targets are **64 px or larger**.

### Idle behaviours (this is what makes it feel alive)
While resting, it picks a new small behaviour every few seconds, never the same one twice in a row, plus normal blinking (every 2.4 to 7 s, sometimes a double blink). Behaviours: **glance**, **look left then right**, **peek** toward an edge and hold, **follow an invisible fly**, **small squash-and-stretch hop**, **look up**, **squint**, **quick head shake**. In the evening it gets **drowsy** (lids lower, then snaps awake). It reacts to a close cursor or touch (notices, squashes slightly under a finger), and startles at a sudden noise. When one eye looks sideways it gets slightly larger than the other so it reads as a head turn.

Rule: expression comes only from eye size, position, eyelid cover, squash and glow. **Never add a mouth, eyebrows, pupils with highlights or cartoon faces.**

### Time-of-day behaviour
Phases are derived from the alarm: `night` = from bedtime to wake time, `evening` = 3 h before bedtime, `day` = otherwise. **Bedtime = alarm − 7 h 30 − 15 min.** Evening dims the screen and slows the eyes. Night dims further, turns colours to a dim neutral, and closes the eyes.

### Themes (not yet decided)
- **White:** pure black screen, white eyes and digits. Closest to iPhone. Night dims to grey.
- **Warm:** offhours palette with Low Amber accent. Night dims to dim amber.
Either may win, or White by day and Warm at night. **Do not hard-code one.** Keep colours as tokens so the theme is a data change.

### Copy rules on screen
Short, plain, calm. "Good morning." / "Bed by 23:15" / "in 1 h 58 min". Sleep is always "estimate". No exclamation marks, no emoji, no "oops". Avoid "AI".

---

## 5. Brand (from the brand guide v1.0, Sept 2026)

- **Character:** warm (human, not sentimental), intelligent (clear, not showy), precise (considered, not clinical), genderless.
- **Voice:** calm (never vague or sleepy), intelligent (never technical for its own sake), direct (never pushy), human (never over-familiar).
- **Typeface:** **Manrope**. Wordmark "offhours" in Manrope Bold, lowercase, never retyped as a substitute. "NOCTIS" in Manrope Medium or SemiBold, uppercase, tracking about **0.22 em**.
- **Palette** (working values until materials and print are checked):

| Name | Hex | Use |
|---|---|---|
| Night Ink | `#171816` | dark foundations |
| Offhours Ink | `#20211F` | text, cards on dark |
| Warm Paper | `#F2EEE7` | primary light background |
| Linen | `#E6DED2` | secondary surfaces |
| Soft Stone | `#BEB3A4` | rules, labels |
| Quiet Taupe | `#887B6A` | captions, support |
| Low Amber | `#C89C68` | small highlights only |
| Warm White | `#FAF8F4` | reverse layouts, text on dark |

  Proportion: about 60% room tones, 30% ink, **10% accent maximum**.
- **Symbol:** a crescent exists but is provisional. Do not build the product identity around it.
- **Avoid:** clinical white boxes, neon blue light, fake biometric graphics, crowded badges, black-on-black luxury clichés, generic wellness stock, foil.

---

## 6. The website (offhours.tech)

Single-page marketing site, in development. Currently shows renders of the product and a waitlist. Sections: **Design · Morning · Ask · Room · Privacy · Specs · Join the waitlist**.

Key copy (keep consistent with the product):
- Hero: "The smart bedside *companion.*" / "Sleep without your phone beside you. Wake up to a briefing that already knows your day."
- "An object first." / "Wake up to a briefing, not a feed." / "Just ask." / "It understands the room, so you don't have to." / "Connected to what matters at night."
- Waitlist form: first name, email, favourite finish, "What matters most to you?"
- Footer: "NOCTIS is in development. Product images are renders of the current design; finishes are design studies. NOCTIS is not a medical device. © 2026 offhours."

The privacy section makes four public promises. **The firmware must honour all four:**
1. Microphone audio is processed on NOCTIS itself, and conversations aren't stored.
2. Short recordings are saved to the app only when the user turns that on.
3. Sleep time and snoring are estimates from room sensing, useful patterns, not measurements.
4. NOCTIS doesn't diagnose or treat any sleep condition.

The site is being rebuilt as an Awwwards-level experience: scroll-driven **Evening → Night → Morning** story with a 3D GLB product model (Three.js / WebGL), cinematic and fast. Product renders show a timber sloped-back block with a flush black screen and two soft oval white eyes. Note: the renders and brand guide show a **small smile**, but the current decision is **no mouth**, so the website renders should be updated to match the OS.

---

## 7. Team

Mikey (CEO) · Ben and Nick (product and app development) · Avner and Max (finance) · Karam (marketing and advertising) · Angelo (design, marketing and all film and photo content, and the OS/UI).

Angelo's judging lens for the project: solves a real, broad problem; understood instantly; demoable; buildable by students; sustainable; sellable.

---

## 8. How to work with Angelo

- **Be direct and concrete.** "Use X, here is why, here is the next step." Not a list of options.
- **Do not ask many clarifying questions.** Make a strong best effort, then flag assumptions. Ask only when a wrong guess is expensive.
- **If he calls something generic, robotic or AI-looking, rethink it substantially.** Do not tweak.
- Think like a product designer and founder at industry level. Be honestly critical when something is a bad idea, with reasons.
- Casual tone is fine.
- If newer information conflicts with older, use the newer.

---

## 9. Open questions (do not assume, ask)

1. **Exact Waveshare board model**, and its touch and audio capabilities.
2. **Physical buttons?** If the screen is the only input, how is the alarm silenced without looking?
3. **Haptics:** the site promises a haptic pulse. Is that hardware actually on the prototype?
4. **12-hour or 24-hour clock**, and any US setting.
5. **Final theme:** White, Warm, or automatic.
6. **Companion app protocol:** how the phone pushes the briefing to the device (BLE or Wi-Fi), and who owns it (Ben and Nick).
7. Whether TTS is generated on the phone, in the cloud, or on the device.

---

## 10. Suggested first tasks for the firmware repo

1. Read `noctis-os-prototype.html` and list every state and transition in it.
2. Confirm the board, then bring up display, touch, backlight and audio.
3. Scaffold PlatformIO or ESP-IDF with LVGL 9 at 480×480, one task per service (UI, time, network, audio, sensors, storage).
4. Build the eyes first: the shape, blink, idle behaviours and the eyes-to-colon morph. If this feels right, the rest follows.
5. Then `clock`, `sleep`, `alarm`, `controls`, `picker`, `briefing`, `voice` in that order.
6. Keep every colour, size and timing in one tokens file so the theme and tuning are data.
