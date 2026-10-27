/** Full production-built Workbook shell → R2 rewrite → actual game → bridge. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.SF_WORKBOOK_URL || "http://localhost:4217";
const capturePrefix = base.startsWith("https://") ? "workbook-production" : "workbook-app";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Users/acedzn/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  args: ["--use-angle=metal"],
});
const errors = [],
  failed = [],
  results = [];
let page;
async function newPage(mobile = false) {
  const c = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  const p = await c.newPage();
  page = p;
  p.setDefaultTimeout(15000);
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("response", (r) => {
    if (
      r.status() >= 400 &&
      (r.url().startsWith(base) ||
        r.url().startsWith("https://assets.acedzn.xyz/games/sentence-foundry/"))
    )
      failed.push({ url: r.url(), status: r.status() });
  });
  await p.addInitScript(() => {
    if (window === window.top) {
      window.__foundryEvents = [];
      addEventListener("message", (e) => {
        if (
          e.data?.source === "workbook-game" &&
          e.data.slug === "sentence-foundry"
        )
          window.__foundryEvents.push(e.data);
      });
    }
  });
  return { c, p };
}
async function essentialOnly(p) {
  const choice = p.getByRole("button", { name: /חיוניות בלבד/ }).first();
  try {
    await choice.waitFor({ state: "visible", timeout: 3000 });
    await choice.click();
  } catch (e) {
    if (!String(e).includes("Timeout")) throw e;
  }
}
async function ready(p, n) {
  await p.waitForFunction(
    (n) =>
      window.__foundryEvents?.some(
        (e) => e.type === "level-start" && e.level === n,
      ),
    n,
    { timeout: 45000 },
  );
  const iframe = p.locator("iframe");
  const frame = await (await iframe.elementHandle()).contentFrame();
  await frame.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).workbook.ready,
  );
  const s = JSON.parse(
    await frame.evaluate(() => window.render_game_to_text()),
  );
  assert.equal(s.challenge, n);
  assert.deepEqual(s.assets, { washer: "ready", arm: "ready" });
  assert.deepEqual(s.industryAssets, { pump: "ready", spotlight: "ready" });
  assert.equal(s.campaign.total, 45);
  assert.equal(
    await iframe.getAttribute("src"),
    `/play/sentence-foundry/2026-10-27/index.html?level=${n}`,
  );
  assert.equal(await p.getByText("המשחק לא נטען", { exact: true }).count(), 0);
  return { frame, s };
}
async function state(f) {
  return JSON.parse(await f.evaluate(() => window.render_game_to_text()));
}
async function cell(p, f, x, z, mobile = false) {
  const s = await state(f),
    point = s.cellScreen.find((c) => c.x === x && c.z === z).screen,
    box = await p.locator("iframe").boundingBox();
  if (mobile) await p.touchscreen.tap(box.x + point.x, box.y + point.y);
  else await p.mouse.click(box.x + point.x, box.y + point.y);
}
async function capture(p, name) {
  await p.screenshot({ path: `docs/review/${capturePrefix}-${name}.png` });
}
try {
  const { c, p } = await newPage();
  await p.goto(base, { waitUntil: "domcontentloaded" });
  await essentialOnly(p);
  await p.locator('a[href="/sentence-foundry"]').first().click();
  await p.waitForURL("**/sentence-foundry");
  assert.match(await p.locator("h1").innerText(), /מפעל ההמצאות/);
  assert.equal(await p.locator('[id^="level-"]').count(), 45);
  for (const lesson of [
    "who-does-it-and-what-is-done",
    "following-a-production-process",
  ])
    assert.ok(
      (await p
        .locator(
          `a[href="https://english.workbook.co.il/grade-8/chapter-7/${lesson}"]`,
        )
        .count()) > 0,
    );
  await capture(p, "detail");
  await p.locator('a[href="/sentence-foundry/play?level=45"]').first().click();
  const late = await ready(p, 45);
  await capture(p, "level45");
  results.push({
    name: "home-detail-late-link",
    challenge: late.s.challenge,
    events: await p.evaluate(() => window.__foundryEvents),
  });
  await p.goto(base + "/sentence-foundry", { waitUntil: "domcontentloaded" });
  await p.locator('a[href="/sentence-foundry/play?level=1"]').first().click();
  const { frame } = await ready(p, 1);
  for (const [x, z, kind] of [
    [2, 3, "belt"],
    [4, 3, "belt"],
    [5, 3, "wash"],
  ]) {
    await frame.locator(`[data-tool="${kind}"]`).click();
    await cell(p, frame, x, z);
  }
  await frame.locator("#run").click();
  await frame.evaluate(() => window.advanceTime(9000));
  assert.equal((await state(frame)).mode, "success");
  await p.waitForFunction(() =>
    window.__foundryEvents.some(
      (e) => e.type === "level-complete" && e.level === 1,
    ),
  );
  await capture(p, "actual-completion");
  await frame.locator("#next").click();
  await p.waitForFunction(() =>
    window.__foundryEvents.some(
      (e) => e.type === "level-start" && e.level === 2,
    ),
  );
  const events = await p.evaluate(() => window.__foundryEvents);
  assert.deepEqual(
    events.map((e) => e.type + ("level" in e ? ":" + e.level : "")),
    ["ready", "level-start:1", "level-complete:1", "level-start:2"],
  );
  results.push({ name: "actual-first-shipment-next", accepted: 1, events });
  await c.close();
  const { c: mc, p: mp } = await newPage(true);
  await mp.goto(base + "/sentence-foundry/play?level=26", {
    waitUntil: "domcontentloaded",
  });
  await essentialOnly(mp);
  const { frame: mf } = await ready(mp, 26);
  assert.equal(
    await mp.getByText("סובבו את הטלפון לרוחב", { exact: true }).count(),
    0,
  );
  assert.equal(await mf.locator("#palette button").count(), 8);
  await capture(mp, "mobile26");
  await mf.locator("#contract-toggle").tap();
  await mf.locator('[data-tool="belt"]').tap();
  await cell(mp, mf, 0, 1, true);
  assert.ok(
    (await state(mf)).tiles.some(
      (t) => t.x === 0 && t.z === 1 && t.kind === "belt",
    ),
  );
  await mf.locator("#move").tap();
  if (!(await state(mf)).controls.moveFrom) await cell(mp, mf, 0, 1, true);
  await cell(mp, mf, 1, 1, true);
  assert.ok((await state(mf)).tiles.some((t) => t.x === 1 && t.z === 1));
  await mf.locator("#undo").tap();
  assert.ok((await state(mf)).tiles.some((t) => t.x === 0 && t.z === 1));
  results.push({
    name: "portrait-touch-edit",
    challenge: 26,
    tools: 8,
    assets: (await state(mf)).assets,
  });
  await mc.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  await fs.writeFile(
    `docs/review/${capturePrefix}-summary.json`,
    JSON.stringify({ base, results, errors, failed }, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      base,
      checks: results.map((r) => r.name),
      errors,
      failed,
    }),
  );
} catch (e) {
  console.error(e);
  if (page && !page.isClosed()) {
    await capture(page, "FAILED").catch(() => {});
    console.error((await page.locator("body").innerText()).slice(-3000));
  }
  process.exitCode = 1;
} finally {
  await browser.close();
}
