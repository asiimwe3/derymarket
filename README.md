# Trade Platform (working name TBD)

All-in-one trade ecosystem for Uganda and Africa: B2C marketplace, C2C classifieds, B2B wholesale/RFQ, services & bookings, auctions, rentals, barter, dropshipping, agricultural trade, Ship-From-Abroad imports, B2G procurement and multi-currency support — built on one shared Trade Engine, one account model and one financial ledger.

> Working name note: "SokoFlow" was rejected — an active Kenyan FMCG company holds the brand. Decide the final product name before Phase 2 public launch.

## Architecture

Modular monolith with a Unified Trade API and 13 engines: Market, Bulk & Procurement, Deals & Offers, Services & Booking, Auction & Rental, Agriculture, Global Trade, Finance & Ledger, Logistics, Trust & Safety, Communication, Analytics.

## Stack

- Web: Next.js (TypeScript)
- Mobile: React Native / Expo
- Backend: Node/TypeScript modular monolith
- Data: Supabase (PostgreSQL, Auth, Storage, Realtime), pg-boss jobs, transactional outbox event log
- Payments: PesaPal (MTN MoMo, Airtel Money, cards, COD) with escrow + double-entry ledger

## Repository layout

```
apps/web      Next.js web app (buyer, seller, business, admin portals)
apps/mobile   Expo mobile app
apps/api      Unified Trade API (modular monolith)
supabase/     Migrations, RLS policies, seed data
docs/         SRS, wireframe spec, wireframes
```

## Phases

1. Core Trade Infrastructure (accounts/roles, Trade Engine, catalog, payments+ledger, orders, trust/admin)
2. Market and Deals (B2C marketplace, C2C classifieds, chat/offers, ratings/returns, mobile app)
3. Business and Wholesale (B2B/B2B2B, RFQs/POs, subscriptions, business dashboards)
4. Extended Trade (services, agriculture, auctions, rentals, barter, dropshipping)
5. Global and Institutional Trade (imports, consolidation hubs, customs/landed cost, B2G, multi-country)
6. Advanced Trade Ecosystem (trade intelligence, reporting, loyalty, partner APIs)

Full specifications: `docs/specs/` (SRS & Technical Blueprint v1.0, Wireframe Specification v1.0).
