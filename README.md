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

## Current state and open requirements

The five-contract construction simulation, Hebrew/LTR interface, machine mechanics, controls, state hooks and independent semantic/solvability tests are implemented. Two built-in imagegen targets were generated and inspected before source implementation, with exact prompts in `docs/visual-targets/PROMPTS.md`.

**Required Tripo integration remains OPEN until local downloads are verified.** Two original models are complete in the human's Tripo account; the Mac is locked and CUA cannot unlock it, blocking Chrome exports. `ASSETS.md` records actual observed tasks, costs and boundary. The renderer's temporary authored machine geometry is a development fallback, not completed Tripo art. No skeletal rig is required by this rigid machinery design. Final visual comparison and full Tripo-visible playtest remain open while these files are unavailable.

See GAME_IDENTITY.md, CURRICULUM.md, ASSETS.md, VISUAL_REVIEW.md and PLAYTEST.md for evidence and exact limitations. Generated concepts and actual captures are stored separately. Authored game fixtures derive from Workbook comprehension scope; this game does not assess grammar production or claim validated learning outcomes.

## Test hooks

`window.render_game_to_text()` returns current observable contract, grid, sources, direction states, travelling product histories, deliveries, support/attempt records, asset status and frame metrics. Coordinates: x east, z south, y up. `window.advanceTime(ms)` deterministically advances the same simulation, respecting pause. Tests do not inject wins. Local events contain no student identity and remain in the current browser.
