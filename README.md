# Sentence Foundry · מפעל ההמצאות

A browser-playable 3D factory construction puzzle for Hebrew-speaking grade-8 English learners. Build and rotate conveyors and machines, run real moving workpieces, observe the result, halt and repair. English determines who acts, which object receives paint, and the sequence that changes the finished product.

## Run

Node 22.12+ (Node 24 tested), npm.

```sh
npm ci
npm run dev      # http://localhost:5233, strict port
npm test
npm run build
npm run preview  # http://localhost:4233, strict port
```

Static Vercel-ready Vite output: build `npm run build`, output `dist`, relative base. No backend, API key, student account, analytics or production deployment. Fonts and models are local runtime resources. Optional English speech uses an installed local browser voice; visible English text always remains.

## Play

Choose a tool and click/tap a grid cell. Move selects a part then its destination; Rotate/R turns the selected part or next placement. Straight machines accept from the side opposite their output arrow. Corners have eight directed elbow states, including mirrored bends. Connect a source to DISPATCH. Only the specified receivers may be delivered; feeding both sources cannot bypass reading. Stop returns to editing and safely resets travelling pieces. Reading, translation and planning have no time penalty.

- 1–6: palette tools; WASD/arrows: grid focus; Enter: build.
- R: rotate; Space: run/stop; P/Escape: pause; F: fullscreen.
- Right drag / touch drag: orbit; wheel / pinch: zoom; View resets camera.
- Help, vocabulary, hint, mute, reduced motion and restart are visible. Focus loss pauses a running line.

Five authored contracts: one washed shipment; equivalent active/passive orders; crate versus detached service-arm receiver; wash/paint/label/pack with destructive mistakes; transfer to display panels with labels outside the package. Multiple factory layouts work. Efficiency (production time/footprint) is separate from first decisions and reading support.

## Implemented slice

Five complete construction challenges, a stateful production simulation, Hebrew/LTR interface, real travelling workpieces, mechanical motion, pause/restart/mute/reduced motion/fullscreen, pointer/keyboard/touch controls, and independent semantic/solvability tests. Both genuine local Tripo GLBs are visible as the washer and fixed painter; the same arm geometry is a detachable gray workpiece that turns blue. Their combined size is 2,043,548 bytes. The machines use rigid mechanical motion; no skeleton or animation clips are claimed.

Two built-in imagegen targets were generated and inspected before rendered gameplay source. Exact prompts are in `docs/visual-targets/PROMPTS.md`; actual captures and a side-by-side viewer are in `docs/captures/`. Final independent review completed all five contracts, wrong/recoverable outcomes, transfer, mobile touch play and strict controls with both models ready and no browser errors. `npm test` passes31 tests. No production deployment was performed.

The initial locked-Mac export interruption is resolved. `ASSETS.md` records the normal Chrome acquisition method, source tasks, costs, files, byte counts and SHA256. `PLAYTEST.md` and `VISUAL_REVIEW.md` record verification and practical limitations, including the headless environment's inability to produce a native focus transition. Focus-loss listeners are implemented; explicit pause and reading freeze are verified. Human pupil playtesting is still needed to establish fun or learning gains.

Authored fixtures derive from Workbook comprehension scope. The game practices understanding role/receiver/process meaning; it does not assess grammar production or claim validated learning outcomes.

## Music and industrial setting

**Brass & Belts** is an original68.571-second,32bar workshop score with plucked melody, warm keys, bass and light mechanical percussion. Eleven separate cues cover building, processing and delivery. Click once to enable audio; the **♫** mixer separates music and machine effects with independent volume controls. **♪** mutes everything. Reading and game pause suspend the loop at its current position; English speech ducks the music. Restarts and new orders retain one music source. Preferences stay local.

The industrial gallery was searched first. Two existing owned Tripo props—the pressure pump and spotlight—were acquired through normal UI exports and reused around the workbench, with authored steel wall panels, windows and pipework. No new model generation or credits were used in this pass. See `MUSIC.md`, `docs/review/AUDIO_REVIEW.md` and `docs/art/industry-search.md` for source, measurements and verification.

## Test hooks

`window.render_game_to_text()` returns current observable contract, grid, sources, direction states, travelling product histories, deliveries, support/attempt records, asset status and frame metrics. Coordinates: x east, z south, y up. `window.advanceTime(ms)` deterministically advances the same simulation, respecting pause. Tests do not inject wins. Local events contain no student identity and remain in the current browser.
