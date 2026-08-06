import { createServer } from "node:http";

/**
 * Both the clip worker and AI worker are, functionally, background job
 * processors with no need to listen on a port. This exists purely so
 * they can register as Render "Web Services" instead of "Background
 * Workers" — Render's Background Worker service type has no free tier
 * at any level (Starter and up, $7/mo minimum, regardless of Blueprint
 * vs. manual creation), while Web Services do. A one-line health
 * endpoint is a small price for that.
 *
 * Only starts if PORT is set (Render sets this automatically for Web
 * Services) — on Fly, or when running via `npm run clip-worker:dev`
 * locally, PORT is unset and this is a no-op, so it doesn't change
 * behavior anywhere else this code runs.
 */
export function startHealthServer(serviceName: string) {
  const port = process.env.PORT;
  if (!port) return;

  createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`${serviceName} ok`);
  }).listen(Number(port), () => {
    console.log(`[${serviceName}] health server on :${port} (keeps this a Render Web Service, not a Background Worker)`);
  });
}
