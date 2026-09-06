const url = process.env.HLS_URL;
const target = Number(process.env.HLS_CONNECTIONS || 25);
const holdMs = Number(process.env.HLS_HOLD_MS || 120000);

if (!url) throw new Error("HLS_URL is required");
if (!Number.isInteger(target) || target < 1) throw new Error("HLS_CONNECTIONS must be a positive integer");

let ok = 0;
let failed = 0;
const controllers = [];

async function poll() {
  const controller = new AbortController();
  controllers.push(controller);
  const started = Date.now();
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    const body = await response.text();
    if (!response.ok || !body.includes("#EXTM3U")) throw new Error(`HTTP ${response.status} or invalid manifest`);
    ok += 1;
  } catch {
    failed += 1;
  } finally {
    const elapsed = Date.now() - started;
    if (elapsed < 1000) await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
  }
}

const deadline = Date.now() + holdMs;
while (Date.now() < deadline) await Promise.all(Array.from({ length: target }, poll));
for (const controller of controllers) controller.abort();

const result = { target, ok, failed, holdMs };
console.log(JSON.stringify(result));
if (failed > 0 || ok === 0) process.exitCode = 1;
