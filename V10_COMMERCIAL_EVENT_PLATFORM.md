# V10 Commercial Event Platform

Implemented the commercial product layer across ten upgrade areas:

1. White-label organization branding: logo, colors, tagline and custom-domain field.
2. Public event hub: branded organizer identity, sponsors, teams, live matches and bracket.
3. Player/team profiles: roster, tournament history and match history.
4. Tournament formats: format and best-of series configuration; round-robin schedules all pairings.
5. Sponsor management: sponsor records, public placements, click/impression counters and API.
6. Notifications: in-app organization/tournament notifications and read state.
7. Tournament export: authenticated JSON export for backup and migration workflows.
8. Organizer onboarding: dashboard create flow plus organization branding settings.
9. Analytics: tournament analytics page using event daily metrics and watch data.
10. SaaS plan foundation: organization plan tiers and tournament-limit enforcement.

## Important format note
Single-elimination progression is the mature automatic progression path already present in the app. Round-robin first-round scheduling is materialized automatically. Double-elimination and Swiss are exposed as explicit tournament formats and persisted so the organizer workflow can be extended without changing the data model; complex live progression should remain behind the existing bracket engine until its target mapping is configured for the event.
