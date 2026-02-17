# QuickURL (Next.js + Firebase + Vercel)

QuickURL is now a Next.js App Router service that preserves the original public API contracts while moving storage to Firestore and adding optional Firebase Auth ownership controls.

## Preserved public endpoints
- `POST /shorten`
- `GET /resolve/:code`
- `GET /:code` redirect behavior

## Added authenticated endpoints
- `GET /api/my-links`
- `PATCH /api/my-links/:code`
- `DELETE /api/my-links/:code`

## Stack
- Next.js (TypeScript, App Router)
- Firebase Auth (Email/Password + Google)
- Firestore (links + counter)
- Vercel deployment target

## Local setup
```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment
- Placeholder keys: `.env.example`
- Local placeholders: `.env.local.example`
- Full key-by-key docs: `docs/ENVIRONMENT.md`

## API examples
### `POST /shorten`
Request:
```json
{"url":"https://example.com","custom_code":"myCode123"}
```
Response:
```json
{"short_code":"myCode123","short_url":"http://localhost:3000/myCode123"}
```

### `GET /resolve/g8`
Response:
```json
{"url":"https://example.com"}
```

## Scripts
- `npm run dev` - start Next.js dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run test` - unit + integration tests (Vitest)
- `npm run test:e2e` - Playwright tests
- `npm run migrate:mysql-to-firestore` - run migration
- `npm run verify:migration` - validate migration

## Migration docs
- `docs/Migration-Runbook.md`

## Additional docs
- `docs/Design-Doc.md`
- `docs/Developer-Guide.md`
- `docs/Function-Reference.md`
