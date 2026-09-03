# Phase 3.2 — Streaming QA / Hardening

## Hardened in this phase

- HLS player now has bounded network recovery, media-error recovery, manual retry, visibility-resume recovery, and cleanup of timers/listeners.
- HLS buffering/retry settings are bounded to avoid unbounded client-side resource growth.
- Multiview normalizes the CloudFront HLS URL in one place and falls back to YouTube when an HLS URL cannot be built.
- Multiview keeps one explicit audio-focus tile instead of relying only on tile position.
- Existing LiveKit/YouTube selection in `VideoPlayer` remains unchanged: premium LiveKit when explicitly enabled, otherwise HLS when configured, otherwise YouTube.

## Required production QA

1. Open a live HLS watch page and confirm playback starts on Chrome/Edge/Safari.
2. Temporarily interrupt the HLS origin/network and confirm recovery or the Retry stream control appears.
3. Background the tab, return to it, and confirm the player resumes loading.
4. Open `/multiview` with 4 and 9 live stations; confirm each HLS tile uses the expected CloudFront URL.
5. Confirm a station with no HLS key but a YouTube ID falls back to YouTube.
6. Confirm a station with neither source renders offline state.
7. Switch multiview audio focus between tiles and confirm only the focused tile is unmuted.
8. With `NEXT_PUBLIC_LIVEKIT_PLAYBACK=true` and a premium account, verify the existing LiveKit path still renders.
9. With LiveKit disabled, verify configured HLS takes precedence over YouTube on live watch pages.
10. Verify mobile Safari/Chrome, autoplay policy behavior, and manual play recovery.
11. Run `npx prisma migrate status`, `npx prisma generate`, `npm run typecheck`, and `npm run build` from a clean checkout.

## Environment checks

- `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` must contain the CloudFront host (with or without `https://`; trailing slash is tolerated).
- `NEXT_PUBLIC_LIVEKIT_PLAYBACK` must be explicitly `true` to select the premium LiveKit path.
- HLS playlist keys should be relative object paths such as `<playback-id>/index.m3u8`.
