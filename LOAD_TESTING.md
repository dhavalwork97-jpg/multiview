# Load testing

The repository now includes a small k6 smoke/load test for the public event and metrics endpoints.

```bash
k6 run -e BASE_URL=https://your-app.example.com -e TOURNAMENT_ID=YOUR_ID -e VUS=100 -e DURATION=2m loadtest/k6-public-event.js
```

This is deliberately a smoke test, not proof of 100,000 concurrent viewers. Run it against a staging/preview environment first and increase VUS gradually while watching Vercel, Neon, Redis, CloudFront and the socket tier.
