# Production incident response

## Severity
- **CRITICAL** — event-wide outage, exposed credential, or streaming unavailable across multiple stations.
- **WARNING** — one station degraded, playback missing, or repeated egress failures.
- **INFO** — operator-visible issue with a safe workaround.

## First 5 minutes
1. Open the Tournament Control Room and check System Health.
2. Check the affected station heartbeat, LiveKit room state, and playback source.
3. Use **Reconcile** for DB-only state repair.
4. Use **Repair playback** only when a LIVE station has missing HLS/egress.
5. Do not repeatedly click YouTube Start/Verify; quota protection intentionally blocks unnecessary API writes.

## Credential exposure
Immediately rotate the affected credential at its provider, redeploy the affected service, and record the incident in the Control Room. Never paste secrets into issue trackers or chat logs.

## Database migration failure
A Prisma `P1001` means the application cannot reach the database server. Do not edit a migration just because P1001 occurs; verify DATABASE_URL, Neon availability and network connectivity first.

## Rollback
Deploy the previous known-good application commit. Do not roll back database migrations unless the migration itself is proven unsafe; prefer forward-fix migrations.
