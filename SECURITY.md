# Security

## Authentication & authorization

- **Clerk** handles identity, password hashing, session management and sign-in abuse protection.
- **Role-based access** (`VIEWER < PLAYER < ORGANIZER < ADMIN`) is enforced server-side with `requireRole` in `src/lib/auth.ts`; UI visibility is never treated as authorization.
- Middleware (`src/middleware.ts`) adds route-tree protection while API handlers continue to authorize independently.

## Webhook verification

Inbound Clerk, Stripe and LiveKit webhooks verify cryptographic signatures before their payloads are trusted.

## Input validation

Route bodies are validated with Zod before database writes. Prisma parameterizes normal queries and raw SQL is restricted to controlled health/readiness checks.

## Rate limiting

- Public search: 20 requests per 10 seconds per client IP.
- Clip creation: 5 requests per minute per signed-in user.
- Generic write limiter is available for additional mutating endpoints.
- Production is fail-closed when the Upstash rate-limit credentials are absent, so a missing production limiter cannot silently become unlimited traffic.

High-cost organizer mutation endpoints should use the generic limiter as the organizer population grows.

## Security headers

`next.config.ts` applies `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy`, CSP and `frame-ancestors 'none'`. CSP is explicitly allow-listed for required media, realtime, auth and storage origins.

## Secrets

Secrets are kept in deployment environment configuration and are not committed to source. Media credentials are scoped to required operations, viewer LiveKit tokens are subscribe-only and short-lived, and station ingress keys are rotated when reissued.

## Dependency and code scanning

- Dependabot runs weekly for npm, GitHub Actions and Docker dependencies.
- CodeQL runs on pushes/PRs and on a weekly schedule.
- CI runs `npm audit --audit-level=high`; the audit workflow now uses Node 22 to match the supported application runtime.

## Production operations

`INCIDENT_RESPONSE.md` documents severity levels, the first-response checklist, credential rotation, database connectivity handling and rollback guidance. Production services are monitored through Render and application health/readiness endpoints.

## Launch gaps that remain intentional

- **WAF/DDoS:** Render/Vercel/CloudFront provide baseline platform protection, but FGC does not yet have a deliberately configured application-edge WAF policy. Add one before a high-profile event or major traffic campaign.
- **Central secrets manager:** secrets currently live in deployment-provider environment configuration. Centralized rotation/audit through a dedicated secrets manager remains a future hardening step.
- **Independent penetration testing:** automated CodeQL and dependency auditing are not a substitute for a human-led penetration test. Schedule an external assessment before handling high-value commercial events at scale.
- **DAST:** there is no scheduled authenticated dynamic application security scan yet. Add one against a controlled staging deployment before major public launch.
- **Rate-limit coverage:** not every mutation uses a dedicated limiter yet; high-cost organizer mutations should be covered as the product scales.
- **Operational edge controls:** production should eventually add documented alert thresholds, on-call ownership, backup-restore drills and a tested disaster-recovery runbook.

Security issues should be reported privately through the repository's supported security-reporting mechanism. Never publish credentials, tokens, private user data or exploit details in a public issue.
