import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
const matchId = __ENV.MATCH_ID || "";

if (!baseUrl) throw new Error("BASE_URL is required");

export const options = {
  scenarios: {
    viewers: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: __ENV.RAMP_UP || "30s", target: Number(__ENV.TARGET_VUS || 25) },
        { duration: __ENV.HOLD || "2m", target: Number(__ENV.TARGET_VUS || 25) },
        { duration: __ENV.RAMP_DOWN || "30s", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500", "p(99)<3000"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const health = http.get(`${baseUrl}/api/health`, { tags: { endpoint: "health" } });
  check(health, { "health endpoint responds": (r) => r.status === 200 || r.status === 503 });

  if (matchId) {
    const watch = http.get(`${baseUrl}/watch/${encodeURIComponent(matchId)}`, {
      tags: { endpoint: "watch" },
    });
    check(watch, { "watch page responds": (r) => r.status === 200 || r.status === 404 });
  }

  sleep(Number(__ENV.THINK_TIME || 2));
}
