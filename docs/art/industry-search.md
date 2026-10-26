# Industrial workshop asset search

Human requested a stronger industrial workshop feel and explicitly asked to search Tripo's industrial gallery and other categories before spending generation credits. No new generation has been used for this pass.

## Search first

- [Industrial category](https://studio.tripo3d.ai/3d-model-gallery/category/industrial): inspected through primary Tripo web content during routing trouble and then live in the signed-in Chrome tab after recovery. The category offers machinery, tools, factories and components, with Generator, Tool, Pipe, Motor, Air Compressor, Valve and other tags.
- [Tool gallery](https://studio.tripo3d.ai/3d-model-gallery/tool): inspected as a second relevant route through both primary web content and live Chrome. It offers workshop/equipment/machine subcategories and downloadable-model listings.
- [Generator gallery](https://studio.tripo3d.ai/3d-model-gallery/generator): attempted; primary web retrieval returned inaccessible. This is not reported as a successful visual inspection.
- Signed-in owned collection was previously inspected in Chrome on 26 October: brass steampunk pump, steampunk spotlight, steampunk thermometer and other generic mechanical props were visibly under **My Assets**. Existing own assets are the preferred reuse candidates.

Public gallery availability and a Download button do not establish the rights to redistribute another user's model in this public game repository. No public gallery model was downloaded. The official [commercial-use guide](https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially) and [Terms section 5.2.2](https://www.tripo3d.ai/terms) support broad use/distribution rights for the paid user's own generations. They do not establish a general reuse licence for other users' gallery outputs. This pass therefore favours existing user-owned generations.

## Shortlist

| Candidate | Basis | Intended use | Placement constraint |
|---|---|---|---|
| [Brass pump](https://studio.tripo3d.ai/3d-model/brass-steampunk-pump-with-pressure-gauge-and-transparent-tube-mounted-53dc9822-02d0-4b27-9acf-6c4316955da8) | Previously observed My Assets, creator matching signed-in user, generic original machinery prompt | Rear pressure/circulation equipment; strong valves, tube and gauge silhouette | Behind grid, below contract/HUD; no active belt overlap |
| [Steampunk spotlight](https://studio.tripo3d.ai/3d-model/brass-steampunk-spotlight-on-rocky-pedestal-with-riveted-frame-and-gla-bdafba6c-7b45-40a4-9d58-709a3fd70900) | Previously observed My Assets and normal Chrome download history | One or two warm worklights at outer bench corners | Outside buildable cells and entry/exit ports |
| [Steampunk thermometer](https://studio.tripo3d.ai/3d-model/steampunk-brass-thermometer-with-red-liquid-and-glass-tube-mounted-on-01dcc4bb-77d8-44e4-b3fb-c1e620e21e1c) | Previously observed My Assets and normal Chrome download history | Rear wall instrumentation if needed | Do not compete with contract text or machine tool icons |

## Resolved browser interruption

The existing Chrome binding reported no surviving own tabs. Creating a new own tab and navigating to Industrial timed out and reset CUA. A bounded native recovery attempt with `cua.getApp('com.google.Chrome')` also timed out and reset. The shared native lock was released after the failed recovery. No raw Tripo API, browser cache extraction or hidden state was used. The timed-out tab creation had actually opened own tab `512279512`; listing own tabs and direct `browser.tabs.get` recovered live control. Normal visible GLB / 1k exports and supported download events acquired the owned pump and spotlight. Earlier Download History names were checked in Downloads and were no longer there; this pass therefore re-exported them normally.


## Selected local deliverables

- `public/models/decor/pump.glb`: brass circulation assembly with valves and gauge. Local bounds [-0.500, 0, -0.207] to [0.500, 0.491, 0.207]. Suggested rear-bench scale about 2.2, keeping active grid and ports clear.
- `public/models/decor/spotlight.glb`: riveted brass worklight. Local bounds [-0.496, 0, -0.311] to [0.496, 1.000, 0.311]. Suggested outer-corner scale about 1.6.
- Screenshots: `owned-pump-candidate.png`, `owned-spotlight-candidate.png`; public comparison screenshot `industry-public-candidate.png` records the skipped workbench by a different creator.
- Original exports, exact bytes/hashes, prompts and account ownership evidence are recorded in ASSETS.md and decor-metrics.json. No new generation was used. The thermometer was not acquired because two suitable silhouettes already satisfy the industrial dressing need without clutter.
