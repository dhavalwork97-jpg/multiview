# FGC Stream V10 — Commercial Event Platform

This release moves the product from an operator-first streaming tool toward a sellable tournament platform.

## Ten upgrade areas
1. White-label organization branding and custom-domain foundation.
2. Branded public event experience.
3. Player and team profiles.
4. Tournament format and series configuration.
5. Sponsor management and click tracking.
6. In-app notifications.
7. Tournament import/export.
8. Organizer onboarding and branding settings.
9. Event analytics dashboard.
10. SaaS plan tiers and usage enforcement.

### Migration
`prisma/migrations/20260814140000_commercial_event_platform/`

Run:
```bash
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run build
```

### Domain setup
Set an organization's `customDomain` to the host configured in DNS. The middleware resolves the host to the organization's most recent public scheduled/live tournament and rewrites `/` to the branded event route.

### Format note
Single-elimination remains the automatic progression path. Round-robin schedules every pairing immediately. Double-elimination and Swiss are persisted as explicit formats and currently materialize their opening stage; complex downstream mapping should only be enabled when the event's bracket topology has been configured.
