# NOCTIS (by offhours) · Business plan

**Verdict: Not yet**

- ✓ Each device earns $36.67 before fixed costs (37% contribution).
- ✗ Year 1 operating LOSS: $2,559.
- ✗ 0 of 20 simulated buyers buy (0%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | $99.17 a device |
| Profit margin at plan | 7% per device |
| Break-even | 2 devices a day |
| Year 1 operating profit | $-2,559 |
| Startup spend | $18,000 |
| Cash needed before it pays for itself | $21,429 |
| Startup money earned back | not in year 1 |
| Buyer panel | 0 buy · 20 pass |

## The idea

- What it is: a smart bedside companion. A small timber object with a 4-inch square touch screen that replaces the phone at the bedside, so the phone can stay in another room. It does two jobs: alarm and "knowing about tomorrow".
- Who it is for: design-aware adults with disposable income who care about sleep and the feel of their home. They want useful technology without a clinical look, a toy-like personality or more bedside clutter.
- What it sells, at what price: the NOCTIS device at EUR 120 (decided by the founders; earlier working figure was EUR 89). Currency assumed EUR. Brand line "Own your off hours."
- Features: gradual-wake alarm (light, sound, quiet haptic pulse), spoken and on-screen morning briefing (weather, first calendar event, estimated sleep and snoring), "Ask NOCTIS" voice questions answered in one sentence, room sensing (temperature, humidity, light, sound), companion phone app (setup, calendar, Wi-Fi). Calendars: Google, Apple. USB-C powered, Wi-Fi 2.4 GHz and Bluetooth LE.
- Hard rules: not a medical device, not a sleep tracker (sleep and snoring are estimates from room sensing), no messages/feeds/notification mirroring, mic audio processed on device, conversations not stored.
- Where and how: online, direct to consumer from offhours.tech (waitlist live). Europe first (assumption). Delivered by post.
- Budget and constraints: Junior Achievement student company, team of students (CEO, 2 product/app devs, 2 finance, marketing, design). Production cost target under about EUR 40 (a target, not a quote). Prototype hardware (Waveshare ESP32-S3 touchscreen board) arrives 2 Nov 2026; no custom PCB yet. Budget not stated.

## Summary

**NOCTIS** is a timber bedside companion with a square touch screen that replaces the phone at the bedside: gentle wake-up alarm and a short morning briefing. It is for design-aware adults who want the phone out of the bedroom. Planned price EUR 120 incl. VAT (decided by the founders).

**Verdict (computed by the tool): Not yet.** Failing: year 1 operating loss of EUR 2,559 on modelled sales of 372 devices, and 0 of 20 simulated buyers buy (bar 25%). Passing: each device earns EUR 36.67 before fixed costs (37%), but only if the EUR 40 unit cost is real, and it is a target, not a quote.

**Numbers:** margin at plan 7%; break-even 37 devices a month; cash needed about EUR 21,400 plus about EUR 12,000 working capital for a first batch of 300.

**Where the board and panel agree:** the pain is real, the experience is distinctive, but the phone and smart displays do the job for free or cheaply and nobody has shown that people will leave the phone in another room. Board: 2 fund-if (4/10, 6/10), 1 pass (3/10). Panel v1 and v2: 0 of 20 buy. Disagreement: Monopoly says pass (no moat, copyable); Product says fund if the alarm is flawless and cost is proven.

**Biggest risk:** unit cost and proof of demand. If the real unit cost is above about EUR 55 at EUR 120, the margin disappears.

**What to start with:** about EUR 18,000 of startup spend plus working capital, but do not spend it before the test: refundable deposits from strangers (start 16 Nov 2026, close 31 Dec).

**This week:** send three assembly-quote requests and fix the open hardware questions (haptics, buttons, mic switch) so the unit cost becomes a number.

Simulated buyers are not customers; numbers are projections based on estimates. Not financial, legal or tax advice.

## What the board said

**Vote: 2 fund if (Offers 4/10, Product 6/10), 1 pass (Monopoly 3/10). Average score 4.3/10.**

### Risks raised by more than one member (go first)
1. **Unverified unit cost.** The under-EUR-40 figure is a target, not a quote. All three lenses flag it. Margin at EUR 120 depends on it.
2. **Unproven demand and distribution.** Waitlist size, source and willingness to pay EUR 120 are unknown. Nobody has shown that people will really leave the phone in another room.
3. **The phone is the free default**, and EUR 20 alarm clocks, smart speakers and Hatch/Loftie-type devices already exist. The product must be clearly better, not just different.
4. **Execution seams the team does not yet own**: unfinished app, calendar OAuth, cloud TTS, no manufacturer, no CE/RED path.
5. **Alarm reliability**: offline alarm and a way to silence it without looking are not settled.

### Conditions (checklist for the rest of the pack)
- [ ] Refundable deposits or pre-orders at EUR 120 from strangers (launch test)
- [ ] Costed bill of materials and landed cost, including cloud TTS per user (CFO, ops)
- [ ] Guarantee or trial the numbers can absorb (offer, CFO)
- [ ] 10+ real users confirm the phone stays out of the bedroom (launch test)
- [ ] Alarm works fully offline, with a defined stop/snooze that needs no looking (product)
- [ ] Confirm board, haptics, speaker, microphone before further site promises (product)
- [ ] Setup flow of a few steps tested with strangers (product)
- [ ] Cut anything that does not serve alarm and briefing until those are flawless (product)
- [ ] Named manufacturer and CE/RED route (ops)
- [ ] A tested channel with a known cost for the first 100 customers (marketing, launch)
- [ ] Evidence of a defensible brand edge, since there is no technical moat (brand)

### Disagreement kept
Monopoly says PASS: no moat, stock board, copyable by month six, product reads as incremental. Offers and Product say the pain is real and the experience (eyes becoming the colon, calm restraint) is distinctive enough to fund if the conditions are met. The honest reading: the idea survives only as a **brand-and-craft object**, and that has to be proven with paid pre-orders before any tooling money is spent.

### Strongest version the board can see
A design-led, phone-free bedside object whose one job is a reliable gentle alarm plus a short spoken briefing. It leads with the alarm and the briefing, treats Ask NOCTIS and room sensing as secondary, sells direct at EUR 120 to a tightly defined design-aware niche, and launches only after paid pre-orders and a real unit cost prove the margin. This is narrower than the full pitch.

## The competition

Sources are web searches run 2026-10-11. Prices are USD where the source was US-based and varied widely between pages, so treat every price as indicative and check the retailer before using it. Rating fields are mostly not verified. I did not verify any competitor's current EU price.

### Table (see competitors.csv)
| Competitor | Type | Comparable price | Notes |
|---|---|---|---|
| Loftie Clock | Direct | USD 120-150 (range 109.99 refurb to 189.99) | Phone-free bedside clock, sounds, app with paid tier |
| Hatch Restore 3 | Direct | about USD 199 list | Sunrise alarm, sound, app with paid tier; no confirmed EU launch found |
| Echo Spot 2024 | Indirect | USD 79.99 list, deals to 44.99 | Alexa, small 2.83in screen |
| Echo Show 5 | Indirect | EUR 108.99 (one EU retailer) | Smart display |
| Google Nest Hub 2 | Indirect | USD 99.99 list, deals to 39 | Smart display |
| Philips Wake-up Light | Indirect | USD 108.95-219.99 | Light-only wake |
| Phone, cheap alarm clock | Substitute | 0 / about EUR 10-30 (estimate) | The real competition |

**Price range for the comparable item:** low about USD 40 (discounted smart displays), median around USD 100-120, high about USD 200. NOCTIS at EUR 120 sits at the upper-middle: near Loftie and Echo Show 5, well under Hatch.

### Positioning map (text)
Axes: price (low to high) and object-first design (utility to considered object).
- Utility/low: phone, cheap clocks, Echo Spot, Nest Hub.
- Utility/mid-high: Philips light.
- Design-led/mid-high: Loftie, Hatch.
- NOCTIS target: design-led, mid price, adds a spoken briefing with calendar and a personality of movement.

### Complaints, ranked (from search summaries, not first-hand review reading)
1. **Subscriptions and setup pushing a paid plan** (Hatch, Loftie). Reviewers describe setup that effectively forces a monthly fee of about GBP 5-6 and billing confusion. Source: [Hatch on Trustpilot](https://uk.trustpilot.com/review/hatch.co), [Loftie on Trustpilot](https://www.trustpilot.com/review/byloftie.com?page=3).
2. **Reliability and app quality**: Wi-Fi reconnect trouble, a slow app, alarms that did not always fire (Loftie, Echo Spot summaries). Sources: [Kimola Echo Spot analysis](https://kimola.com/reports/comprehensive-review-analysis-of-amazon-echo-spot-amazon-en-us-153990), Loftie Trustpilot above.
3. **Price versus a smart speaker**: Good Housekeeping suggested cheaper smart speakers for less than half the Loftie price (via [this review summary](https://shopsavvy.com/reviews-tldr/loftie-smart-alarm-clock)).
4. **Ads and clutter on screen** (Echo Show family). Source: [Slickdeals thread](https://slickdeals.net/f/18930382-44-99-amazon-echo-spot-smart-alarm-clock-w-alexa-2024-model-at-amazon).
5. **Support** weak for Hatch, praised for Loftie (Trustpilot above).
Thin themes: the Echo ad complaint is anecdotal.

### The gap
Nobody in these results combines (a) a considered timber object, (b) a spoken briefing that knows tomorrow's first calendar event, and (c) **no subscription, no ads, no feed**. Complaint 1 and 4 are the evidence. The gap exists but is small and rests on a brand claim, not on technology.

### The threat
Amazon or Google adding a calendar-aware calm mode to a cheap display; Loftie adding a briefing in a software update. Either could do it within months. A clone on the same Waveshare board could appear quickly too. Defence is brand, craft, and the no-subscription promise.

## The buyer panel

**0 buy · 20 pass** (0% buy) out of 20 simulated buyers. Seed 7, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| High earner | 4 | 0%  (thin) |
| Mid-career professional | 8 | 0% |
| Early-career professional | 8 | 0% |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Phone-in-bed scroller | 4 | 0%  (thin) |
| Smart-home owner | 3 | 0%  (thin) |
| Sleep-curious | 3 | 0%  (thin) |
| Design buyer | 5 | 0%  (thin) |
| Deal hunter | 2 | 0%  (thin) |
| Gadget sceptic | 3 | 0%  (thin) |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| $79,000 and up | 7 | 0%  (thin) |
| $57,000 to $79,000 | 7 | 0%  (thin) |
| under $57,000 | 6 | 0%  (thin) |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| need | 9 | "I already have an Echo Show that does alarm, weather and calendar for a lot less than 120 euros. The phone-in-another-room idea is nice, but I've never actually done it, and a pre-order for a new brand isn't going to change that." (P002) · "I need my phone within reach for the kids and emergencies, and the family-favourites workaround still means trusting a setup I have not tested at 3am. I already have a watch and a phone alarm, so 120 euro for a second device that does the same job feels like a luxury." (P003) |
| price | 6 | "I like the idea and I know I scroll too long, but EUR 120 is a lot on my salary for something my phone already does for free. I've tried limits before and I don't trust myself to actually leave the phone in the other room." (P006) · "EUR 120 for something my phone already does for free is a lot on my salary, and I'd wait for a sale or compare it with a cheap smart clock on Amazon first. The 60-day refund is nice, but I'd still be paying upfront for a first-batch product from a company I've never heard of." (P008) |
| trust | 3 | "It looks nice and I like the idea, but I would be paying 120 euros up front to a brand-new company for something that does not exist yet. I have never managed to leave my phone in another room, so I doubt a second object would change that." (P005) · "The offline alarm and the physical button answer my first worry, and the refund is fair, but I would be paying EUR 120 up front for something that does not exist as a shipped product yet. My phone alarm already works for free and I would still be tempted to bring the phone to bed." (P015) |
| habit | 2 | "I already know I scroll too long, but my phone sleeps next to me and I look at it first thing. I doubt a nice wooden clock would change that, and I would just bring the phone to bed anyway." (P001) · "It looks nice, but I already have a smart speaker that does alarm and weather, and my phone alarm works fine. I would be paying 120 euro to move one habit I'm not sure I want to move." (P016) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |

### What would flip a no

- Seeing it work in a friend's home for a couple of weeks, plus proof that a call from my family really rings through to the other room every time.
- Seeing it working in someone's home or a solid independent review, plus a price nearer 80 euros. A clear reason it beats my existing display, like it working without my smart-home ecosystem and no cloud account.
- Proof that the call-through from family works reliably every time, tested with my own phone, plus a lower price around 80 euro.
- Proof that an emergency call from family reliably gets through to this device itself or wakes me properly, so the phone really can stay in another room without me worrying.
- Seeing it working in a real review or a friend's home, plus a price nearer 90 euros once it is actually shipping.
- A price around EUR 70 to 80, or proof from real users that people actually stop taking their phone to bed. The 60-day refund helps, but I'd still have to pay up front.
- Seeing the finished product in a real review from someone independent, and a clear, honest account of how the sleep estimate is made. A lower price, around 80 to 90 euros, would also help.
- A price around EUR 60 to 70, or a proper launch discount, plus some independent reviews from people who've used it for a few weeks.
- A price nearer EUR 70 to 80, or reviews from real owners showing they actually left the phone in another room after a few weeks.
- A price around 60 euros, or proof after the 60-day trial window that people actually keep their phone in another room and sleep better for it. Even then I would wait for reviews.
- Seeing it working in a real review or a friend's home, and knowing the urgent-call setup is dependable. Then I'd order it with the 60-day refund as a safety net.
- A price around EUR 60 to 70, or a few months of reviews from real owners showing the phone really did stay in the other room.

20 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

Price is decided by the founders at **EUR 120** (retail incl. VAT). This file tests that decision; it does not overrule it.

### What buyers said (simulated, 20 buyers)
Acceptable range **EUR 40 to 110**; least resistance at 40; bargain/expensive crossover (IPP) at about 70; the point where too many refuse (PME) at about 110. Median answers: too cheap 35, bargain 59, getting expensive 100, too expensive 140. **EUR 120 is above the range.** Figures are in `pricing-curve.md` (the tool prints $, the data are EUR). 20 simulated buyers is a rough guide, not proof.

### What competitors charge
Loftie about USD 120-150, Echo Show 5 about EUR 109, Nest Hub USD 100 (often discounted to 40-70), Echo Spot USD 80 (deals to 45), Hatch Restore about USD 199 (not clearly sold in the EU). EUR 120 sits at the top of the smart-display group and level with Loftie, with a better story only if the offer closes the gap. See `competitors.md` for sources and caveats.

### What the business needs
At EUR 120 and a EUR 40 unit cost the contribution is EUR 36.67 a device. At EUR 99 retail it would be about EUR 19.75 (24%). At EUR 89 about EUR 12 (17%). Below roughly EUR 99 there is no safety margin for cost overruns (see `cfo.md`).

### Decision
1. **Price to test: EUR 120** (as decided) **against EUR 99** (the highest price inside the simulated range that still leaves a margin). Run both as separate pre-order pages with a refundable EUR 10-20 deposit. Do not discount from EUR 120 later without saying so; no fake "was" price.
2. **Ladder:** none for now. One product, one price. A later "Founding batch" numbering is a status, not a discount.
3. **Opening offer:** 60-day home trial with full refund, numbered founding batch of 300 units, free shipping in the EU. No percentage discount; the guarantee does the work. End date: when the 300 founding units are reserved.
4. **What to test with real buyers:** two landing pages, EUR 120 vs EUR 99, same copy, same traffic source; success is the deposit rate and the cost per deposit. If EUR 99 converts at 1.5x or better than EUR 120, EUR 99 earns more total contribution only if its conversion is at least 1.85x (36.67 / 19.75), so keep EUR 120 unless EUR 99 clearly wins.
5. **Top price objections (verbatim from the panel):**
   - "EUR 120 is a lot when my phone already does the alarm and the weather for free." (P006)
   - "I'd rather wait for a sale or buy a 25 euro sunrise lamp on Amazon." (P008)
   - "I would be paying 120 euros for a habit change I have not made yet." (P005)

## The offer

### Problem list (buyer's words, from panel v1 and competitor complaints)
Before buying: "my phone does this free"; "I have an Echo/Nest"; "EUR 120 is a lot"; "will it exist next year"; "pre-order of something nobody has reviewed"; "will the alarm work with no Wi-Fi"; "a mic by my bed"; "I need my phone for the kids and emergencies"; "can a microphone really estimate sleep"; "I never actually leave the phone in another room".
During: setup effort; calendar sync breaks at 6am; alarm cannot be silenced half asleep.
After: subscription creep; ads on screen (Hatch, Loftie, Echo complaints); what if it does not change my habit.

### The stack (kept = high value, low cost)
| Element | Kills this objection | Cost to deliver |
|---|---|---|
| Alarm stored on device, rings with no Wi-Fi | Wi-Fi down, trust in the alarm | software, no BOM change |
| Physical stop/snooze button (open Q2 in CLAUDE.md) | silence it without looking | about EUR 1 BOM (estimate) |
| Physical microphone-off switch | always-listening mic | about EUR 1 BOM (estimate) |
| No subscription, no ads, no feed (written promise) | competitor subscription/ad complaints | cloud TTS stays a cost; see CFO |
| 60-day home trial, full refund | pre-order risk, "I will not change habit" | returns reserve; see below |
| Numbered founding batch of 300 | real scarcity, craft story | none |
| In-app tip: phone favourites can let family calls through | "I need my phone for the kids" | none. It depends on the phone's own settings, so word it as a tip and never as a NOCTIS feature |
Cut: heavy Ask NOCTIS ambitions and room-sensing extras until alarm and briefing are flawless (board condition).

### Guarantee cost
CFO model reserves EUR 5 a unit for returns. A 60-day refund with 12% returns, each costing about EUR 16 shipping both ways plus EUR 10 refurbish/loss, is about EUR 3.1 a unit before any unit that cannot be resold. Reserve is enough only if returns stay under about 15% and most units are resellable. Re-check after real returns data.

### Value equation (my scoring, 1-10)
| | before | after | what moved it |
|---|---:|---:|---|
| Dream outcome | 6 | 6 | unchanged: a calm morning |
| Likelihood of getting it | 3 | 5 | offline alarm, trial, but still no real reviews |
| Time to result | 7 | 7 | first morning |
| Effort and sacrifice | 4 | 5 | physical button helps; phone in another room is still a big ask |

### Re-test on the same 20 simulated buyers (seed 7)
- **Buy rate: 0 of 20 before, 0 of 20 after.** The offer did not convert anyone.
- What did move: the Wi-Fi-down objection disappeared from the top (it had been the main objection for 4 buyers in v1). The simulated acceptable range rose: upper limit (PME) EUR 109.87 to EUR 120.12, bargain/expensive crossover EUR 70 to EUR 75. EUR 120 now sits at the edge of the range instead of above it.
- What did not move: "my phone / my Echo already does this" (9 buyers), price (6) and, newly prominent, trust: "pay up front to a brand-new company for something that does not exist yet" (3, up from 2).
- Most repeated flips after the offer: independent reviews or a shipped unit to see, and a price of EUR 70 to 90.
- Read: the remaining problems are proof and the strength of the need, not features. A better offer text will not fix them; a working product in real hands and real reviews will.

## The numbers

All figures are EUR (the tool prints a $ sign; ignore it). Every cost is an ESTIMATE except where marked; none is a supplier quote. Revenue is net of an assumed 21% VAT: EUR 120 retail = EUR 99.17 net. An accountant must check VAT, structure and payroll before money moves. Not financial advice.

- **The margin:** each device leaves EUR 36.67 (37% of net price) after its own costs, **if the EUR 40 production cost holds**. At plan volume the business margin after fixed costs is only 7%.
- **The line to watch: the unit cost.** The EUR 40 is a target. What-if (calculated outside the tool, same inputs): at EUR 55 production cost the contribution falls to about EUR 20 (21%); at EUR 70 it is about EUR 5 (5%). Monthly break-even sales go from about 37 devices (EUR 40) to 66 (EUR 55) to roughly 250 (EUR 70).
- **Why EUR 120 and not EUR 89:** at EUR 89 retail with a EUR 40 cost the contribution is only about EUR 12 (17%), and it is negative at EUR 55 cost. EUR 120 is the only price at which the cost target has any room for error. This supports the founders' decision, but the panel says buyers resist it (see pricing).
- **Cash:** about EUR 21,400 of cash to reach the low point, **plus working capital for the first batch** (300 units at EUR 40 is about EUR 12,000 paid to the manufacturer before sales), which is not in these numbers. Realistic seed need: EUR 30,000 to 35,000.
- **Year 1 (372 devices, an assumption):** revenue EUR 36,891, operating profit EUR -2,559, EUR -20,559 after startup spend. Startup money is not earned back in year 1.
- **Break-even:** 37 devices a month (1.2 a day). The tool rounds up to 2 a day.
- **Three ways to improve the margin:** (1) get the all-in unit cost below EUR 40 by cutting the speaker and haptic motor spec or buying 1,000+ units (each EUR 5 saved adds EUR 5 contribution, +14%); (2) sell direct only and skip retailers, who would take 30-40% (not modelled); (3) cut marketing fixed spend from EUR 1,000 to EUR 500 a month and lift year 1 profit by EUR 6,000, at the cost of slower sales.
- **Board money conditions:** a costed bill of materials and landed cost: NOT met. Guarantee affordable: partly (returns reserve EUR 5 a unit covers about 7% returns at full refund loss; a 60-day trial with a higher return rate would need a larger reserve).
- Ongoing cloud TTS is in the model for year 1 only (EUR 3 a unit). A no-subscription promise means this cost never ends; revisit before promising "no subscription" in writing.

## Marketing

Evidence: panel v1 and v2 (0 of 20 buy; objections: need, price, trust, habit), competitor gap (considered object, briefing, no subscription, no ads), `offer.md`. Panel buy rate is zero, so no segment has been shown to buy; the first audience below is a hypothesis to test, taken from the buying behaviours that sounded most open ("Design buyer", "Phone-in-bed scroller").

### Positioning (recommended: #1)
1. For design-aware adults who know they scroll too long in bed, NOCTIS is the bedside object that lets the phone sleep in another room, unlike a smart display that adds ads and an assistant to your bedroom.
2. For people who want a calmer morning, NOCTIS is the alarm that wakes you gently and tells you tomorrow in one short briefing, unlike an alarm app that sits on a phone full of notifications.
3. For people who care about how their home looks, NOCTIS is a timber object with a face made of movement, not a gadget.
Recommended #1: it answers the "Echo/Nest already does this" objection with the real gap (no ads, no feed, built to be quiet). Evidence: complaints about ads and subscriptions on competitor products (`competitors.md`), and the panel's own "I already have a smart display".

### Channels (start with three)
| Channel | Why | Cost | Signal it worked |
|---|---|---|---|
| Short video of the eyes becoming the colon, shot on the real unit (Angelo) | The signature interaction is the product's strongest asset | time | saves and shares; deposits from it |
| Design press and design-minded creators (outreach, disclosed) | Trust and "reviews" objection | time, possibly a loaned unit | any independent mention; deposits |
| Waitlist email (existing offhours.tech list) | Warmest audience | near zero | deposit rate from the list |
Not doing yet: paid social at scale. Reason: see the CAC sum below. Not doing retail partners: 30-40% margin loss we cannot afford.
Worth considering as the test itself: a crowdfunding campaign (platform fees apply; check the platform rules for hardware prototypes).

### Max you can pay to win a customer
One purchase per customer, no repeat sales. Contribution per device is EUR 36.67 (CFO). So the most you can pay is **EUR 36.67 per sold device**, and anything near that leaves nothing for fixed costs. Target under EUR 20. Sum for paid ads: at an assumed EUR 1 per click and 2% of visitors paying a deposit, a deposit costs EUR 50, which is above EUR 36.67. Paid ads lose money unless the landing page converts above about 3% at that click price. These click and conversion figures are assumptions to test, not facts.

### Ten hooks (each answers one objection; no testimonials, no exclamation marks)
1. "Your phone does not have to sleep next to you." (habit)
2. "An alarm that works with the Wi-Fi off." (reliability)
3. "No subscription. No ads. No feed." (competitor complaints)
4. "The microphone has a switch. It is physical." (privacy)
5. "Two eyes. Tap, and they become the time." (the signature, for video)
6. "One short briefing: weather, your first meeting, how long until it." (what it does)
7. "Sleep and snoring shown as estimates, never as a score." (honesty, not medical)
8. "Sixty days at home. If it does not suit you, send it back." (trust)
9. "The first 300 are numbered." (true scarcity)
10. "Made for a bedside table, not a desk." (design)

### 30-day calendar (T = pre-order page live, Mon 16 Nov 2026; prototype hardware arrives Mon 2 Nov)
| Date | Channel | What goes out |
|---|---|---|
| 2 Nov | all | Hardware arrives. Shoot the unit: eyes, colon morph, alarm light rise |
| 3-8 Nov | video | Behind the scenes: making the eyes move. Hook 5 |
| 9-12 Nov | email | Teaser to waitlist. Pre-order date announced |
| 13 Nov | press | Outreach to design press and creators with a short film (disclose any loan) |
| 16 Nov (T) | email, site, video | Pre-order page live: EUR 120 page and EUR 99 page (split test). Refundable deposit. Hooks 3 and 8 |
| 17-20 Nov | video | Hook 2 and 4 films |
| 23-27 Nov | video, email | Hook 1 and 6. Report real numbers: how many deposits so far |
| 30 Nov-4 Dec | video | Hook 7 and 10. Answer comments about the Echo comparison honestly |
| 7-18 Dec | email, video | Behind the scenes of timber options (six finishes are design studies, say so) |
| 21-31 Dec | all | Last call for the founding batch. Close on the stated date, no extension |
Nothing-new-to-say content: the making of the UI, timber finishes, the build of the app.

### Weekly numbers and triggers
1. Landing visitors to deposit rate. Change something below 1.5%.
2. Cost per deposit (paid only). Stop above EUR 36.
3. Share of deposits from strangers (not team, family, friends). Below 70% the test is not valid.
Rules: no fake reviews, no follower counts, no testimonials; panel quotes are research only. Disclose paid partnerships. Claims stay within the product rules: not a medical device, sleep and snoring are estimates.

## Brand

The brand is already decided (offhours, NOCTIS, Manrope, palette, "Own your off hours." and "LESS PHONE AT NIGHT. A SMARTER MORNING."). I am not proposing new names. This file records the checks the skill requires and the gaps.

### Positioning fit
The marketing line "the bedside object that lets the phone sleep in another room" fits the existing brand character (warm, intelligent, precise). Voice rules already set: calm, direct, no exclamation marks, no emoji, estimates labelled.

### Name checks the team must finish (I can only run public searches; a trademark lawyer confirms)
- **Trademark:** NOCTIS is a Latin word likely used by other companies. Search EUIPO TMview and your national register for NOCTIS in classes 9 (devices/software), 14 (clocks) and 42 (software services), and for similar marks. I did not run this search. Nothing is registered until you register it.
- **Domain / handles:** offhours.tech is live. Check the NOCTIS-related .com, and Instagram/TikTok/YouTube handles.
- **Confusion:** none of the competitors in `competitors.md` use NOCTIS. Check outside this set.

### Voice
Promise: "A quiet object that gets you up on time and tells you what tomorrow holds."
Taglines already in use: "Own your off hours."; "LESS PHONE AT NIGHT. A SMARTER MORNING." Third option for the pre-order page: "Let the phone sleep elsewhere."
Voice in three: calm (not vague), direct (not pushy), human (not over-familiar).
Before/after rewrite of a pitch line: before "NOCTIS is an AI-powered sleep companion!" After "NOCTIS wakes you gently and tells you what is first today."

### Look
Palette and type are fixed in CLAUDE.md. Contrast check needed before print: Low Amber (#C89C68) on Night Ink (#171816) is fine for large text; check small text. Keep accent at 10% max. Theme (White/Warm/automatic) is still an open decision and should stay a token.
Gap: the website renders and brand guide show a small smile; the OS decision is no mouth. Update renders before pre-orders, otherwise the product shown is not the product sold.

### First five touchpoints
1. Pre-order page: the eyes become the colon in a 10-second loop, price, deposit, 60-day trial.
2. Box: timber, no stock wellness imagery, no foil.
3. Deposit confirmation email: plain text, shipping window stated as an estimate.
4. First social post: the unit on a real bedside table.
5. Reply to the first complaint: acknowledge, fix, no template apologies.

## Operations

Honesty note: I did not look up supplier prices. Everything below that is a cost is a request for quote to send, not a fact. The CFO's EUR 40 unit cost is still unverified.

### Daily cycle (after launch)
Orders in (deposit converts to order) → batch release to manufacturer → receive and test units → pack → ship → support → returns → restock. Customer sees: order page, confirmation, delivery, setup in the app, first morning.

### Suppliers (what to ask, who to ask)
| Need | Who to contact | Open question |
|---|---|---|
| Display + ESP32-S3 board | Waveshare (prototype board; exact model unconfirmed) | production volumes, a custom board vs the dev board at 300 units |
| Timber enclosure (six finishes) | local CNC / woodworking workshops in your country | cost at 300 units, finish consistency |
| Speaker (40 mm), haptic motor, sensors | component distributors | haptics not confirmed on the prototype |
| Assembly and test | EU/local electronics assembler or a contract manufacturer | minimum order, lead time, price per unit |
| Packaging | local packaging printers | per-unit cost for rigid box |
| Cloud TTS and weather | published pricing of the chosen provider | cost per briefing; no-subscription promise needs a ceiling |
Action: get at least three quotes for assembled units at 300 and at 1,000 and replace EUR 40 in `numbers.json` with the real figure.

### People
The team is volunteer students. Rota for fulfilment weeks: one person packs (about 15 min a unit, estimate), one handles support email daily. No wages in the model; if anyone is paid, add it to fixed costs and have an accountant check payroll.

### Routines (one-liners; write full SOPs before first shipment)
1. Receiving: count, power on, run alarm test and screen test, label pass/fail.
2. Packing: reset to factory state, check serial number against the order, include the quick-start card.
3. Complaint: reply within one working day, ask for photo/video, offer repair or refund, log the cause.
4. Weekly: reorder check, refund log, alarm-failure log (any alarm that failed to ring is the top-priority bug).

### Tools
Payments (a standard processor, fees in the model), a store/pre-order page, a shared inbox, a spreadsheet for serials and returns, bookkeeping software. Check each product's current published prices.

### Compliance checklist (confirm each with the authority; rules change; not legal advice)
- CE marking for radio equipment: Radio Equipment Directive, including EMC, radio spectrum and the cybersecurity requirements for internet-connected radio equipment (check the harmonised standard route). Budgeted EUR 6,000, an estimate.
- RoHS, WEEE producer registration in each sales country, packaging producer responsibility registration.
- GDPR: privacy policy, data processing for calendar and TTS, deletion on request. The product promises on-device mic processing, so the app and backend must not log audio.
- Product liability insurance, VAT/OSS registration for cross-border consumer sales, EU consumer rights (14-day withdrawal applies in addition to your 60-day trial).
- Junior Achievement rules on what a student company may sell and ship: check with your JA coordinator.

### Risk register
| Risk | Likelihood | Impact | Plan |
|---|---|---|---|
| Unit cost far above EUR 40 | High | Business model fails | Quotes before tooling; stop rule: no batch above EUR 55 unit cost at EUR 120 |
| Alarm fails to ring | Medium | Brand ends | Alarm in firmware, tested at 500 cycles, no cloud dependence |
| Certification fails or takes longer | Medium | Cannot sell legally | Pre-scan, budget retest |
| Not enough deposits | High | No batch | Pre-agreed cancellation; refund deposits in full |
| App/calendar sync breaks | Medium | Support load | App owners (Ben, Nick); weekly status; fallback manual alarm |
| Manufacturer delay | Medium | Late delivery | State delivery as estimate; keep deposits refundable |
| Returns above 15% | Medium | Margin loss | Review after first 50 shipments |
| Bad review | Medium | Trust | Public reply, fix, offer refund |
| Cloud TTS cost grows | Medium | No-subscription promise at risk | Cache briefings, cap per-user calls |
| Supply of timber finishes inconsistent | Medium | Complaints | Offer only 2 finishes first |

## Launch plan

Today is 11 Oct 2026. Prototype hardware arrives 2 Nov 2026. There is no sellable product yet, so the first stage is a paid-intent test, not a launch.

### Step 1: the test before the big money
**Refundable-deposit pre-order** on offhours.tech. Two landing pages, same copy, EUR 120 vs EUR 99. Deposit EUR 20, refundable until the batch is ordered. Traffic: waitlist email, organic video, press outreach. Start Mon 16 Nov, close Thu 31 Dec 2026.
**Success line (set now, before running):** 150 refundable deposits from strangers on the EUR 120 page, or a visitor-to-deposit rate of at least 2% over at least 3,000 visitors. Fallback line for a smaller first batch: 100 deposits at EUR 120.
Compare with the simulated panel (0 of 20): if real deposits reach the line, the panel was too harsh; if they land near zero, trust the real buyers and go back to proof (reviews) and the unit cost.
Stop rules: fewer than 50 deposits by 31 Dec, or verified unit cost above EUR 55: pause tooling.

(150 deposits of EUR 20 = EUR 3,000 held; at EUR 120 each that is EUR 18,000 of eventual orders.)

### Step 2: the countdown (owners are suggestions; assign real people)
| Dates | Task | Owner (suggested) |
|---|---|---|
| now - 1 Nov | Fix open questions: board model, haptics, buttons, mic switch; request three assembly quotes | Ben, Nick |
| now - 1 Nov | Company, bank, VAT/OSS, JA rules, insurance quote, EUIPO search | Mikey, Avner, Max |
| 2 Nov | Hardware arrives. Film the unit | Angelo |
| 2-13 Nov | Alarm firmware with offline alarm, physical button test | Ben, Nick |
| 9-13 Nov | Update renders (no mouth). Build two deposit pages | Angelo, Ben |
| 16 Nov | Deposit pages live. Marketing calendar starts | Karam, Angelo |
| 16 Nov - 31 Dec | Run test. Weekly review of numbers | Karam, Max |
| 4 Jan 2027 | Decision meeting: go, adjust, or stop, using the success line | whole team |
| Jan - Mar 2027 (estimate) | If go: pre-production samples, certification, first batch order | Ben, Nick, Avner |
| Mid 2027 (estimate) | First shipments to the founding batch | all |
**Critical path:** unit cost quote → certification → batch order. If a certification retest is needed, shipping slips.

### Step 3: day the pre-order opens (Mon 16 Nov 2026)
08:00 check both pages and deposit flow with a test payment; 09:00 email to waitlist; 10:00 film posted; 12:00 press outreach sent; 15:00 answer questions publicly; 20:00 report first numbers; if payment or page breaks, switch off both pages and email an apology plain and short.

### Step 4: first 30 days (16 Nov - 15 Dec)
Track: visitors, deposit rate by page, cost per deposit, share from strangers, top three questions.
Trigger: below 1.5% conversion by day 10, rewrite page based on the questions; below 0.5% by day 20, stop paid traffic.
Reviews on day 7, 14 and 30. Questions: who is paying, why did they say yes, which objection came back most, do EUR 120 and EUR 99 differ enough to matter.

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
