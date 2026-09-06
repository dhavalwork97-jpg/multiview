import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
const matchId = __ENV.MATCH_ID || "";
const target = Number(__ENV.TARGET_VUS || 25);
const ramp = __ENV.RAMP_UP || "30s";
const hold = __ENV.HOLD || "2m";
const down = __ENV.RAMP_DOWN || "30s";

if (!baseUrl) throw new Error("BASE_URL is required");

export const options = {
  scenarios: {
    platform: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: ramp, target },
        { duration: hold, target },
        { duration: down, target: 0 },
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

const paths = ["/", "/live", "/matches", "/community", "/api/health", "/api/ready"];

export default function () {
  for (const path of paths) {
    const response = http.get(`${baseUrl}${path}`, { tags: { endpoint: path } });
    check(response, { [`${path} responds`]: (r) => r.status >= 200 && r.status < 500 });
  }

  if (matchId) {
    const response = http.get(`${baseUrl}/watch/${encodeURIComponent(matchId)}`, { tags: { endpoint: "watch" } });
    check(response, { "watch responds": (r) => r.status === 200 || r.status === 404 });
  }

  sleep(Number(__ENV.THINK_TIME || 2));
}
