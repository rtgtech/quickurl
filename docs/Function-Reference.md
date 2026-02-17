# Function Reference

This document covers exported functions in `src/lib/*`, App Router handlers, and key page/component handlers.

## `src/lib/code.ts`
### `base62Encode(num: number): string`
- Input: non-negative finite integer.
- Output: base62 string using `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`.
- Errors: throws when `num < 0` or non-finite.
- Side effects: none.

## `src/lib/url.ts`
### `normalizeUrl(raw: string): string`
- Input: raw user URL.
- Behavior:
1. Trims whitespace.
2. Keeps as-is if scheme already present.
3. Adds `http://` for localhost/127.0.0.1/::1 inputs without scheme.
4. Adds `https://` otherwise.
- Side effects: none.

### `validateTargetUrl(url: string): string | null`
- Input: normalized URL candidate.
- Output: `null` if valid; specific string message if invalid.
- Validation:
1. URL required.
2. No whitespace.
3. Scheme must be `http` or `https`.
4. Hostname required.
5. `http://` only allowed for local hosts.

## `src/lib/validators.ts`
### `validateCustomCode(rawCode: string): string | null`
- Input: custom code.
- Output: `null` if valid; message string if invalid.
- Rules:
1. Not empty.
2. Not reserved.
3. 2-64 chars, letters/digits only.

## `src/lib/http.ts`
### `buildCorsHeaders(request: Request): HeadersInit`
- Input: incoming request.
- Output: CORS header object honoring `CORS_ALLOWED_ORIGINS`.
- Side effects: none.

### `jsonResponse(request: Request, body: unknown, init?): Response`
- Output: JSON response with merged CORS headers.
- Side effects: none.

## `src/lib/auth.ts`
### `getBearerToken(request: Request): string | null`
- Input: request with optional `Authorization: Bearer <token>`.
- Output: token string or `null`.

### `getAuthenticatedRequestContext(request: Request): Promise<AuthenticatedRequestContext | null>`
- Input: request.
- Output: `{ uid, email }` when token verification succeeds; otherwise `null`.
- Side effects: Firebase Admin Auth token verification.

## `src/lib/firebase/client.ts`
### `getFirebaseClientApp(): FirebaseApp`
- Output: singleton Firebase client app.

### `getFirebaseClientAuth()`
- Output: Firebase Auth client instance.

### `getGoogleProvider()`
- Output: Firebase Google provider instance.

## `src/lib/firebase/admin.ts`
### `getFirebaseAdminApp(): App`
- Output: singleton Firebase Admin app.
- Errors: throws if project id missing.
- Side effects: initializes Admin SDK.

### `getAdminAuth()`
- Output: Firebase Admin Auth instance.

### `getAdminDb()`
- Output: Firestore admin instance.

## `src/lib/firestore.ts`
### `createShortLink(input): Promise<{ code: string; reusedExistingCode: boolean }>`
- Input: normalized URL, optional owner uid, optional custom code.
- Behavior:
1. Custom code path: create by doc id; if exists and same URL, returns same code; else throws `CUSTOM_CODE_TAKEN`.
2. Generated path: transaction-increments `meta/counter.nextValue`, base62-encodes, retries on collision.
- Side effects: Firestore reads/writes to `links` and `meta/counter`.

### `getLinkByCode(code: string): Promise<LinkDocument | null>`
- Side effects: Firestore read from `links/{code}`.

### `listLinksByOwner(ownerUid: string): Promise<LinkDocument[]>`
- Side effects: Firestore query (`ownerUid == uid`, ordered by `createdAt` desc).

### `updateOwnedLink({ code, ownerUid, url })`
- Returns: `updated | not_found | forbidden`.
- Side effects: Firestore read+update.

### `deleteOwnedLink({ code, ownerUid })`
- Returns: `deleted | not_found | forbidden`.
- Side effects: Firestore read+delete.

## App Route Handlers

### `src/app/shorten/route.ts`
- `OPTIONS(request)` -> `204` + CORS headers.
- `POST(request)`:
1. Accepts `{ url, custom_code }` or `{ url, code }`.
2. Normalizes + validates URL.
3. Validates custom code when present.
4. Optionally binds authenticated `ownerUid`.
5. Returns `{ short_code, short_url }`.
- Status codes: `200`, `400`, `409`, `500`.

### `src/app/resolve/[code]/route.ts`
- `OPTIONS(request)` -> `204`.
- `GET(request, { code })` -> `{ url }`.
- Status codes: `200`, `400`, `404`.

### `src/app/r/[code]/route.ts`
- Internal rewritten redirect handler.
- `GET(_, { code })`:
1. Finds code in Firestore.
2. Returns branded HTML `404` if missing.
3. Returns JSON `400` if stored URL invalid.
4. Returns `301` redirect when valid.

### `src/app/api/my-links/route.ts`
- `OPTIONS(request)` -> `204`.
- `GET(request)` -> auth required list of owned links.
- Status codes: `200`, `401`.

### `src/app/api/my-links/[code]/route.ts`
- `OPTIONS(request)` -> `204`.
- `PATCH(request, { code })` -> update owned link URL.
- `DELETE(request, { code })` -> delete owned link.
- Status codes: `200`, `400`, `401`, `403`, `404`.

## Key Page/Client Handlers

### `src/components/home/home-page.tsx`
- `onShorten` calls `POST /shorten`.
- `onVisit` calls `GET /resolve/:code`, then navigates to `/:code`.
- `onCopy` copies latest short URL.

### `src/components/docs/docs-page.tsx`
- `CodePanel` tab switch + copy behavior.

### `src/components/dashboard/dashboard-client.tsx`
- `loadLinks` calls `GET /api/my-links`.
- `onUpdate` calls `PATCH /api/my-links/:code`.
- `onDelete` calls `DELETE /api/my-links/:code`.

## Security notes
- Owner operations are enforced server-side via verified Firebase ID tokens.
- Anonymous users can still shorten/resolve/redirect.
- CORS is controlled by `CORS_ALLOWED_ORIGINS`.
