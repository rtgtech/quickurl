# Developer Guide

## Prerequisites
- Node.js 20+
- npm 10+
- Firebase project with Auth + Firestore
- Optional: MySQL access for migration scripts

## Local setup
1. Install dependencies:
```powershell
npm install
```
2. Copy placeholders:
```powershell
Copy-Item .env.local.example .env.local
```
3. Fill Firebase values in `.env.local`.
4. Start dev server:
```powershell
npm run dev
```

## Emulator vs cloud
- This repo is configured for Firebase cloud by default.
- If using emulators, point credentials/project values accordingly and ensure Admin SDK can initialize for local project.

## Running tests
- Unit + integration:
```powershell
npm run test
```
- Integration only:
```powershell
npm run test:integration
```
- E2E:
```powershell
npm run test:e2e
```

## Adding endpoints safely
1. Add route in `src/app/.../route.ts`.
2. Reuse helpers from `src/lib/url.ts`, `src/lib/validators.ts`, and `src/lib/http.ts`.
3. Enforce auth with `getAuthenticatedRequestContext` for protected operations.
4. Add integration tests for success and failure branches.
5. Update `docs/Function-Reference.md` if new exported handlers are added.

## Adding UI safely
1. Reuse existing CSS classes in `src/app/globals.css`.
2. Keep responsive behavior for `900px` and `600px` breakpoints.
3. Preserve existing copy/labels for compatibility-sensitive flows.
4. Add or update Playwright coverage when behavior changes.

## Troubleshooting
- Firebase API key visible in browser Network tab:
  - Expected. `NEXT_PUBLIC_FIREBASE_API_KEY` is public by design for web clients.
  - Verify no server credentials (`FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, DB passwords) are exposed to client code or prefixed with `NEXT_PUBLIC_`.
- `401 Authentication required`:
  - Confirm client is signed in and Authorization header includes Firebase ID token.
- `403 Forbidden` on dashboard mutations:
  - The code exists but is not owned by the authenticated user.
- Firestore index error on dashboard list:
  - Create the suggested composite index (`ownerUid`, `createdAt desc`).
- Admin SDK init failures:
  - Verify `FIREBASE_PROJECT_ID` and service account env vars.

## Release steps
1. `npm run test`
2. `npm run build`
3. Deploy to Vercel preview.
4. Smoke test `/`, `/docs`, `/shorten`, `/resolve/:code`, `/:code`, and dashboard CRUD.
5. Promote to production.

## Rollback
1. Re-deploy prior stable Vercel build.
2. If needed, restore previous datastore snapshot (see migration runbook).
3. Re-run smoke tests for public API behavior.
