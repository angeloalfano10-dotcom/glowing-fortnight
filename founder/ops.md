# Operations

Honesty note: I did not look up supplier prices. Everything below that is a cost is a request for quote to send, not a fact. The CFO's EUR 40 unit cost is still unverified.

## Daily cycle (after launch)
Orders in (deposit converts to order) → batch release to manufacturer → receive and test units → pack → ship → support → returns → restock. Customer sees: order page, confirmation, delivery, setup in the app, first morning.

## Suppliers (what to ask, who to ask)
| Need | Who to contact | Open question |
|---|---|---|
| Display + ESP32-S3 board | Waveshare (prototype board; exact model unconfirmed) | production volumes, a custom board vs the dev board at 300 units |
| Timber enclosure (six finishes) | local CNC / woodworking workshops in your country | cost at 300 units, finish consistency |
| Speaker (40 mm), haptic motor, sensors | component distributors | haptics not confirmed on the prototype |
| Assembly and test | EU/local electronics assembler or a contract manufacturer | minimum order, lead time, price per unit |
| Packaging | local packaging printers | per-unit cost for rigid box |
| Cloud TTS and weather | published pricing of the chosen provider | cost per briefing; no-subscription promise needs a ceiling |
Action: get at least three quotes for assembled units at 300 and at 1,000 and replace EUR 40 in `numbers.json` with the real figure.

## People
The team is volunteer students. Rota for fulfilment weeks: one person packs (about 15 min a unit, estimate), one handles support email daily. No wages in the model; if anyone is paid, add it to fixed costs and have an accountant check payroll.

## Routines (one-liners; write full SOPs before first shipment)
1. Receiving: count, power on, run alarm test and screen test, label pass/fail.
2. Packing: reset to factory state, check serial number against the order, include the quick-start card.
3. Complaint: reply within one working day, ask for photo/video, offer repair or refund, log the cause.
4. Weekly: reorder check, refund log, alarm-failure log (any alarm that failed to ring is the top-priority bug).

## Tools
Payments (a standard processor, fees in the model), a store/pre-order page, a shared inbox, a spreadsheet for serials and returns, bookkeeping software. Check each product's current published prices.

## Compliance checklist (confirm each with the authority; rules change; not legal advice)
- CE marking for radio equipment: Radio Equipment Directive, including EMC, radio spectrum and the cybersecurity requirements for internet-connected radio equipment (check the harmonised standard route). Budgeted EUR 6,000, an estimate.
- RoHS, WEEE producer registration in each sales country, packaging producer responsibility registration.
- GDPR: privacy policy, data processing for calendar and TTS, deletion on request. The product promises on-device mic processing, so the app and backend must not log audio.
- Product liability insurance, VAT/OSS registration for cross-border consumer sales, EU consumer rights (14-day withdrawal applies in addition to your 60-day trial).
- Junior Achievement rules on what a student company may sell and ship: check with your JA coordinator.

## Risk register
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
