import { createServer } from "node:http";

/**
 * Background processors keep a minimal HTTP listener only because the
 * current Render deployment uses the Web Service tier. The listener must
 * never become an accidental public API surface: only the health endpoint
 * is exposed and every other path is rejected.
 */
export function startHealthServer(serviceName: string) {
  const port = process.env.PORT;
  if (!port) return;

  createServer((req, res) => {
    if (req.method !== "GET" || req.url?.split("?", 1)[0] !== "/healthz") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(`${serviceName} ok`);
  }).listen(Number(port), "0.0.0.0", () => {
    console.log(`[${serviceName}] health server on :${port}`);
  });
}
