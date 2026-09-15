import { chromium, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.WALKTHROUGH_BASE_URL ?? 'https://multiview-fjtd.vercel.app';
const OUT = path.resolve(process.env.WALKTHROUGH_OUT ?? 'recordings/product-walkthrough');
const SCREENSHOTS = path.join(OUT, 'screenshots');

const routes = [
  ['/demo', 'Product overview'],
  ['/demo/create-tournament', 'Create tournament'],
  ['/demo/admin', 'Tournament administration'],
  ['/demo/organizer', 'Organizer command center'],
  ['/demo/tournament', 'Tournament operations'],
  ['/demo/matches', 'Match operations'],
  ['/demo/control-room', 'Tournament control room'],
  ['/demo/multiview', 'MultiView'],
  ['/demo/overlay', 'Overlay and broadcast'],
  ['/demo/analytics', 'Analytics and reports'],
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function settle(page: Page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(1200);
}

async function captureFullPageJourney(page: Page, slug: string) {
  const safe = slug.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '');
  const meta = await page.evaluate(() => ({
    height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    viewport: window.innerHeight,
    title: document.title,
  }));

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  await sleep(900);

  const step = Math.max(450, Math.floor(meta.viewport * 0.72));
  const positions: number[] = [];
  for (let y = 0; y < meta.height; y += step) positions.push(y);
  positions.push(Math.max(0, meta.height - meta.viewport));

  for (const y of [...new Set(positions)]) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' as ScrollBehavior }), y);
    await sleep(650);
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  await sleep(900);
  await page.screenshot({ path: path.join(SCREENSHOTS, `${safe}-top.png`) });
  return { ...meta, scrollSteps: positions.length };
}

async function showcaseCreateTournament(page: Page) {
  const steps: string[] = [];
  for (const label of ['Competition name', 'Sport / category', 'Game / title', 'Competition type', 'Participant model', 'Format', 'Best of / series', 'Participants']) {
    const locator = page.getByText(label, { exact: true }).first();
    if (await locator.count()) {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await sleep(550);
      steps.push(label);
    }
  }
  const create = page.getByRole('button', { name: /create tournament/i });
  if (await create.count()) {
    await create.scrollIntoViewIfNeeded();
    await sleep(700);
    await create.click();
    await sleep(1000);
    steps.push('Create tournament confirmation');
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  await sleep(700);
  return steps;
}

async function deepControlRoom(page: Page) {
  const keywords = [
    'Program', 'Preview', 'Replay', 'Sponsor', 'Break', 'Rundown', 'Timeline',
    'Station', 'Health', 'Alert', 'Overlay', 'HUD', 'Stream Deck', 'Match',
  ];
  const seen: string[] = [];
  for (const keyword of keywords) {
    const locator = page.getByText(keyword, { exact: false }).first();
    if (await locator.count()) {
      try {
        await locator.scrollIntoViewIfNeeded({ timeout: 1500 });
        await sleep(700);
        const text = (await locator.innerText()).trim().replace(/\s+/g, ' ');
        if (text) seen.push(`${keyword}: ${text.slice(0, 160)}`);
      } catch {}
    }
  }

  const safeLabels = ['Program', 'Preview', 'Replay', 'Sponsor', 'Break'];
  for (const label of safeLabels) {
    const buttons = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
    if (await buttons.count()) {
      try {
        await buttons.first().scrollIntoViewIfNeeded();
        await sleep(500);
        await buttons.first().click({ timeout: 1200 });
        await sleep(900);
      } catch {}
    }
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  await sleep(800);
  return seen;
}

async function main() {
  await fs.mkdir(SCREENSHOTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  const results: Array<Record<string, unknown>> = [];

  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  await page.route('**/api/**', async (route) => {
    const method = route.request().method();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  for (const [route, label] of routes) {
    const started = Date.now();
    const response = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await settle(page);
    const status = response?.status() ?? 0;
    const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 5000);
    const notFound = status === 404 || /signal not found|page not found|404/i.test(bodyText);
    let detail: unknown = null;
    if (route === '/demo/create-tournament' && !notFound) detail = await showcaseCreateTournament(page);
    if (route === '/demo/control-room' && !notFound) detail = await deepControlRoom(page);
    const capture = notFound ? null : await captureFullPageJourney(page, route.slice(1).replaceAll('/', '-'));
    results.push({ route, label, status, notFound, durationMs: Date.now() - started, capture, detail });
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  await sleep(700);
  const video = await page.video()?.path().catch(() => null);
  await context.close();
  await browser.close();

  await fs.writeFile(path.join(OUT, 'feature-inventory.json'), JSON.stringify({
    baseUrl: BASE,
    generatedAt: new Date().toISOString(),
    results,
    errors,
    video,
  }, null, 2));

  const failed = results.filter((r) => r.notFound);
  if (failed.length) {
    console.error(`Walkthrough found ${failed.length} broken route(s): ${failed.map((r) => r.route).join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Walkthrough captured ${results.length} routes successfully.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
