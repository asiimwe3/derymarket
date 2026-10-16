# apps/api — DeryMarket Unified Trade API (Phase 1, Firebase)

The backend course lives here. TypeScript + Express hosted on one Cloud
Function, Firebase Auth for identity, Firestore for data.

## Firestore layout (replaces SQL tables)

- profiles/{uid} — one identity per human, phone-first (Firebase Auth)
- workspaces/{id} + workspaces/{id}/members/{uid} — storefronts and roles
- listings/{id} — catalog, prices in integer minor units, status lifecycle
- orders/{id} + orders/{id}/items/{itemId} — state machine: created→reserved→paid→fulfilled→released (plus cancelled/refunded/disputed)
- ledgerEntries/{id} — double-entry: every movement is a balanced set of debit/credit entries
- outboxEvents/{id} — transactional outbox for reliable follow-up work
- idempotency/{uid:key} — same request, same result, no duplicates
- disputes/{id}

## The five habits every endpoint follows

1. Validate input first (before touching the database)
2. Authorize: who is calling, and do they own the workspace?
3. Idempotency for writes (`Idempotency-Key` header)
4. Related changes in one Firestore transaction
5. Precise status codes: 400 your fault, 401 who are you, 403 not allowed, 404 doesn't exist, 201 created

Worked example: `src/modules/listings.ts` (POST /api/v1/listings).

## Run locally (free, no billing needed)

```bash
npm install -g firebase-tools
firebase login
cd apps/api && npm install
npm run serve    # starts emulators: Functions http://localhost:5001, Firestore, Auth
```

Then: http://localhost:5001/europe-west1-derymarket/api/health

Deploying for real needs a Firebase project on the Blaze plan (Cloud
Functions require billing, ~cost is tiny at course scale):
`firebase deploy --only functions,firestore`

## Endpoints so far

- GET /health
- GET /api/v1/accounts/me
- POST /api/v1/accounts/workspaces
- GET /api/v1/listings?page=1&size=20 (public browse)
- POST /api/v1/listings (member of workspace + Idempotency-Key)

## Course plan (matching PLAN.md Phase 1)

- Lesson 0 (done) — skeleton: identity, workspaces, listings, orders state
  machine, double-entry ledger design, outbox, idempotency, security rules
- Lesson 1 (yours) — GET /api/v1/listings/:id with 404 handling;
  PATCH /listings/:id (owner-only edit)
- Lesson 2 — place an order: state machine walk created→reserved→paid,
  stock decrement + outbox event, all inside one transaction
- Lesson 3 — PesaPal payment init + IPN webhook + escrow ledger postings
- Lesson 4 — release/refund flows and the dispute path
