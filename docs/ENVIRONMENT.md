# Environment Variables

This project uses two placeholder files:
- `.env.example` for production-like placeholders
- `.env.local.example` for local placeholders

## Variables
| Key | Required | Purpose | Example placeholder | Consumed in |
|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Optional | Canonical app URL for docs/runtime fallbacks | `https://quickurl.example.com` | `src/lib/constants.ts` (`APP_URL`) |
| `SHORTENER_COUNTER_START` | Optional | Initial counter fallback when `meta/counter` is missing | `1000` | `src/lib/constants.ts`, migration/verification scripts |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes (client auth) | Firebase web config | `your-public-api-key` | `src/lib/firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes (client auth) | Firebase auth domain | `your-project.firebaseapp.com` | `src/lib/firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project id (client + fallback server init) | `your-project-id` | `src/lib/firebase/client.ts`, `src/lib/firebase/admin.ts` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Optional | Firebase storage bucket in client config | `your-project.appspot.com` | `src/lib/firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Optional | Firebase messaging sender id | `1234567890` | `src/lib/firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes (client auth) | Firebase web app id | `1:1234567890:web:abcdef` | `src/lib/firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional | Analytics id (if used) | `G-ABCDEFG123` | `src/lib/firebase/client.ts` |
| `FIREBASE_PROJECT_ID` | Yes (server) | Firebase Admin project id | `your-project-id` | `src/lib/firebase/admin.ts` |
| `FIREBASE_CLIENT_EMAIL` | Recommended (server) | Service account email for Admin SDK cert mode | `firebase-adminsdk-...@project.iam.gserviceaccount.com` | `src/lib/firebase/admin.ts` |
| `FIREBASE_PRIVATE_KEY` | Recommended (server) | Service account private key for Admin SDK cert mode | `-----BEGIN PRIVATE KEY-----...` | `src/lib/firebase/admin.ts` |
| `CORS_ALLOWED_ORIGINS` | Optional | Comma-separated CORS allowlist for API routes | `https://quickurl.example.com,http://localhost:3000` | `src/lib/constants.ts`, `src/lib/http.ts` |
| `MYSQL_HOST` | Required for migration scripts | MySQL source host | `localhost` | `scripts/migrate-mysql-to-firestore.ts`, `scripts/verify-migration.ts` |
| `MYSQL_USER` | Required for migration scripts | MySQL source user | `root` | migration/verification scripts |
| `MYSQL_PASSWORD` | Required for migration scripts | MySQL source password | `your_password` | migration/verification scripts |
| `MYSQL_DATABASE` | Required for migration scripts | Source database name | `url_shortener` | migration/verification scripts |
| `MYSQL_PORT` | Optional | Source database port | `3306` | migration/verification scripts |

## Public vs secret values
- `NEXT_PUBLIC_*` variables are embedded into client bundles by Next.js and are visible in browser DevTools/Network. This is expected.
- `NEXT_PUBLIC_FIREBASE_API_KEY` is a Firebase project identifier, not a private secret.
- Treat these as secrets and keep them server-only: `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, database passwords, and any non-`NEXT_PUBLIC_*` credentials.
- Never rename server-only secrets with a `NEXT_PUBLIC_` prefix.

## Production notes
1. Vercel:
- Add all `NEXT_PUBLIC_*` and server-side Firebase keys in the project Environment Variables.
- Keep `FIREBASE_PRIVATE_KEY` quoted and preserve newline escaping (`\n`) in raw value.

2. Firebase Console:
- Enable Authentication providers: Email/Password and Google.
- Create Firestore database in Native mode.

3. Security:
- Never commit real values in `.env*`.
- Use separate Firebase projects for development and production.
