# Phase 3 — Streaming Playback Hardening

- Added a real browser HLS player using the existing `hls.js` dependency.
- Watch pages now consume the station's persisted HLS playback key when available.
- Multi-view prefers scalable HLS tiles and falls back to the existing YouTube renderer.
- Premium viewers can opt into the existing LiveKit low-latency player by setting `NEXT_PUBLIC_LIVEKIT_PLAYBACK=true`.
- Existing YouTube playback remains the fallback when HLS is not yet available.
- No Prisma migrations or schema changes.
