# V27 Release — Universal Competition Layer

## Why this upgrade

The platform must not become a collection of sport-specific pages. The generic model is now extended from match scoring into competition results.

## New capabilities

- Universal standings for teams, players and pairs.
- W/D/L and configurable competition points.
- Score-for / score-against / differential.
- Public standings page.
- Admin standings workspace.
- Standings API.
- Adapter-aware score-event controls in the operator scoring screen.
- Admin navigation exposes Standings directly.

## Architecture

`Competition → Match → Side → Participants → Rules Snapshot → Scoring Adapter → Standings`

The next major architectural release should introduce persistent stages and generic advancement slots so a single competition can combine qualification, groups, Swiss, league and knockout stages without reintroducing player-only assumptions.
