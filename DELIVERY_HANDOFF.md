# Product Delivery Handoff

## Delivery status

**Status:** Feature scope frozen; product is in delivery/handoff mode.

The stable delivery baseline is the `main` branch. Avoid feature expansion unless a production-blocking defect is found.

## Product scope being handed off

The product is centered on:

- Tournament administration and setup
- Organizer command center/workspace
- Registration and participant management
- Competition structure and brackets
- Scheduling and match operations
- Station assignment and station health
- Tournament Control Room / rundown operations
- Broadcast and HUD tooling
- Multiview viewing experience
- Public tournament surfaces
- Team directory / tournament participant data

## Explicitly out of scope for delivery

- Building a global esports encyclopedia
- Maintaining a global character database as a product feature
- External game/team data API integrations that add ongoing maintenance
- New analytics/demo-data expansion
- New notification/activity-feed expansion
- Broad performance refactors that could affect authentication or existing workflows

## Critical production checks

Before a customer-facing event, verify:

1. Sign-in/authentication works.
2. Organizer can open the tournament workspace.
3. Participants/entrants are present and editable.
4. Bracket/stage and matches are available.
5. Schedule is usable by operators.
6. Matches can be assigned to valid stations.
7. Station health/assignment state is visible.
8. Control Room opens and shows the expected operational state.
9. Broadcast/HUD controls required for the event are available.
10. Public tournament pages resolve correctly.

## Change-control rule

Treat the current production behavior as the source of truth. Do not make speculative architecture, dependency, performance, authentication, or data-model changes during delivery unless they directly resolve a verified production issue.

Prefer small, isolated fixes with validation over broad refactors.

## Deployment baseline

- Primary branch: `main`
- Production application: `https://multiview-fjtd.vercel.app/`
- Build uses the repository's existing Next.js/Prisma pipeline.
- Authentication must not be bypassed or reconfigured as part of routine delivery work.

## Handoff principle

The product is now being delivered as a tournament operations platform. Future work should be driven by real event/operator feedback and production defects rather than adding breadth for its own sake.
