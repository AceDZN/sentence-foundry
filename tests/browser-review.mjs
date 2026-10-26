/** Independent browser review. All editing/running goes through visible UI input.
 * The only evaluated functions are observable state and the authorized time hook.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const installedMacShell = path.join(
  homedir(),
  "Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell",
);
const executablePath =
  process.env.SF_REVIEW_EXECUTABLE ||
  (existsSync(installedMacShell) ? installedMacShell : undefined);
const mobile = process.argv.includes("--mobile");
const inspectModels = process.argv.includes("--inspect-models");
const settingsOnly = process.argv.includes("--settings-only");
const flowOnly = process.argv.includes("--flow-only") || inspectModels;
const requireModels = process.argv.includes("--require-models") || inspectModels;
const prefix = mobile
  ? "mobile"
  : inspectModels
    ? "desktop-model-inspection"
  : settingsOnly
    ? "desktop-settings"
    : "desktop";
const browser = await chromium.launch({
  headless: true,
  executablePath,
  timeout: 20000,
  args: [
    `--use-angle=${process.platform === "darwin" ? "metal" : "swiftshader"}`,
    "--enable-webgl",
    "--disable-dev-shm-usage",
  ],
});
const context = await browser.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
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
  if (requireModels) {
    assert.deepEqual(s.assets, { washer: "ready", arm: "ready" }, "both acquired Tripo models loaded");
    for (const id of ["washer", "arm"]) {
      assert.ok(s.assetInfo?.[id]?.meshes > 0, `${id} contains actual GLB meshes`);
      assert.ok(s.assetInfo?.[id]?.triangles > 0, `${id} contains actual GLB geometry`);
    }
  }
  const text = await page.locator("body").innerText();
  await fs.writeFile(
    `${root}/docs/review/${prefix}-${name}.json`,
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
    `${root}/docs/review/${prefix}-${name}-canvas.png`,
    Buffer.from(data, "base64"),
  );
  try {
    await page.screenshot({
      path: `${root}/docs/review/${prefix}-${name}.png`,
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
    assetInfo: s.assetInfo,
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

async function focusLossTest() {
  const beforeFocus = await page.evaluate(() => ({
    hidden: document.hidden,
    focus: document.hasFocus(),
  }));
  const other = await context.newPage();
  await other.bringToFront();
  await page.waitForTimeout(100);
  const afterFocus = await page.evaluate(() => ({
    hidden: document.hidden,
    focus: document.hasFocus(),
  }));
  const focusLost = await state();
  const transitioned =
    (!beforeFocus.hidden && afterFocus.hidden) ||
    (beforeFocus.focus && !afterFocus.focus);
  if (transitioned) {
    assert.equal(focusLost.mode, "paused", "actual tab focus loss pauses");
    const pausedTime = focusLost.productionSeconds;
    await advance(3000);
    assert.equal((await state()).productionSeconds, pausedTime);
  }
  await other.close();
  await page.bringToFront();
  if ((await state()).mode === "paused") await button("#pause");
  results.push({
    name: "focus-loss-pause",
    exercised: transitioned,
    beforeFocus,
    afterFocus,
  });
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
      : i > 0 && machine < actions.length
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
  { x: 1, z: 1 },
  { x: 7, z: 1 },
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
  await page.goto(process.env.SF_REVIEW_URL || "http://localhost:4233", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await page.waitForFunction(
    () => typeof window.render_game_to_text === "function",
  );
  if (requireModels) {
    await page.waitForFunction(() => {
      const s = JSON.parse(window.render_game_to_text());
      return s.assets?.washer === "ready" && s.assets?.arm === "ready";
    }, undefined, { timeout: 20000 });
  }
  await advance(0);
  await capture("initial");
  if (mobile) {
    await button("#help");
    assert.equal((await state()).mode, "paused");
    await button("#close-dialog");
    await button("#motion");
    assert.equal((await state()).reduced, true);
    await button("#mute");
    assert.equal((await state()).muted, true);
    // Full construction and success using touch taps and on-screen rotation.
    await build(straight, ["wash"]);
    await button("#run");
    assert.equal((await finish()).mode, "success");
    await capture("touch-success");
    await button("#try-again");
    await button("#restart");
    assert.equal((await state()).attempts, 0);
    assert.equal((await state()).tiles.length, 8);
    await capture("restart");
  } else {
    if (!flowOnly) {
      // Exercise camera and keyboard-accessible help before changing the factory.
      const originalProjection = (await state()).cellScreen.find(
        (c) => c.x === 0 && c.z === 0,
      ).screen;
      await page.mouse.move(720, 446);
      await page.mouse.down({ button: "right" });
      await page.mouse.move(820, 480, { steps: 8 });
      await page.mouse.up({ button: "right" });
      await page.waitForTimeout(200);
      const rotatedProjection = (await state()).cellScreen.find(
        (c) => c.x === 0 && c.z === 0,
      ).screen;
      assert.ok(
        Math.abs(rotatedProjection.x - originalProjection.x) > 5 ||
          Math.abs(rotatedProjection.y - originalProjection.y) > 5,
        "right-drag rotates actual camera",
      );
      await capture("camera-rotated");
      await button("#camera");
      await page.waitForTimeout(250);
      await page.locator("#help").focus();
      await page.keyboard.press("Enter");
      assert.equal(
        await page.locator("#dialog").evaluate((d) => d.open),
        true,
        "Enter activates focused help",
      );
      await button("#close-dialog");
      await button("#fullscreen");
      await page.waitForFunction(
        () => Boolean(document.fullscreenElement),
        {},
        { timeout: 3000 },
      );
      await page.keyboard.press("Escape");
      let escaped = true;
      try {
        await page.waitForFunction(
          () => !document.fullscreenElement,
          {},
          { timeout: 3000 },
        );
      } catch {
        escaped = false;
      }
      if (!escaped) {
        assert.ok(
          process.argv.includes("--allow-headless-escape-fallback"),
          "Escape must exit fullscreen",
        );
        await button("#fullscreen");
        await page.waitForFunction(
          () => !document.fullscreenElement,
          {},
          { timeout: 3000 },
        );
      }
      if ((await state()).mode === "paused") await button("#pause");
      results.push({
        name: "fullscreen-and-focused-help",
        passed: true,
        escapeExited: escaped,
      });
      if (settingsOnly) {
        await button("#run");
        await advance(1000);
        await focusLossTest();
        await button("#run");
        await button("#restart");
        // Keyboard building via event.code after actual table focus.
        await cell(4, 5);
        await page.keyboard.press("3");
        await page.keyboard.press("ArrowUp");
        await page.keyboard.press("Enter");
        assert.equal(
          (await state()).tiles.find((t) => t.x === 4 && t.z === 2)?.kind,
          "wash",
          "keyboard digit/arrows/Enter builds machine",
        );
        await button("#restart");
        results.push({ name: "keyboard-build", passed: true });
        await button('[data-tool="belt"]');
        await cell(4, 5);
        await page.keyboard.press("Space");
        assert.equal(
          (await state()).mode,
          "running",
          "Space runs after palette selection and actual placement",
        );
        await page.keyboard.press("Space");
        assert.equal(
          (await state()).mode,
          "editing",
          "Space stops back to editing",
        );
        await button("#restart");
        results.push({ name: "space-after-palette-placement", passed: true });
        await capture("settings-complete");
      }
    }
    if (!settingsOnly) {
      // First intended actions: physically move and rotate both loose belts.
      await button("#move");
      await cell(2, 2);
      await page.keyboard.press("r");
      await page.keyboard.press("r");
      await cell(2, 3);
      await cell(4, 4);
      for (let n = 0; n < 3; n++) await page.keyboard.press("r");
      await cell(4, 3);
      await button("#run");
      await advance(1000);
      if (!flowOnly) await focusLossTest();
      await advance(14000);
      assert.equal((await state()).jam, "gap");
      await capture("recoverable-gap");
      await button("#run");
      await button('[data-tool="wash"]');
      await cell(5, 3);
      await button("#run");
      await advance(1000);
      await button("#read");
      const before = await state();
      await advance(5000);
      const after = await state();
      assert.equal(after.mode, "paused");
      assert.equal(after.productionSeconds, before.productionSeconds);
      assert.deepEqual(after.pieces, before.pieces);
      await button("#close-dialog");
      await button("#hint");
      assert.equal((await state()).hints, 1);
      await button("#close-dialog");
      assert.equal((await finish()).mode, "success");
      await capture("challenge1-success");
      await button("#next");
      assert.equal((await state()).challenge, 2);
      await build(straight, ["wash", "paint"]);
      const tiles = (await state()).tiles;
      await button("#paraphrase");
      assert.match((await state()).contract, /cleaning arm washes the crates/);
      assert.deepEqual((await state()).tiles, tiles);
      await button("#run");
      if (requireModels) {
        await advance(1500);
        await button("#pause");
        await capture("challenge2-GLB-washer-processing");
        await button("#pause");
        await advance(800);
        await capture("challenge2-GLB-machines-running");
      }
      assert.equal((await finish()).mode, "success");
      await capture("challenge2-active-success");
      await button("#try-again");
      await button("#paraphrase");
      assert.match((await state()).contract, /crates are washed/);
      await button("#run");
      assert.equal((await finish()).mode, "success");
      await capture("challenge2-passive-success");
      if (!inspectModels) {
      await button("#next");
      await build(crateRoute, ["paint"]);
      await button("#run");
      let s = await finish();
      assert.equal(s.mode, "review");
      assert.equal(s.accepted, 0);
      assert.equal(s.deliveries[0].product.painted, true);
      assert.ok(s.deliveries[0].reasons.includes("receiver:service-arm"));
      await capture("challenge3-wrong-receiver");
      await button("#receiver");
      await button("#run");
      assert.equal((await finish()).mode, "success");
      await capture("challenge3-active-crate-success");
      await button("#try-again");
      await button("#receiver");
      await build(armRoute, ["paint"]);
      await button("#run");
      if (requireModels) {
        await advance(400);
        assert.ok((await state()).pieces.some(p => p.product.receiver === "service-arm" && !p.product.painted), "primer arm enters before painting");
        await button("#pause");
        await capture("challenge3-travelling-primer-arm");
        await button("#pause");
        await advance(1900);
        assert.ok((await state()).pieces.some(p => p.product.receiver === "service-arm" && p.product.painted), "detached arm travels after receiving paint");
        await button("#pause");
        await capture("challenge3-travelling-painted-arm");
        await button("#pause");
      }
      assert.equal((await finish()).mode, "success");
      await capture("challenge3-passive-arm-success");
      await button("#next");
      await build(sequenceRoute, ["label", "wash", "paint", "pack"]);
      await button("#run");
      s = await finish();
      assert.equal(s.mode, "review");
      assert.ok(
        s.deliveries.some((d) => d.product.history.some((e) => e.removedLabel)),
      );
      assert.match(
        await page.locator("#status-text").innerText(),
        /נשטפה/,
        "washed-off-label feedback identifies removal",
      );
      await capture("challenge4-washed-label");
      await button("#run");
      await button("#run"); // review run starts; second stops for edit
      await build(sequenceRoute, ["wash", "paint", "label", "pack"]);
      await button("#run");
      assert.equal((await finish()).mode, "success");
      await capture("challenge4-success");
      await button("#next");
      await build(transferRoute, ["wash", "label", "pack"]);
      await button("#run");
      s = await finish();
      assert.equal(s.mode, "review");
      assert.ok(
        s.deliveries.every((d) => d.reasons.includes("final:labelSurface")),
      );
      assert.match(
        await page.locator("#status-text").innerText(),
        /בתוך האריזה/,
        "inside-label feedback identifies package placement",
      );
      await capture("challenge5-inside-label");
      await button("#run");
      await button("#run");
      await build(transferRoute, ["wash", "pack", "label"]);
      await button("#run");
      assert.equal((await finish()).mode, "success");
      await capture("challenge5-transfer-success");
      }
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    `${root}/docs/review/${prefix}-summary.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
} catch (e) {
  await capture("FAILED").catch(() => {});
  await fs.writeFile(
    `${root}/docs/review/${prefix}-failure.txt`,
    String(e.stack),
  );
  console.error(e);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
