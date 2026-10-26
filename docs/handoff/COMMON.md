# English 3D games, round 2 — shared build contract

26 October 2026. The human user owns Workbook and commissioned another THREE English games after Goblin Kitchen, Clockwork Alibi and Rule Rascals. Build now in three separate chats, with independent repositories and contexts. This continues their explicit instructions: browser-playable real 3D, Hebrew-speaking Israeli grade-7/8 learners, English material from Workbook, screenshot targets using the imagegen skill before development, then models in their signed-in Chrome/Tripo account, rig animated characters, build and compare real gameplay against the targets. They authorized new PUBLIC GitHub repositories under AceDZN, regular commits to main, and useful internal builder crews.

## Ownership

| Game | Exclusive local repository | Public origin | Dev / preview |
|---|---|---|---|
| Rooftop Radio | /Users/acedzn/dev/AceDZN-exp/rooftop-radio | AceDZN/rooftop-radio | 5231 / 4231 |
| Critter Safari | /Users/acedzn/dev/AceDZN-exp/critter-safari | AceDZN/critter-safari | 5232 / 4232 |
| Sentence Foundry | /Users/acedzn/dev/AceDZN-exp/sentence-foundry | AceDZN/sentence-foundry | 5233 / 4233 |

Always use your absolute repository path as workdir. Your chat may initially open in a projectless output directory: the actual repository above is where all work belongs. Initial handoff commit and public origin are seeded by the parent. Verify origin, main and existing files. Do not touch Idea Plotter, another game or the Workbook production repo. No force pushes. Side tracks use a branch and PR; main receives working milestones. No production deployment requested. Prepare a static Vercel build.

Lead owns gameplay, integration and Git. Use two helper agents with non-overlapping file ownership: (1) art/assets/scene and Tripo, (2) independent English semantics and browser playtest review. The user explicitly requested crews. Only one designated art owner in your crew drives Chrome. The lead must inspect the first gameplay target before any gameplay implementation; parallel source review/planning is useful while art runs.

## Mandatory order

1. Read BUILD_HANDOFF.md and docs/curriculum snapshots. Define GAME_IDENTITY.md with the core verbs, 60-second loop, failure/recovery, camera, visual materials, HUD and sound.
2. Read /Users/acedzn/.codex/skills/.system/imagegen/SKILL.md and generate TWO separate gameplay screenshot targets with the built-in image_gen tool: first useful action and a later consequence/advanced state. These are conceptual gameplay views, not real captures. Inspect them, save exact prompts and built-in mode, and copy outputs into docs/visual-targets. Do not substitute SVG, another generator, or CLI/API mode without the user's explicit choice. No gameplay source implementation before the first approved-by-lead visual target. A second target may be completed alongside asset work.
3. Use the user's Chrome to inspect owned Tripo assets at https://studio.tripo3d.ai/assets . Discovery: https://studio.tripo3d.ai/?category=featured&model_type=all&page_type=1.2&recommended=recommended&use_case=all . Generate original missing models at https://studio.tripo3d.ai/workspace/generate/ . Public discovery is not automatic permission to redistribute. Record the ownership/license basis. Download local GLBs normally through the UI. Use no raw Tripo API, tokens, hidden browser state or substitute generator.
4. Rig characters requiring skeletal/body animation in Tripo with the appropriate humanoid/Mixamo-style or creature rig. Obtain actual useful animation clips. Facial rigging only if designed facial animation needs it. Integrate real local GLBs and AnimationMixer playback. Rigid primitive body-part motion is not a fulfilled Tripo rig.
5. Implement one complete playable challenge, then the five-challenge slice. After implementation, capture actual gameplay matching the target camera/viewport/state and compare target versus actual side by side. Fix material differences in composition, silhouette, materials, scene occupancy, HUD and feedback. Record the honest remainder in VISUAL_REVIEW.md.

If a required external step fails, preserve the gate and report the exact observed blocker. Continue independent curriculum, tests, layout planning and procedural collider work; do not silently call procedural characters a completed art pipeline or release the game as complete. Do not repeatedly retry an unchanged boundary.

## Shared Chrome

Use current mcp__cua_repl documentation and your own tab, with a descriptive session name. Never navigate, reload or close someone else's tab, cancel their jobs, or interfere with the human's browsing. On 26 October the parent recovered signed-in Tripo through native cua.getApp('com.google.Chrome') even when extension-tab control timed out. This is a recovery option, not a promise that future browser access works. Start with tab-scoped tools if available; native AX is a supported fallback.

Native app control shares focus. Cooperate with existing English crews using atomic mkdir of /Users/acedzn/dev/AceDZN-exp/.english-tripo-ui-lock before native Chrome observation/input. Write owner.json with your game/thread and a timestamp. Release YOUR lock after each bounded interaction session, especially while generation or rigging is processing. If occupied, do useful independent work and retry later. Do not delete another crew's lock. Unexpected human navigation means stop input and reacquire your own tab using fresh state.

Use existing credits only, at most THREE new model generations per game plus required rig/animation processing. Read and record displayed costs; inspect existing assets first. No buying credits, upgrade, subscription, unexpected agreement or credential changes. A low balance is a blocker for new paid work, not authorization to purchase. Asset prompts start with the unique game name.

Record prompt, task/asset URL or visible ID, ownership basis, shown credit use, downloaded filename, original/optimized bytes and SHA256, rig and clip names, runtime path in ASSETS.md. Targets: <=3 MB per optimized model and <=20 MB initial game load where feasible; measure actual sizes. Use reputable registry optimization tools. Meshes are appearance; authored colliders and pure game state remain authoritative.

## Game and technical bar

Real 3D engine: Vite + TypeScript + Three.js, actual depth, lighting, shadows, picking and collisions in a single main canvas. Add physics only when it improves the core verbs. Pin dependencies and commit lockfile. Relative Vite base, local bundled fonts/models/sounds, static npm run build. No backend, runtime AI, accounts, remote analytics or API keys.

A finite 6–10-minute vertical slice: useful action in 30 seconds, FIVE authored escalating challenges and one new-context transfer challenge among those five, complete win/mistake/retry loop, pause/restart/mute/reduced motion/fullscreen, keyboard/pointer plus usable touch. First-person pointer lock is optional; give a click-drag/touch camera fallback. Focus loss pauses. Resize, DPR <=2, readable WebGL failure. Make success, failure and recovery feel satisfying with sound and animation after a gesture. English instructions specify meaningful choices during play; no unrelated quizzes, answer doors, or word-order forms surrounded by a 3D backdrop.

Pure TS simulation/content modules separate from rendering. Meaningful tests verify independent fixture truth, level solvability, mistakes, equivalences and near misses. Expose window.render_game_to_text() with current observable state and coordinate convention, and deterministic window.advanceTime(ms) respecting pause. Do not inject win states in tests.

Read /Users/acedzn/.codex/skills/develop-web-game/SKILL.md and use its existing scripts/web_game_playwright_client.js after meaningful changes. Inspect the actual screenshot output and state, fix errors. Also exercise real browser success, recoverable mistake, restart, hint, changed transfer challenge and mobile layout with the Tripo models visible. Test sequences through their consequences, not just buttons. Measure download/bundle size and hardware performance before reporting figures. Automated checks do not establish fun or learning gains.

## English and Hebrew

Use exact saved Workbook modules, grade-specific scope, and canonical source links. Original game sentences are authored fixtures, not quotations. Do not claim Ministry approval or validated learning outcomes. Hebrew menus/help/onboarding with lang=he dir=rtl; task-bearing English in explicit LTR/bdi, bundled Hebrew font and event.code controls that work with Hebrew keyboard layout. On-demand vocabulary translation, replayable English audio when available, visible text always. No microphone requirement or speaking mastery claims.

Pause reading, translation and planning without score penalty. Once reading ends, the action can be challenging and optional timed medals can reward fluency of play. Speed and comprehension evidence are separate. No target beacon, fixed answer color or identical trial order that bypasses English. Shuffle surface details while preserving verified semantics. Local-only minimal events distinguish first unaided decisions, hints, retries and transfer; never collect student identities.

Write CURRICULUM.md: challenge, exact URL, intended comprehension skill, original English fixture, actual world consequence and misconception. Receiving/reading English is not automatically producing grammar. Preserve that distinction in claims.

## Deliver

README with run/controls/implemented-versus-planned/Vercel instructions; progress.md beginning Original prompt; GAME_IDENTITY.md; CURRICULUM.md; ASSETS.md; exact imagegen prompts and target images; actual gameplay captures separately; VISUAL_REVIEW.md; PLAYTEST.md; tests and committed lockfile. Commit and push working main checkpoints. Leave a working dev/preview and show playable gameplay in the browser pane when finished. Don't stop at a plan, title screen, model viewer or first playable scene.

