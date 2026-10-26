/** Independent browser review. All editing/running goes through visible UI input.
 * The only evaluated functions are observable state and the authorized time hook.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const root = "/Users/acedzn/dev/AceDZN-exp/sentence-foundry";
const mobile = process.argv.includes("--mobile");
const prefix = "target";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Users/acedzn/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  timeout: 20000,
  args: ["--use-angle=metal", "--enable-webgl", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
  hasTouch: mobile,
  isMobile: mobile,
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [],
  results = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.setDefaultTimeout(5000);
const state = async () =>
  JSON.parse(await page.evaluate(() => window.render_game_to_text()));
async function button(selector) {
  await page.locator(selector).click({ force: true });
}
async function cell(x, z) {
  const s = await state();
  const p = s.cellScreen.find((c) => c.x === x && c.z === z).screen;
  assert.ok(
    p.x > 0 &&
      p.x < (mobile ? 390 : 1440) &&
      p.y > 0 &&
      p.y < (mobile ? 844 : 900),
    `cell ${x},${z} is on screen: ${JSON.stringify(p)}`,
  );
  if (mobile) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}
async function capture(name) {
  const s = await state();
  const text = await page.locator("body").innerText();
  await fs.writeFile(
    `${root}/docs/captures/${prefix}-${name}.json`,
    JSON.stringify({ state: s, text, errors }, null, 2),
  );
  const data = await page.evaluate(() => {
    window.advanceTime(0);
    return document
      .querySelector("canvas")
      .toDataURL("image/png")
      .split(",")[1];
  });
  await fs.writeFile(
    `${root}/docs/captures/${prefix}-${name}-canvas.png`,
    Buffer.from(data, "base64"),
  );
  try {
    await page.screenshot({
      path: `${root}/docs/captures/${prefix}-${name}.png`,
      timeout: 5000,
    });
  } catch (e) {
    errors.push("full-page capture:" + e.message);
  }
  results.push({
    name,
    mode: s.mode,
    challenge: s.challenge,
    accepted: s.accepted,
    attempts: s.attempts,
    assets: s.assets,
  });
  console.log(prefix + " " + name + " " + s.mode + " " + s.accepted);
  return s;
}
async function advance(ms) {
  await page.evaluate((ms) => window.advanceTime(ms), ms);
}
async function finish() {
  for (let elapsed = 0; elapsed < 90000; elapsed += 2000) {
    await advance(2000);
    const s = await state();
    if (s.mode !== "running") return s;
  }
  return state();
}
async function clear() {
  const s = await state();
  await button("#erase");
  for (const t of s.tiles) await cell(t.x, t.z);
}
function line(points) {
  const cells = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    const dx = Math.sign(b.x - a.x),
      dz = Math.sign(b.z - a.z);
    let c = { ...a };
    while (c.x !== b.x || c.z !== b.z) {
      if (!cells.length || cells.at(-1).x !== c.x || cells.at(-1).z !== c.z)
        cells.push(c);
      c = { x: c.x + dx, z: c.z + dz };
    }
  }
  cells.push(points.at(-1));
  return cells;
}
const dirs = [
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
  { x: 0, z: -1 },
];
async function build(cells, actions, { erase = true } = {}) {
  if (erase) await clear();
  let machine = 0;
  const s = await state(),
    source = s.board.sources.find((c) => c.z === cells[0].z);
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i],
      from = cells[i - 1] ?? source,
      to = cells[i + 1] ?? s.board.exit;
    let rot = dirs.findIndex((d) => d.x === to.x - c.x && d.z === to.z - c.z);
    const corner = c.x - from.x !== to.x - c.x || c.z - from.z !== to.z - c.z;
    if (corner) {
      const incoming = dirs.findIndex(
        (d) => d.x === from.x - c.x && d.z === from.z - c.z,
      );
      if (incoming === (rot + 3) % 4) rot += 4;
    }
    const kind = corner
      ? "corner"
      : i > 2 && machine < actions.length
        ? actions[machine++]
        : "belt";
    await button(`[data-tool="${kind}"]`);
    for (let n = 0; n < rot; n++) {
      if (mobile) await button("#rotate");
      else await page.keyboard.press("r");
    }
    await cell(c.x, c.z);
    const actual = (await state()).tiles.find(
      (t) => t.x === c.x && t.z === c.z,
    );
    assert.equal(actual?.kind, kind, `UI placed ${kind} ${c.x},${c.z}`);
    assert.equal(actual.rotation, rot);
  }
  assert.equal(machine, actions.length);
}
const straight = line([
  { x: 0, z: 3 },
  { x: 8, z: 3 },
]);
const crateRoute = line([
  { x: 0, z: 2 },
  { x: 6, z: 2 },
  { x: 6, z: 3 },
  { x: 8, z: 3 },
]);
const armRoute = line([
  { x: 0, z: 4 },
  { x: 6, z: 4 },
  { x: 6, z: 3 },
  { x: 8, z: 3 },
]);
const sequenceRoute = line([
  { x: 0, z: 3 },
  { x: 1, z: 3 },
  { x: 1, z: 5 },
  { x: 7, z: 5 },
  { x: 7, z: 3 },
  { x: 8, z: 3 },
]);
const transferRoute = line([
  { x: 0, z: 5 },
  { x: 1, z: 5 },
  { x: 1, z: 4 },
  { x: 7, z: 4 },
  { x: 7, z: 1 },
  { x: 8, z: 1 },
]);
try {
  await page.goto("http://localhost:4233", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => typeof window.render_game_to_text === "function",
  );
  await page.waitForFunction(
    () => {
      const s = JSON.parse(window.render_game_to_text());
      return s.assets.washer === "ready" && s.assets.arm === "ready";
    },
    undefined,
    { timeout: 60000 },
  );
  await advance(0);
  await build(straight, ["wash"]);
  await button("#run");
  assert.equal((await finish()).mode, "success");
  await button("#next");
  await build(straight, ["wash", "paint"]);
  await button("#run");
  await advance(4500);
  await button("#pause");
  await capture("01-running-line-overview");
  await page.mouse.move(730, 470);
  await page.mouse.wheel(0, -650);
  await page.waitForTimeout(200);
  await capture("01-running-line");
  await button("#camera");
  await button("#pause");
  assert.equal((await finish()).mode, "success");
  await button("#next");
  await build(armRoute, ["paint"]);
  await button("#run");
  assert.equal((await finish()).mode, "success");
  await button("#next");
  await build(sequenceRoute, ["label", "wash", "paint", "pack"]);
  await button("#run");
  let observed = false;
  for (let i = 0; i < 400; i++) {
    await advance(80);
    const s = await state();
    if (s.pieces.some((p) => p.product.history.some((e) => e.removedLabel))) {
      observed = true;
      break;
    }
  }
  assert.ok(observed);
  await button("#pause");
  await capture("02-label-washed-off-overview");
  await page.mouse.move(730, 470);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(200);
  await capture("02-label-washed-off");
  await fs.writeFile(
    `${root}/docs/captures/target-summary.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log("Two reachable 16:9 target-comparison states captured.");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
