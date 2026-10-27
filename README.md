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

- 1–8: palette tools; WASD/arrows: grid focus; Enter: build.
- R: rotate; M: move; X: toggle removal mode; Delete/Backspace: remove the selected part.
- V: reset the view; Ctrl/⌘ Z: undo; Esc: cancel the editing selection/mode without changing built parts.
- Space: run/stop; P: pause/resume; Shift R: reset the current order; F: fullscreen.
- H: controls guide; L: chapter book; I: hint; T: vocabulary; Y: English reading.
- U: master mute; B: audio mixer; N: reduced motion; C: fold the order. O changes equivalent wording and Shift O changes receiver orders when those options are available.
- Esc closes the audio mixer/dialog, exits fullscreen, or pauses a running line according to the visible context. Native browser and form-input shortcuts remain available.
- Right drag / touch drag: orbit; wheel / pinch: zoom; View resets camera.
- Help, vocabulary, hint, mute, reduced motion and restart are visible. Focus loss pauses a running line.

45 authored contracts across nine chapters: foundations, precise orders, drying, reference and sequence, compact construction, unpacking, repairs, inspection, and the exhibition shipment. The original five remain at the beginning. The dryer dries bare material or cures a painted surface; repainting or washing cancels a previous dry state. The unpacker opens a package, discards its outside label and retains any inside identity label. Later jobs involve actual repeated processing and partial orders that permit different valid sequences, with up to eight stages. Nine board layouts change ports and obstacles; selected compact jobs impose an 11-piece construction limit.

**☷ הזמנות** opens the chapter book; every order is selectable, including order 6 if you already finished the original five. Completed orders and the current build are saved automatically in this browser. Finishing all 45 displays a persistent exhibition finale; it never wraps silently to order 1. Replaying completed orders retains completion. Clearing browser storage removes this local progress. Efficiency (production time/footprint) is separate from first decisions and reading support.

Click an existing part to select it. The visible action strip describes rotation, moving and removal for that selection. Move is two clicks: the part, then an empty destination; occupied destinations are protected. Undo keeps the last 30 edits in the current order. A dismissible first-shipment guide introduces placing, rotating and moving. **?** reopens the full controls guide. The contract can be folded while building and reopened at any time.

## Implemented campaign

45 complete construction challenges, six machine operations, local campaign progress and a proper finale, a stateful production simulation, Hebrew/LTR interface, real travelling workpieces, mechanical motion, pause/restart/mute/reduced motion/fullscreen, pointer/keyboard/touch controls, and independent semantic/solvability tests. Both genuine local Tripo GLBs are visible as the washer and fixed painter; the same arm geometry is a detachable gray workpiece that turns blue. Their combined size is 2,043,548 bytes. The machines use rigid mechanical motion; no skeleton or animation clips are claimed.

Two built-in imagegen targets were generated and inspected before rendered gameplay source. Exact prompts are in `docs/visual-targets/PROMPTS.md`; actual captures and a side-by-side viewer are in `docs/captures/`. Final independent review completed all five contracts, wrong/recoverable outcomes, transfer, mobile touch play and strict controls with both models ready and no browser errors. All 54 pure tests pass, including the original checks and campaign, save and machinery checks. No production deployment was performed.

The initial locked-Mac export interruption is resolved. `ASSETS.md` records the normal Chrome acquisition method, source tasks, costs, files, byte counts and SHA256. `PLAYTEST.md` and `VISUAL_REVIEW.md` record verification and practical limitations, including the headless environment's inability to produce a native focus transition. Focus-loss listeners are implemented; explicit pause and reading freeze are verified. Human pupil playtesting is still needed to establish fun or learning gains.

Authored fixtures derive from Workbook comprehension scope. The game practices understanding role/receiver/process meaning; it does not assess grammar production or claim validated learning outcomes.

## Music and industrial setting

**Brass & Belts** is an original68.571-second,32bar workshop score with plucked melody, warm keys, bass and light mechanical percussion. Thirteen separate cues cover building, processing and delivery. Click once to enable audio; the **♫** mixer separates music and machine effects with independent volume controls. **♪** mutes everything. Reading and game pause suspend the loop at its current position; English speech ducks the music. Restarts and new orders retain one music source. Preferences stay local.

The industrial gallery was searched first. Two existing owned Tripo props—the pressure pump and spotlight—were acquired through normal UI exports and reused around the workbench, with authored steel wall panels, windows and pipework. No new model generation or credits were used in this pass. See `MUSIC.md`, `docs/review/AUDIO_REVIEW.md` and `docs/art/industry-search.md` for source, measurements and verification.

## Test hooks

`window.render_game_to_text()` returns current observable contract, grid, sources, direction states, travelling product histories, deliveries, support/attempt records, asset status and frame metrics. Coordinates: x east, z south, y up. `window.advanceTime(ms)` deterministically advances the same simulation, respecting pause. Tests do not inject wins. Local events contain no student identity and remain in the current browser.

## Campaign verification

Independent literal test recipes are kept under `tests/`, outside the runtime bundle. `tests/campaign-routes.test.ts` constructs and simulates all 45 on their actual boards, then writes ignored browser plans. `tests/campaign-browser-review.mjs` uses those plans through visible controls; it checks all shipments, selection/rotation/moving/undo, saved builds, the completed chapter book, and the finale after reload. Mobile review builds and completes an advanced eight-tool order by touch. See `docs/CAMPAIGN.md` for the authored progression and `PLAYTEST.md` for actual results.

Keyboard shortcuts stay available through button hover hints, assistive shortcut metadata and the full H help guide. The workshop uses plain icon/text buttons, with a short contextual hint when a part is selected. Undo (previous edit) and Cancel (leave the pending selection/mode) have separate buttons. Hints, keyboard dispatch and the guide share `src/controls.ts`. Physical key codes support Hebrew keyboard layouts; native Ctrl/⌘ browser combinations are preserved.
