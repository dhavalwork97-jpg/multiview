# Organizer Operations Layer

This release adds the product structure for multi-staff tournament operations.

## Roles

- OWNER — full event and billing control
- ADMIN — event configuration and team management
- OPERATOR — match/station operations
- VIEWER — read-only event visibility

## Operational model

A tournament should be operated as an event workspace rather than through one shared admin login.

Recommended workflow:

1. Owner creates the event.
2. Owner/Admin completes event setup.
3. Admin invites operators.
4. Operators run matches and stations.
5. Viewers monitor the event.
6. Incidents are recorded and resolved.
7. Event report is generated after completion.

## Incident management

Use INFO/WARNING/CRITICAL severity and OPEN/ACKNOWLEDGED/RESOLVED status. Critical incidents should be visible in the Control Room and included in the final event report.

## Security principle

Do not put YouTube credentials, Stripe secrets, LiveKit secrets, or Clerk secret keys into browser code. Authorization should be checked server-side before any state-changing operation.

## Next implementation boundary

The existing application should map these policies onto its current Clerk users and tournament ownership model before exposing organization invitations publicly. This release intentionally avoids inventing a database schema that is not present in the supplied V6 source.
