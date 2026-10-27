/** Workbook iframe review. Parent fixture is served by Playwright on the real
 * local origin. Game actions use UI input and advanceTime, never outcome state. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.SF_REVIEW_URL || "http://localhost:4233";
const origin = new URL(base).origin;
const known = path.join(
  homedir(),
  "Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell",
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SF_REVIEW_EXECUTABLE || (existsSync(known) ? known : undefined),
  args: [
    `--use-angle=${process.platform === "darwin" ? "metal" : "swiftshader"}`,
    "--enable-webgl",
    "--disable-dev-shm-usage",
  ],
  timeout: 60000,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
context.setDefaultTimeout(30000);
await context.addInitScript(() => {
  window.__selfHostMessages = [];
  addEventListener("message", (e) => {
    if (e.source === window && e.data?.source === "workbook-game")
      window.__selfHostMessages.push(e.data);
  });
});
const page = await context.newPage(),
  errors = [],
  report = [];
let game = null;
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.route("**/__workbook_test__?level=*", (route) => {
  const level = new URL(route.request().url()).searchParams.get("level");
  if (!/^\d+$/.test(level ?? "")) throw Error("fixture needs a numeric level");
  return route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html><head><title>Workbook iframe test</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;display:block;overflow:hidden}</style></head><body><script>window.workbookEvents=[];addEventListener('message',e=>{const f=document.querySelector('iframe');if(e.origin===location.origin&&e.source===f?.contentWindow&&e.data?.source==='workbook-game')workbookEvents.push({origin:e.origin,message:e.data});});</script><iframe title="Sentence Foundry Workbook fixture" src="/index.html?level=${level}"></iframe></body></html>`,
  });
});
const events = () => page.evaluate(() => window.workbookEvents);
const state = () =>
  game.evaluate(() => JSON.parse(window.render_game_to_text()));
const step = (ms) => game.evaluate((ms) => window.advanceTime(ms), ms);
async function open(level) {
  await page.goto(`${origin}/__workbook_test__?level=${level}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForFunction(
    () => window.workbookEvents.some((e) => e.message.type === "level-start"),
    undefined,
    { timeout: 30000 },
  );
  game = await (await page.locator("iframe").elementHandle()).contentFrame();
  await game.waitForFunction(
    () => typeof window.render_game_to_text === "function",
  );
  return state();
}
function envelope(records) {
  for (const e of records) {
    assert.equal(e.origin, origin);
    assert.equal(e.message.source, "workbook-game");
    assert.equal(e.message.version, 1);
    assert.equal(e.message.slug, "sentence-foundry");
    assert.notEqual(e.message.type, "error");
  }
}
async function click(selector) {
  await game.locator(selector).click({ force: true });
}
async function cell(x, z) {
  const s = await state(),
    point = s.cellScreen.find((c) => c.x === x && c.z === z).screen;
  const frameBox = await page.locator("iframe").boundingBox();
  await page.mouse.click(frameBox.x + point.x, frameBox.y + point.y);
}
async function snapshot(name) {
  await fs.writeFile(
    path.join(repo, "docs/review", `workbook-${name}.json`),
    JSON.stringify({ state: await state(), events: await events() }, null, 2),
  );
  await page.screenshot({
    path: path.join(repo, "docs/review", `workbook-${name}.png`),
    timeout: 10000,
  });
}
async function shipment() {
  for (const [x, z, tool] of [
    [2, 3, "belt"],
    [4, 3, "belt"],
    [5, 3, "wash"],
  ]) {
    await click(`[data-tool="${tool}"]`);
    await cell(x, z);
  }
  await click("#run");
  for (let n = 0; n < 20 && (await state()).mode === "running"; n++)
    await step(1000);
  assert.equal((await state()).mode, "success");
}
try {
  for (let level = 1; level <= 45; level++) {
    const s = await open(level),
      records = await events();
    assert.equal(s.challenge, level);
    assert.equal(s.mode, "editing");
    assert.equal(s.campaign.total, 45);
    assert.equal(s.campaign.finaleVisible, false);
    assert.equal(s.workbook.ready, true);
    assert.deepEqual(s.assets, { washer: "ready", arm: "ready" });
    assert.deepEqual(s.industryAssets, { pump: "ready", spotlight: "ready" });
    envelope(records);
    assert.deepEqual(
      records.map((e) => e.message.type),
      ["ready", "level-start"],
    );
    assert.equal(records[1].message.level, level);
    report.push({
      level,
      challenge: s.challenge,
      layout: s.campaign.layout,
      mode: s.mode,
      requestedLevel: s.workbook.requestedLevel,
      events: records.map((e) => e.message.type),
    });
    if ([1, 26, 45].includes(level)) await snapshot(`deep-link-${level}`);
    console.log(`iframe level ${level}/45 ready/start correct`);
  }
  await open(1);
  await shipment();
  await page.waitForFunction(() =>
    window.workbookEvents.some((e) => e.message.type === "level-complete"),
  );
  let records = await events();
  envelope(records);
  assert.deepEqual(
    records.map((e) => e.message.type),
    ["ready", "level-start", "level-complete"],
  );
  const complete = records[2].message;
  assert.equal(complete.level, 1);
  assert.ok(Number.isInteger(complete.durationMs) && complete.durationMs > 0);
  assert.equal("stars" in complete, false);
  assert.equal("score" in complete, false);
  await step(2000);
  assert.equal((await events()).length, 3);
  await snapshot("actual-complete");
  await click("#restart");
  await page.waitForFunction(
    () =>
      window.workbookEvents.filter((e) => e.message.type === "level-start")
        .length === 2,
  );
  assert.equal((await state()).mode, "editing");
  records = await events();
  assert.deepEqual(
    records.map((e) => e.message.type),
    ["ready", "level-start", "level-complete", "level-start"],
  );
  assert.equal(records[3].message.level, 1);
  assert.equal(records.filter((e) => e.message.type === "ready").length, 1);
  await shipment();
  await page.waitForFunction(
    () =>
      window.workbookEvents.filter((e) => e.message.type === "level-complete")
        .length === 2,
  );
  await click("#next");
  await page.waitForFunction(() =>
    window.workbookEvents.some(
      (e) => e.message.type === "level-start" && e.message.level === 2,
    ),
  );
  records = await events();
  envelope(records);
  assert.deepEqual(
    records.map((e) => e.message.type),
    [
      "ready",
      "level-start",
      "level-complete",
      "level-start",
      "level-complete",
      "level-start",
    ],
  );
  assert.equal((await state()).challenge, 2);
  assert.equal(records.at(-1).message.level, 2);
  await snapshot("restart-next-ordering");
  report.push({
    scenario: "actual shipments, Restart and Next",
    events: records,
  });
  // Actual save now points at level2; a fresh iframe level1 must override it.
  const overridden = await open(1);
  assert.equal(overridden.challenge, 1);
  assert.equal(overridden.mode, "editing");
  assert.equal(overridden.campaign.finaleVisible, false);
  assert.deepEqual(
    (await events()).map((e) => e.message.type),
    ["ready", "level-start"],
  );
  report.push({
    scenario: "explicit level1 overrides actual saved level2",
    passed: true,
  });
  // Standalone still selects its explicit level but sends no messages to itself.
  await page.goto(`${origin}/index.html?level=45`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForFunction(
    () =>
      typeof window.render_game_to_text === "function" &&
      JSON.parse(window.render_game_to_text()).workbook.ready,
  );
  const standalone = await page.evaluate(() =>
    JSON.parse(window.render_game_to_text()),
  );
  assert.equal(standalone.challenge, 45);
  assert.equal(standalone.campaign.finaleVisible, false);
  assert.deepEqual(await page.evaluate(() => window.__selfHostMessages), []);
  report.push({
    scenario: "standalone explicit45 sends no host messages",
    passed: true,
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(repo, "docs/review/workbook-summary.json"),
    JSON.stringify({ report, errors }, null, 2),
  );
} catch (e) {
  const observed = game ? await state().catch(() => null) : null;
  const received = await events().catch(() => null);
  await fs.writeFile(
    path.join(repo, "docs/review/workbook-failure.json"),
    JSON.stringify(
      { error: String(e.stack), observed, events: received, report, errors },
      null,
      2,
    ),
  );
  await page
    .screenshot({
      path: path.join(repo, "docs/review/workbook-FAILED.png"),
      timeout: 5000,
    })
    .catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
