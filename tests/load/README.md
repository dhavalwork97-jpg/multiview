# Production load validation

This profile is intentionally opt-in. It does not run in normal CI because a meaningful capacity test must target a deployed staging/production-like environment and a real public match.

## Prerequisites

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) locally or use the official k6 container.

Required:

- `BASE_URL` — deployed FGC URL
- `MATCH_ID` — optional public match ID for exercising the watch page

Optional:

- `TARGET_VUS` — virtual viewers, default `25`
- `RAMP_UP` — default `30s`
- `HOLD` — default `2m`
- `RAMP_DOWN` — default `30s`
- `THINK_TIME` — seconds between iterations, default `2`

## Example

```bash
BASE_URL=https://staging.example.com \
MATCH_ID=<public-match-id> \
TARGET_VUS=100 \
k6 run tests/load/viewer-load.js
```

## Recommended validation ladder

1. 25 VUs for 5 minutes — smoke the profile and dashboards.
2. 100 VUs for 10 minutes — validate application and realtime-adjacent request pressure.
3. 500 VUs for 15 minutes — identify database/cache bottlenecks.
4. 1,000+ VUs — only after the previous levels are clean and infrastructure monitoring is active.

This test does **not** prove HLS/CloudFront viewer capacity by itself. CDN/media delivery should be tested separately with representative media traffic. Socket.IO should also receive a dedicated connection/reconnect test in a staging environment.

The profile fails on >1% HTTP failures, p95 latency above 1.5s, p99 above 3s, or checks below 99%. Tune thresholds only after recording the baseline and understanding the bottleneck.
