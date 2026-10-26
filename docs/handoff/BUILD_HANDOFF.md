# Sentence Foundry — מפעל ההמצאות

Read COMMON.md. Exclusive repo /Users/acedzn/dev/AceDZN-exp/sentence-foundry, public AceDZN/sentence-foundry, main; dev5233/preview4233.

## Game promise

Build a ridiculous miniature factory, press RUN and watch the actual conveyor line execute. Crates arrive, an arm washes/paints/stamps/packs them, an incorrectly arranged line washes a stamp off or delivers a silly unfinished product. Stop, move/rotate a machine, reconnect the belt and rerun. Competing goals are a correct order first, then a compact/efficient/funny machine layout.

A bounded 3D workshop table with a rotatable oblique camera, physical travelling items and real machine animations. Four transformation machines, conveyor straight/corner tiles, one splitter only if the five contracts need it. One grid, five production contracts, no general programming language, massive tech tree or runtime AI. Multiple valid layouts. This is a build/run/debug automation puzzler inspired abstractly by Infinifactory and Automachef, with original workshop art and machinery.

The title is a project name, not a reason to add word-sorting exercises. Never turn it into dragging sentence fragments to unlock an automatically constructed factory. The player builds the line.

## Workbook targets

- https://english.workbook.co.il/grade-8/chapter-7/who-does-it-and-what-is-done
- https://english.workbook.co.il/grade-8/chapter-7/following-a-production-process

Primary comprehension: who/what performs an action, what receives it, and the sequence of a process in present simple active/passive descriptions. Original fixtures supply production specifications.

“The arm paints the crate” and “The crate is painted by the arm” describe the SAME actor/action/receiver, so both must accept the same physical line. “The arm is painted” changes the receiver. The past participle in “is painted” is not a claim that the whole sentence is past. Omitting by-agent doesn't mean nobody acts. Do not require an unmentioned agent just to make a puzzle harder. Passive is a change in focus, not automatic greater correctness/reliability.

Make at least one receiver contrast physically possible: a removable service arm can travel through the paint booth as a workpiece, while a second fixed painter operates it; alternatively an authored robot-repair bay with two clearly identified units can process either crates or a unit. Scope this one role-switch feature tightly. Both receivers must be plausible so “paint whatever can move” cannot bypass reading. Distinguish the currently active machine from a detached workpiece in both visuals and text hook.

English contract example: “First, the crates are washed by the cleaning arm. Next, the painter coats them. Finally, labels are attached to the crates.” Follow “them” back to crates. Cleaning after labelling actually removes the labels, creating a visible reason to care about order. Cards say what the client needs, not which grid coordinate to click. Target output pictures must NOT reveal the whole answer before the first meaningful language decision; an observed finished sample may be earned after a supported attempt, tagged accordingly.

## Five contracts

1. First shipment: move/rotate two belt pieces, choose the washing machine from tool descriptions and produce one washed crate. Learn play/run/stop and immediate editing.
2. Same work, new focus: a present passive production contract and an equivalent active alternate. Build one line; semantic acceptance and product state are invariant across paraphrase.
3. Receiver switch: an active paint-crate contract versus a passive paint-service-arm contract sharing objects and machines. Route the specified receiver. A wrong workpiece gets an amusing paint bath and is repairable.
4. Sequence and reference: wash → paint → label/pack; a wrong order changes product state for a real reason. Three to five items, spacing and one harmless jam add a construction puzzle. Pronouns refer unambiguously to current material.
5. Transfer: new workshop grid and nouns/product, shifted descriptions and omitted agent where appropriate, no solution hint. Same four process primitives; verify several viable layouts and a new dependency order.

All five are full construction/play puzzles. Avoid five “choose machine” questions with predetermined belts. Recipe spec must have an independent semantic truth graph and solver/simulation oracle. Test equivalent active/passive specs, agent/receiver swap, agreement/participle fixtures, pronoun reference, sequence counterexamples, missing agent semantics, jam recovery, edited machine routing and solvability. Validate contract data before randomization. Stop/pause freezes simulation and reading. Track production time/footprint medals separately from first unaided comprehension.

## Identity and screenshot targets

An inviting tactile mechanical workshop: cobalt enamel, brushed steel, amber worklights, wooden workbench, satisfying levers/rollers and visible items moving between stations. A compact machine palette along one edge and an English contract at the top; most of the view is a 3D factory being built. No cooking/restaurant theme and no game cards grid.

Target 1:
Use case: ui-mockup. Asset type: 16:9 real-3D browser gameplay screenshot target for Sentence Foundry. Oblique rotatable view of a compact whimsical workshop table with a buildable grid. A conveyor carries plain wooden crates toward a chunky cobalt washing arm, a paint sprayer and a label press. One conveyor corner is visibly being rotated by the player; physical items and machine mechanisms are clear. Warm worklights, brushed metal, subtle wear, satisfying small factory depth. Minimal Hebrew HUD shell, small LTR client contract “The crates are washed. Then they are painted.”, four compact tool icons and clear RUN/STOP controls. Most pixels show playable machinery, not UI panels. No sentence fragment tiles, no quiz, no copied game art, no title poster. Conceptual target.

Target 2:
Use case: ui-mockup. Asset type: second 16:9 gameplay target with identical Sentence Foundry workshop/art/camera. The running line has just washed a label off a crate, leaving floating wet paper beside a drain, while a spare service arm on another conveyor is amusingly splashed in blue paint. Show a clear halt lever and a hand moving the label press later in the line. Small LTR contract “The label is attached after washing.” and restrained Hebrew repair guidance, same tool palette. Depict an intelligible recoverable production mistake with real 3D mechanical action, not a wrong-answer dialogue. The client order remains readable and does not display the complete solution diagram.

## Tripo assets

Inspect existing owned mechanical props first. Max THREE new generations: (1) distinctive modular service/painter robot or arm assembly, (2) washing/paint-booth silhouette, (3) label/packing press or special workpiece. Models must allow authored collider alignment and modular procedural connectors; generated meshes are not authoritative grid/colliders. If using a deforming/full-body robot character, rig it in Tripo with working animation clips. Rigid machine hinges, pistons and moving static props can be authored transforms; call them mechanical animation, not a skeleton rig. Use at least two acquired Tripo identity assets in the live workshop, not decorative hidden imports. No need to force a humanoid protagonist into the design.

## Acceptance

The player can build multiple valid lines, run/stop, see stateful workpiece transformations, repair a jam/wrong order and deliver correct products. English agent/receiver/sequence distinctions change what must be built. Five contracts including transfer and equivalence tests. Real acquired Tripo assets visible in play, actual screenshots compared to targets, complete control/mobile testing and main checkpoints. COMMON.md defines the rest.

