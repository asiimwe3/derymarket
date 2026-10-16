# apps/api — DeryMarket Unified Trade API (Phase 1)

The backend course lives here. Node + TypeScript + Express + Supabase.

## The five habits every endpoint follows

1. Validate input first (before touching the database)
2. Authorize: who is calling, and do they own the workspace/resource?
3. Idempotency for external writes (`Idempotency-Key` header)
4. Related changes in one transaction
5. Precise status codes: 400 your fault, 401 who are you, 403 not allowed, 404 doesn't exist, 201 created

Worked example: `src/modules/listings.ts` (POST /api/v1/listings).

## Run locally

```bash
cp .env.example .env        # fill in your Supabase project values
npm install
npm run dev                 # http://localhost:4000/health
```

The Supabase project needs migration `supabase/migrations/0001_core.sql`
applied (SQL Editor → paste → Run).

## Endpoints so far

- GET /health
- GET /api/v1/accounts/me
- POST /api/v1/accounts/workspaces
- GET /api/v1/listings?page=1&size=20 (public browse)
- POST /api/v1/listings (member of workspace + Idempotency-Key)

## Course plan (matching PLAN.md Phase 1)

- Lesson 0 (done) — schema + skeleton: identity, workspaces, listings,
  orders, double-entry ledger, outbox, idempotency, RLS
- Lesson 1 (yours) — GET /api/v1/listings/:id with 404 handling;
  PATCH /listings/:id (owner-only edit)
- Lesson 2 — place an order: state machine walk created→reserved→paid,
  stock decrement, outbox event, all inside one RPC
- Lesson 3 — PesaPal payment init + IPN webhook + escrow ledger postings
- Lesson 4 — release/refund flows and the dispute path
