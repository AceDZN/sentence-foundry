# Workbook bridge review

27 October 2026. The Sentence Foundry bridge was implemented from the Critter Safari/Clockwork player contract and independently checked without controlling the user's Chrome.

## Passed

- Eleven host unit tests cover all 45 canonical deep links, malformed/ambiguous/out-of-range values, explicit-origin envelopes, standalone silence, Workbook HTTPS/loopback HTTP trust, exact same-origin Vercel preview trust, rejected lookalikes/opaque origins, readiness gating, completion deduplication and restart ordering.
- Every iframe link `?level=1` through `?level=45` opened its corresponding fresh editable contract with all four local models ready. Each emitted exactly `ready` then `level-start`, with the requested 1-based level and no automatic completion.
- A real first shipment was built and completed through UI input. Additional time stepping did not duplicate completion. Restart and a second actual shipment, followed by Next, produced exactly: `ready`, `start 1`, `complete 1`, `start 1`, `complete 1`, `start 2`. Ready appeared once for the document.
- Both completions reported positive integer production durations (6,641 and 6,667 ms in this run), with no invented stars or score.
- An explicit level-1 link overrode an actual saved level-2 entry. A standalone explicit level-45 page opened correctly and posted no messages to itself.
- No browser page/console errors occurred. Late-level and actual completion screenshots were opened and inspected.

Evidence: `workbook-summary.json`, `workbook-deep-link-1/26/45.*`, `workbook-actual-complete.*` and `workbook-restart-next-ordering.*`. The browser fixture was intercepted at the real local origin's `/__workbook_test__` and embedded the actual game page. It used only real UI actions and the public deterministic time hook; no outcome or saved-completion state was injected.

## API and boundary

`initHost('sentence-foundry')` validates the immediate parent before forwarding. Every post uses an explicit target origin and the `{source:'workbook-game',version:1,slug:'sentence-foundry'}` envelope. Unknown/opaque parents and standalone pages send nothing. Vercel trust is restricted to an identical iframe/parent HTTPS origin, rather than every Vercel project.

`parseLevelParam(search, count=45)` returns a zero-based index for one canonical integer from 1 to 45, or null. `WorkbookSession.sync({ready,level,complete,durationMs})` consumes a 1-based level and actual production duration. `restart()` resets the current start/completion entry while preserving document readiness.

Security rejection and same-origin Vercel behavior were unit-tested; the real browser iframe verification used local HTTP. Workbook catalog/release and production hosting verification belong to the root integration work, not this local bridge review.
