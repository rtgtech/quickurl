# Design Doc

## Goals
1. Preserve existing public behavior for `/shorten`, `/resolve/:code`, and `/:code`.
2. Migrate persistence from MySQL to Firestore.
3. Add optional user ownership via Firebase Auth.
4. Keep UI appearance and responsive behavior equivalent.

## Architecture

Client (Next.js pages/components)
  -> Route Handlers (`/shorten`, `/resolve/:code`, `/api/my-links*`, internal `/r/:code`)
  -> Firebase Admin SDK
  -> Firestore (`links`, `meta/counter`)

Firebase Auth client tokens
  -> Authorization header
  -> Admin token verification in protected handlers

## Routing strategy
- `GET /` -> home UI.
- `GET /docs` -> docs UI.
- `GET /dashboard` -> dashboard UI.
- `POST /shorten` -> create code.
- `GET /resolve/:code` -> resolve without redirect.
- `GET /:code` -> middleware rewrite to internal `GET /r/:code`, then `301` redirect (or branded `404`).

## Firestore schema
### Collection: `links`
Document id: `shortCode`
Fields:
- `url: string`
- `ownerUid: string | null`
- `isCustom: boolean`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

### Document: `meta/counter`
Fields:
- `nextValue: number`
- `updatedAt: Timestamp`

## Counter generation tradeoffs
- Choice: transaction-based increment on `meta/counter.nextValue`.
- Benefit: strong uniqueness under concurrency.
- Tradeoff: single hot document under extreme write volume.
- Mitigation: retry loop for rare collisions with pre-existing custom IDs.

## Auth/trust boundary
- Client can attach Firebase ID token, but only server decides ownership.
- Protected routes verify token with Firebase Admin.
- Ownership is enforced against `ownerUid` stored in Firestore.

## Compatibility constraints
- Existing status/error behavior maintained for core endpoints:
- `400`: validation errors.
- `404`: missing code.
- `409`: custom code conflict.
- `301`: redirect endpoint.

## Deployment topology
- Next.js app deployed on Vercel (Node runtime for handlers using Admin SDK).
- Firestore + Firebase Auth hosted in Firebase project.
- Vercel env vars mapped from `.env.example` keys.

## Required Firestore indexes
- Single-field indexes are auto-managed for equality queries.
- Composite index likely required for `ownerUid == ...` with `orderBy(createdAt desc)` depending on project defaults. Build index when prompted by Firestore error link.
