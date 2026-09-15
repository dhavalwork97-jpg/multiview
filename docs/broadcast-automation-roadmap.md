# Broadcast Automation & Integrations

This branch starts the next product layer on top of the existing tournament → station → Control Room → broadcast workflow.

## Product goal

An organizer should be able to:

1. Create a tournament.
2. Configure game, format, participants and stages.
3. Generate the bracket and matches.
4. Assign matches to stations.
5. Connect a broadcast destination such as YouTube.
6. Prepare the tournament broadcast from FGC Stream.
7. Operate Program, Preview, rundown, replay, sponsor/break, HUD and overlays from the Control Room.
8. Publish the resulting broadcast to the connected destination.
9. Reuse the same tournament/match data for public surfaces and MultiView.

## Architecture boundary

```text
Tournament data
      ↓
Matches / stations
      ↓
Control Room
      ↓
Broadcast automation layer
      ↓
Provider adapter (YouTube / Twitch / RTMP)
      ↓
Audience destination
```

FGC Stream is the orchestration layer. It does not replace the game, capture hardware, OBS, or the destination platform's video CDN.

## Safety rules

- Never store OAuth access tokens or stream keys in client-side tournament JSON.
- Keep provider-specific credentials inside server-side adapters/secrets.
- Keep the existing manual Control Room workflow working while automation is introduced.
- Automation must be reversible: an operator can always take manual control.
- Do not couple tournament creation to a specific streaming provider.
- A failed provider integration must not prevent tournament operations, brackets, scheduling, or station management.

## Implementation sequence

### Slice 1 — provider-neutral foundation

- Destination intent/types.
- Provider lifecycle states.
- Server-side adapter boundary.
- Validation that excludes secrets from client payloads.

### Slice 2 — destination management

- Tournament-level broadcast destinations.
- Connect/disconnect lifecycle.
- Secure credential storage.
- Operator-visible connection health.

### Slice 3 — YouTube adapter

- OAuth connection.
- Create/update live broadcast metadata.
- Bind a broadcast to a tournament.
- Start/stop lifecycle where supported.
- Error and reconnect handling.

### Slice 4 — source and station automation

- Associate capture/ingest sources with stations.
- Match → station → source resolution.
- Source health in Control Room.
- Preserve manual source selection.

### Slice 5 — broadcast automation

- Match state drives recommended Control Room context.
- Automatic rundown cues with operator approval.
- Match data drives HUD/overlay payloads.
- Program/Preview remains operator-controlled by default.

### Slice 6 — MultiView/public delivery

- Expose available broadcast sources to MultiView.
- Viewer-safe source selection.
- Public tournament state synchronized with live operations.

## Current branch scope

This first commit only establishes the provider-neutral integration contract and roadmap. It intentionally does **not** change the database schema, authentication, existing Control Room commands, or production broadcast behavior.
