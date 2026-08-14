import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errors = new Rate('errors');
export const options = {
  vus: Number(__ENV.VUS || 25),
  duration: __ENV.DURATION || '30s',
  thresholds: { http_req_failed: ['rate<0.02'], errors: ['rate<0.02'], http_req_duration: ['p(95)<1500'] },
};

const base = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const tournamentId = __ENV.TOURNAMENT_ID;

export default function () {
  if (!tournamentId) throw new Error('Set TOURNAMENT_ID');
  const responses = [
    http.get(`${base}/api/tournaments/${tournamentId}`),
    http.get(`${base}/api/tournaments/${tournamentId}/metrics`),
  ];
  for (const res of responses) {
    const ok = check(res, { 'status is not 5xx': (r) => r.status < 500 });
    errors.add(!ok);
  }
  sleep(1);
}
