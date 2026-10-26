import { chromium } from "playwright";
import fs from "node:fs/promises";
const b = await chromium.launch({
  headless: true,
  executablePath:
    "/Users/acedzn/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  args: ["--use-angle=metal", "--enable-webgl"],
});
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto("http://localhost:4233");
await p.waitForFunction(() => typeof window.render_game_to_text === "function");
await p.waitForTimeout(1800);
const report = await p.evaluate(() => ({
  userAgent: navigator.userAgent,
  viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
  state: JSON.parse(window.render_game_to_text()),
  resources: performance
    .getEntriesByType("resource")
    .map((r) => ({
      name: r.name.split("/").pop(),
      encoded: r.encodedBodySize,
      decoded: r.decodedBodySize,
      transfer: r.transferSize,
      duration: r.duration,
    })),
}));
await fs.writeFile(
  "docs/captures/performance.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    perf: report.state.performance,
    bytes: report.resources.reduce((s, r) => s + r.encoded, 0),
  }),
);
await b.close();
