# Visible shortcuts — read-only visual review

Reviewed the updated static preview at port 4233 at **1440 × 900** and **390 × 844**. No runtime source, Chrome account state or assets were changed by this review.

## Result

The six editing actions are distinguishable by icon, Hebrew caption and visible shortcut: **M** move, **R** rotate, **X** erase, **⌘ Z** undo, **V** view and **Esc** cancel selection. Undo says “ביטול פעולה”; Cancel says “ביטול בחירה”, and the guide explains that Escape leaves already-built parts unchanged. The displayed Mac undo shortcut matches the review platform.

At 390px, all six editing buttons fit in one row from x12 to x378, at y705–769. Each is about **57.7 × 64 CSS pixels** with no text overflow. The run/reset/hint row occupies y776–819, and the small keyboard-help line ends inside the 844px viewport. The stacked icon/caption/keycap treatment is compact but readable. The desktop toolbar also fits without overflow.

The mobile guide fits x13–377 and y59–785. Its content scrolls normally within the dialog (1279px content / 724px visible height); both the introductory instructions and lower shortcut list were inspected. The desktop guide was inspected too. Reading the full list is optional; the main controls already show their shortcuts.

The initial mobile coach occupies y413–518 and covers a front strip of the table, but the first job's required edit targets remain visible and hit-test to the world: (2,2), (2,3), (4,4), (4,3) and (8,3). The coach is dismissible and passes pointer input through its body. Selecting advanced level 26 hides the coach; the eight-tool palette, inspector, status and footer fit separately. No additional layout change is required. The root identified a palette-digit contrast issue and is applying the dark-text override separately; this review did not edit it.

## Evidence

- `controls-keycaps-desktop.png` / `controls-keycaps-mobile.png`: initial controls and coach.
- `controls-guide-desktop.png` / `controls-guide-mobile.png`: guide introductions and shortcuts.
- `controls-guide-bottom-desktop.png` / `controls-guide-bottom-mobile.png`: lower guide content.
- `controls-keycaps-mobile-eight.png`: advanced eight-tool layout.
- `controls-keycaps-visual.json`: element bounds, labels, aria-keyshortcuts and error collection (no page/console errors in the reviewed desktop/mobile contexts).
- `controls-keycaps-mobile-eight.json`: advanced mobile stacking bounds.

This was a visual/layout review. The separate controls reviewer owns keyboard/touch behavior assertions; no 45-level campaign rerun was needed for this change.
