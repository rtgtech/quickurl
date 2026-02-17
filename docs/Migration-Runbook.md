# Migration Runbook (MySQL -> Firestore)

## Objective
Perform a one-time migration from MySQL tables (`quickurl`, `counter_state`) to Firestore (`links`, `meta/counter`) with verification before traffic cutover.

## Preconditions
1. Firebase project created, Firestore enabled.
2. Vercel env vars prepared (but production traffic not switched yet).
3. MySQL source database reachable from migration environment.
4. Backups created:
- MySQL logical dump (`mysqldump`) including `quickurl` and `counter_state`.
- Existing production artifact snapshot.

## Step 1: Dry run
```powershell
npm run migrate:mysql-to-firestore -- --dry-run
```
Confirm:
- Reported MySQL row count.
- Reported counter `nextValue`.
- No write performed.

## Step 2: Execute migration
```powershell
npm run migrate:mysql-to-firestore
```
Behavior:
1. Reads all rows from `quickurl`.
2. Writes each row to Firestore `links/{short_code}`.
3. Writes `meta/counter.nextValue` from `counter_state.value`.

## Step 3: Verify migration
```powershell
npm run verify:migration
```
Checks:
1. MySQL row count equals Firestore doc count.
2. Missing document count for MySQL codes is zero.
3. Counter parity (`counter_state.value` == `meta/counter.nextValue`).

## Step 4: Pre-cutover smoke tests
On preview deployment:
1. `POST /shorten` success + validation errors.
2. `GET /resolve/:code` success + 404.
3. `GET /:code` returns 301 for known code.
4. Missing code returns branded 404 page.
5. Auth dashboard CRUD for owned links.

## Step 5: Cutover
1. Deploy production build to Vercel.
2. Apply production env vars.
3. Switch traffic.
4. Monitor errors/latency for at least one rollback window.

## Rollback plan
1. Switch traffic back to previous Flask deployment.
2. Restore MySQL backup if data correction required.
3. Keep Firestore data for postmortem and replay analysis.

## Post-cutover tasks
1. Remove write paths to legacy MySQL service.
2. Confirm Firestore indexes and security posture.
3. Archive migration logs and verification output.
