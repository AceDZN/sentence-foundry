# Construction and verification plan

Visual thesis: warm wood and cobalt machinery, with dark roller belts and amber fasteners; one readable tabletop dominates a quiet interface.
Content plan: immediately playable tabletop; top client order; compact edge palette; always-visible run/halt; help contains full controls. End screen records five orders, attempts and separate efficiency medals.
Interaction thesis: deliberate placement snap/lift, readable machine press/spray motion, physical product transformation and delivery bounce/chime. Reduced motion keeps state changes while removing particles and camera easing.

## Grid and simulation
A 9×7 table; tool tiles output east/south/west/north and can receive from any side. Belt and corner pieces can be rotated; four machine tools transform products as they physically cross a cell. Source and delivery ports are visible. Obstacles occupy cells and collide. Challenge 3 has two physically distinct input ports (crate and detached service arm), letting routing select the receiver. Challenge 5 moves source/delivery and introduces display panels with labels outside their packages. Machine selection text describes actions in English. Palette position varies between contracts; operations retain reliable machinery identity, without answer highlights.

A product cannot enter an occupied cell; queued products wait with a harmless jam state. A missing link or loop halts progress visibly, with Stop returning to editing and resetting only the run. Build/reading time has no score penalty. Production time and footprint remain efficiency measures. Deterministic state ticks expose physical position, product properties/history, colliders, current contract/spec and events. UI actions call the same pure simulation used by tests.

## Evidence
Unit fixtures independently verify semantic acceptance and rejection. Simulation solver enumerates several simple source-to-exit paths and operation placements rather than copying one target route. Real Playwright pointer/keyboard actions build success paths; mistakes, pause/resume, receiver switch, transfer, mobile, hints/restarts/fullscreen are exercised without mutation of game state. The existing develop-web-game action client runs after meaningful changes. Actual screenshot captures are separate from imagegen concepts. Matching target views compare composition, material, occupancy, product states and HUD. Record measured bytes and frame timing; no claims of validated learning or fun from automation alone.
