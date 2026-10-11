# NOCTIS (by offhours)

- What it is: a smart bedside companion. A small timber object with a 4-inch square touch screen that replaces the phone at the bedside, so the phone can stay in another room. It does two jobs: alarm and "knowing about tomorrow".
- Who it is for: design-aware adults with disposable income who care about sleep and the feel of their home. They want useful technology without a clinical look, a toy-like personality or more bedside clutter.
- What it sells, at what price: the NOCTIS device at EUR 120 (decided by the founders; earlier working figure was EUR 89). Currency assumed EUR. Brand line "Own your off hours."
- Features: gradual-wake alarm (light, sound, quiet haptic pulse), spoken and on-screen morning briefing (weather, first calendar event, estimated sleep and snoring), "Ask NOCTIS" voice questions answered in one sentence, room sensing (temperature, humidity, light, sound), companion phone app (setup, calendar, Wi-Fi). Calendars: Google, Apple. USB-C powered, Wi-Fi 2.4 GHz and Bluetooth LE.
- Hard rules: not a medical device, not a sleep tracker (sleep and snoring are estimates from room sensing), no messages/feeds/notification mirroring, mic audio processed on device, conversations not stored.
- Where and how: online, direct to consumer from offhours.tech (waitlist live). Europe first (assumption). Delivered by post.
- Budget and constraints: Junior Achievement student company, team of students (CEO, 2 product/app devs, 2 finance, marketing, design). Production cost target under about EUR 40 (a target, not a quote). Prototype hardware (Waveshare ESP32-S3 touchscreen board) arrives 2 Nov 2026; no custom PCB yet. Budget not stated.

## Extra context for the board
- Prototype UI exists as an interactive HTML prototype: device rests showing two animated eyes (no mouth), tap turns the eyes into the colon of the clock. Personality comes from movement.
- Competing habit: most people use their phone as alarm and bedside device.
- Known hardware cost problem: target under about EUR 40 per unit, unverified. Price EUR 120 gives a gross margin before other costs of roughly 67% only if that cost holds.
- Team is students; no funding, manufacturing partner, certification (CE/RED, battery-free USB-C powered) or app finished yet.
- Open: physical buttons, haptics hardware, TTS source (cloud preferred), companion app protocol.
