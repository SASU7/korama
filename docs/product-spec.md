# Korama Investor Prototype — Product Specification

Status: Phase 0 contract, ready for founder review  
Date: 2026-08-29  
Audience: coordinating agent, product/design, engineering, investor-demo reviewers

## 1. Product decision

Korama is presented as a two-way West African trade corridor operated by local
operating companies. The prototype demonstrates a Ghana-to-Nigeria Ghana-origin
shea transaction end to end, while making direct-import inventory visibly distinct.
Korama Holdings is not the seller of record and is not exposed as a commerce actor.

This document freezes the product boundary for the investor prototype. All prices,
tax/duty treatment, origin assessments, aviation records, and operational records are
illustrative unless explicitly marked as verified test-system state.

## 2. Users and access

| User | Surface | Prototype responsibility |
| --- | --- | --- |
| Nigerian consumer | Storefront, checkout, tracking | Buys Ghana-origin shea cosmetics in NGN |
| Warehouse/compliance operator | Operations workspace | Receives, allocates FEFO stock, advances fulfilment, reviews origin evidence |
| Drone safety officer | Delivery workspace | Reviews simulated gates, launches a cleared mission, injects unsafe weather |

The deployed URL is protected by a shared demo access code. Phase 1 implements only
that gate and a role-aware shell. Seeded identities, server-side identity switching,
role assignments, and reset are Phase 2 capabilities.

## 3. Markets and corridor rules

| Horizon | Markets | Prototype behavior |
| --- | --- | --- |
| Phase 1 | Ghana, Nigeria | Transactional; local currency and market listing required |
| Phase 2 | Côte d’Ivoire, Senegal | Roadmap; French localization required |
| Phase 3 | Togo, Benin | Roadmap; logistics and border configuration required |
| Phase 4 | Guinea | Roadmap; higher-friction launch candidate |
| Future Africa | Liberia, Kenya, Tanzania, Rwanda, Namibia, Zambia, Mozambique | Future only; Mozambique also needs Portuguese localization |

`direct_import` means third-country inventory is imported into and cleared in the
market where it is sold. It must never be presented as routed through Ghana.
`ghana_origin_export` means goods were produced or substantially transformed in
Ghana and have supporting evidence. `marketplace_future` is a roadmap capability.

## 4. Canonical deep journey

1. A Nigerian consumer selects Nigeria and browses the catalogue.
2. The consumer opens Ghana-origin shea cosmetics and sees producer, transformation
   summary, batch, expiry, ingredients, provisional origin status, and Lekki stock.
3. Checkout shows NGN product price, illustrative tax/duty treatment, delivery fee,
   and total. No commission, CAC, margin, profitability, or valuation claim appears.
4. Paystack test mode creates a payment attempt. Server-side verification must match
   amount, currency, reference, and order before the order becomes `paid`.
5. Operations sees Ghana production, Tema staging, bulk export, Lekki receipt, batch
   allocation, pick, pack, weight, and dispatch.
6. FEFO chooses the earliest valid, non-quarantined, uncleared batch.
7. The consumer tracking view updates through the same order timeline.
8. The safety officer reviews a simulated Lekki-to-fictional-micro-hub route. Unsafe
   weather locks out flight and creates a ground-courier fallback.

## 5. Screen map

| Route/screen | Depth | Phase | Acceptance focus |
| --- | --- | --- | --- |
| `/` access gate | Deep foundation | 1 | Shared code, keyboard access, clear failure and success states |
| `/` application shell | Deep foundation | 1 | Responsive navigation, market horizon, role placeholders |
| Catalogue | Deep | 3 | Search, filters, market selection, provenance |
| Product detail | Deep | 3 | Shea evidence and direct-import contrast |
| Checkout/order tracking | Deep | 4–5 | Quote, Paystack test payment, timeline |
| Operations | Deep | 5–6 | FEFO, warehouse tasks, transfers, origin evidence |
| Drone mission | Deep | 7 | Safety gates, telemetry, lockout, courier fallback |
| B2B pricing, ratings, returns, curation | Shallow | 8 | Happy path plus honest boundary |
| Roadmap markets | Roadmap | 3/8 | Launch phase and localization/configuration status |
| Holdings economics / treasury / cap table | Excluded | All | Never appears in application UI |

## 6. Business rules

- Every order, payment, inventory batch, receipt, transfer, shipment, and warehouse
  site references its operating company. Holdings cannot sell goods.
- Money is integer minor units plus ISO currency. Prices are market-configured, not
  live FX conversions.
- Expired, quarantined, uncleared, unsupported-origin, unpaid, failed, reversed, or
  amount-mismatched records cannot enter fulfilment.
- Repackaging or relabelling alone cannot qualify goods as Ghana-origin.
- A certificate preview is always watermarked `DEMO — NOT A VALID CERTIFICATE`.
- No exact statutory VAT or duty rate becomes production configuration without
  external validation.
- Drone dispatch requires payload, airworthiness, authorization window, weather,
  geofence, battery, and manual-override readiness. Unsafe conditions force lockout
  or ground-courier fallback.
- Every interactive surface has loading, empty, error, success, keyboard, reduced
  motion, and responsive states where applicable.

## 7. Demo script (8–10 minutes)

| Minute | Presenter action | Proof point |
| --- | --- | --- |
| 0:00–1:00 | Enter demo code and choose Nigeria | Access control and market context |
| 1:00–2:00 | Browse catalogue and compare provenance badges | Two-way corridor, no Ghana transshipment implication |
| 2:00–4:00 | Open shea detail and complete NGN checkout | Producer, transformation, batch, illustrative total |
| 4:00–5:00 | Verify Paystack test payment | Server-confirmed payment before fulfilment |
| 5:00–6:30 | Advance operator tasks | FEFO and auditable Ghana–Tema–Lekki history |
| 6:30–7:30 | Show consumer tracking | Shared order state |
| 7:30–9:00 | Run drone preflight, inject weather | Safety gate and courier fallback |
| 9:00–10:00 | Reset/review disclaimers | Deterministic demo and honest boundaries |

## 8. Acceptance criteria

- Ghana and Nigeria are the only active transactional markets.
- Direct-import goods and Ghana-origin export goods are visibly and correctly labelled.
- The canonical shea order can be followed from product detail to paid order to
  warehouse allocation and simulated delivery.
- No unpaid or mismatched payment enters fulfilment.
- FEFO rejects expired, quarantined, uncleared, unsupported-origin, or insufficient stock.
- Duplicate payment/webhook events do not create duplicate value.
- Unsafe drone conditions prevent or interrupt flight and create courier fallback.
- Reset restores the canonical scenario without modifying external Paystack transactions.
- UI passes keyboard, screen-reader, reduced-motion, and 375/768/1280 px checks.
- No UI makes an unvalidated traction, valuation, margin, profitability, or legal
  compliance claim.

## 9. Explicit exclusions

No production AI, live customs/tax integration, valid certificate issuance, real
aircraft operation, native mobile app, offline synchronization, live Paystack money,
treasury, intercompany accounting, marketplace settlement, refunds, or additional
payment corridors are part of this prototype.
