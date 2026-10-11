# CFO update: the real prototype cost (from Noctis_5_Unit_Order_Costs.pdf)

**Real invoices for 5 prototype units (EUR 319.78, EUR 63.96 per unit, all-in):** AliExpress EUR 120.34 (17 parts lines, after EUR 18.55 duty reduction), JLCPCB assembled hub boards EUR 37.81, Waveshare ESP32-S3-Touch-LCD-4B EUR 161.64 (5 x USD 33.99 plus shipping).

**What this does and does not tell us**
- It is the first real number: the EUR 40 target is **about EUR 24 (60%) below** what the prototype actually costs.
- It is a 5-unit hobby order, not a production quote. Volume pricing, a single supplier, and a business import route could bring it down. Nobody can say by how much without quotes.
- It is also **incomplete**: it excludes the timber body (the prototype is 3D-printed, filament already owned), tools, assembly labour, the speaker/haptic spec being final, and any duty on delivery for the Waveshare order. The true production figure is therefore higher than EUR 63.96 before any volume discount.
- The Waveshare board alone is EUR 29.23 per unit (USD 33.99 at 0.86), 73% of the EUR 40 target by itself. Hitting EUR 40 means leaving the dev board for a custom PCB (outside the prototype plan) or a much cheaper volume deal.

**Re-run of the model at EUR 63.96 (everything else unchanged)**
| | at EUR 40 target | at EUR 63.96 (real, 5 units) |
|---|---:|---:|
| Contribution per device | EUR 36.67 (37%) | **EUR 12.71 (13%)** |
| Break-even a month | 37 | **106** |
| Margin at plan (45 a month) | 7% | **-17%** |
| Break-even a day (tool) | 2 | 4 |

At EUR 50 the contribution is EUR 26.67 (27%), break-even 51 a month.

**What it changes**
- The stop rule "unit cost above EUR 55 pauses tooling" is already tripped at prototype scale. Do not treat the stop rule as failed for the business, but do not order a batch until a volume quote at or below EUR 55 exists.
- At EUR 120 and the real cost, the business does not work at the modelled volume. It needs either volume pricing/custom PCB, a higher price, or both.
- A price rise to EUR 139 would restore about EUR 29 contribution at EUR 64 cost, but the panel already finds EUR 120 at the ceiling of what buyers say they accept, so price cannot fix this.
- Board condition "costed bill of materials": now **partly met** (prototype BOM known; production BOM is not).
- Source of truth for the model stays `numbers.json` (target) with `numbers-proto-cost.json` as the real-cost case. The tool's verdict on `founder/` still uses `numbers.json`; read the table above for the realistic case.
