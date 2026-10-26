# Independent English and gameplay review

26 October 2026. Reviewer used isolated Playwright, without controlling the user's Chrome or injecting products, outcomes or simulation state. Factory construction used UI input; only observable `render_game_to_text()` and deterministic `advanceTime(ms)` were evaluated.

## Verified

- 17 independent semantic fixtures pass: active/passive invariance, named/omitted agents, receiver contrasts, pronoun reference, agreement/participles, destructive operation order, sealed contents, repair and transfer.
- 10 independent simulation fixtures pass: two distinct constructed solutions for each challenge, gap/stop/edit/retry, pause, wrong receiver, queue recovery and no co-occupied cells.
- Full desktop UI playthrough on static preview 4233 passed again with both acquired GLBs loaded and zero page/console errors. It moved/rotated both loose belts, repaired a gap, froze production during dictionary reading, used help, and completed all five shipments.
- Both active/passive versions accepted the same constructed line. A painted crate was rejected for the service-arm order, accepted for the changed crate order, and followed by a correct painted-arm route.
- Label→wash→paint→pack visibly produced rejected products; repair accepted three crates. Transfer wash→label→pack put labels inside packages and failed; wash→pack→label accepted three panels and reached actual all-five completion.
- Final exact Hebrew feedback assertions passed: missing-label feedback contains “נשטפה”; inside-package feedback contains “בתוך האריזה”. Updated screenshots were opened and inspected.
- Mobile 390×844 passed a full touch-tap build/run/success, help pause, mute, reduced motion and restart. All 63 grid centers fit on screen: x39–347, y268–476. No page/console errors.
- Strict settings review passed: actual right-drag camera/reset, focused Help+Enter, fullscreen entry and Escape exit, digit/arrows/Enter construction, and Space run/stop after palette selection plus actual grid placement. `desktop-settings-summary.json` records these separately.

Final GLB evidence is in `desktop-summary.json`, `mobile-summary.json`, `desktop-settings-summary.json`, and the named screenshot/state pairs. Every final capture asserts both assets ready and nonzero mesh/triangle metadata. Selected earlier placeholder evidence is separately archived in `before-tripo/`. `desktop-challenge5-transfer-success.png` shows actual completion. No timing or frame samples establish student hardware performance, fun, or learning gains.

## Findings resolved during review

Lead fixed corners acting as two-input mergers, success ignoring wrong/pending receivers, clipped mobile construction cells, inside-label text rendering externally, missing-label feedback priority, persistent reading-support tracking and focused-button Enter handling. Regressions cover consequential receiver and process decisions.

## Environment and open requirements

The project's expected headless shell 1248 was absent. Installed shell 1234 with `--use-angle=metal` produced real full UI screenshots; SwiftShader full-page capture timed out. A dev hot reload interrupted one earlier run; full verification uses static preview. Archived `dev-hmr-reset*` files are environment evidence, not a current gameplay failure.

Lead added explicit fullscreen Escape handling; the strict final test confirmed actual fullscreen exit. Native focus loss remains unexercised: activating another headless tab left both before/after `document.hidden=false` and `document.hasFocus()=true`, so there was no focus/visibility transition to test. Explicit pause and dictionary freeze passed. Synthetic focus events are not counted as native focus-loss verification.

The earlier locked-Mac acquisition boundary was resolved. Both original Tripo GLBs now load locally: washer 980,760 bytes / 18,144 triangles and service arm 1,062,788 bytes / 18,108 triangles. Each reports one mesh and zero animation clips; these are rigid mechanical props, with no skeletal rig claimed. Both identity models are visible in the constructed workshop, not hidden imports.

The reviewer opened the paused washer-processing capture and the detached-arm before/after captures. The crate remains visible under the washer/nozzle. The service-arm workpiece is gray primer before painting, visibly blue afterwards, and moves along the belt while the fixed painter retains its original cobalt PBR appearance on its platform. No product occlusion or GLB tint crash was observed. Mobile gameplay was rerun with the washer visible. Final target-comparison judgment remains in the lead's visual review.

## Reproduce

Run `node tests/browser-review.mjs --flow-only --require-models`, `node tests/browser-review.mjs --mobile --require-models`, and `node tests/browser-review.mjs --settings-only --require-models` against stable preview 4233. `SF_REVIEW_URL` and `SF_REVIEW_EXECUTABLE` can override the URL and browser executable. `--inspect-models` runs only the first two challenges for alignment inspection.
