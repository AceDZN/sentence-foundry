# Campaign machine rendering

The campaign adds two authored rigid mechanical assemblies to the existing workshop. The original Tripo washer/painter and owned pump/worklights remain the identity assets. No new model generation or external asset is used for these machines.

## Dryer

Amber enamel open gantry with steel feet, guarded rear fan and overhead heater bars. A fan spins only while a workpiece dwells at this tile. Heater emission and three restrained air ribbons show processing. The upper heater sits above the detached service-arm workpiece volume; the rear fan stays outside the belt lane. Reduced motion keeps a static processing indication.

## Unpacker

Teal enamel bridge with two rigid side jaws and an overhead sliding cutter. The jaws open during processing while the cutter traverses the package seam. The jaws stay at the belt sides; the cutter remains above the travelling item. These are authored rigid transforms, not skeletal clips. Removing a package uses the existing product rebuild path, so the underlying receiver becomes visible again.

## Product finish

`dried` adds a small brass finish mark to an unpacked product and slightly changes its surface roughness. Painted-and-`paintCured` material receives a more reflective finish, including independently cloned coatings on the travelling service arm. Initial source examples explicitly start with `dried: false` and `paintCured: false`; the original source silhouettes and materials remain.

## Layout and timing

The workshop now keys its board geometry from the actual board data rather than the campaign level index. Tile loops, centring and picking use board width/depth. Moving fan/jaw/cutter meshes are explicitly excluded from static geometry batching. Processing animation uses tile occupancy plus positive machine dwell; the main loop supplies dt=0 while paused. No gameplay API methods, grid/simulation/semantic rules or controls were changed by the art owner.

## Verification

- `npx tsc --noEmit` and `git diff --check -- src/workshop.ts` pass after integration with the new semantic/content types.
- Actual UI construction selected level 12 from the order book and built wash → paint → dry through pointer/button input. The dryer was captured idle, processing and after success. Three panels were accepted with `dried: true`, `paintCured: true` and `packed: false`.
- Actual UI construction selected level 26 and built pack → unpack → label. The unpacker was captured idle and processing; two crates were accepted with the package removed and item labels visible. The same flow passed through real touch input at 390 × 844.
- All eight mobile tool buttons fit within the viewport; measured button targets are 88.5 × 44 CSS pixels, arranged in two rows. The dry/unpack assemblies and travelling workpiece remain clear of the grid ports.
- Pausing during each machine's processing, then advancing 700 ms through the authorized time hook, left production time, workpieces and deliveries unchanged. The paused screenshots were also inspected.
- All captured desktop/mobile scenarios reported no page or console errors. State and evidence: `docs/art/campaign-machine-visual.json`; images `campaign-dry-{idle,processing,paused,complete}.png`, `campaign-unpack-{idle,processing,paused,complete}.png` and `campaign-mobile-unpack-{idle,processing,paused,complete}.png` in this directory.
- The installed develop-web-game action client completed against the stable preview at port 4233; screenshot/state are under `work/action-campaign-machines-stable/`. Its screenshot was opened and visually inspected. An earlier dev-server action-client attempt was interrupted by concurrent HMR; it is superseded by the stable-preview run.

These renderer observations complement the lead's separate full campaign solvability and 45-level browser review; they are not claims of learning gains.

## Sustained campaign resource cleanup

Removed procedural tile/port/product geometry, materials and canvas textures are now disposed, and expired particles release their materials as well as geometry. Static batching also disposes the authored source buffers it replaces. Original GLB geometry/materials/textures are explicitly remembered as shared, and global primitive materials and Three's shared sprite quad survive transient-group removal. Cloned workpiece coat materials are released without deleting their borrowed maps. The main renderer exposes counts through the read-only `resourceInfo` getter.

An isolated ownership fixture observed disposal events: owned geometry/material/texture and cloned coat materials were disposed exactly once; imported stand-in resources and the Sprite unit quad received zero disposal events; authored pre-batch and merged buffers were each disposed at their correct lifecycle boundaries. Report: `docs/art/campaign-resource-ownership.json`. The lead separately verified a fully loaded, warmed scene through six rotate/restart cycles with no resource accumulation, then reran all 45 UI challenges successfully. No runtime source edits were made after the lead froze the final build.
