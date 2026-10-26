# Sentence Foundry asset provenance

Art owner: Sentence Foundry art/assets helper. Acquisition is through the human's signed-in Chrome Tripo UI; no raw API or tokens. Gameplay meshes do not determine colliders or semantic truth.

## Inspection and generation budget

- 26 October 2026: Dedicated Chrome tab `512279438`, named `🏭 Sentence Foundry`, opened `https://studio.tripo3d.ai/assets`.
- The **My Assets** collection visibly contains owned mechanical props and earlier commissioned game assets. An existing brass pump was inspected: [owned pump](https://studio.tripo3d.ai/3d-model/brass-steampunk-pump-with-pressure-gauge-and-transparent-tube-mounted-53dc9822-02d0-4b27-9acf-6c4316955da8), prompt `brass steampunk pump with pressure gauge and transparent tube mounted on stone base`, 19,032 faces / 12,755 vertices, 2K PBR Tripo H3.1. It was not acquired for this game.
- Displayed account balance at inspection: **6415** credits. Text-to-model H3.1 **Generate 30** was displayed. The lead inspected the first built-in imagegen target before generation was started.
- Budget: at most three original model generations; no purchases or upgrades. Required skeletal rig jobs would be additional only if a deforming character were used. This factory design uses rigid machines, so authored hinge/piston motion is mechanical animation, not a skeleton rig.

## Acquisition log

### Washing tunnel — acquired locally

- Original prompt: model-prompts.md item 2, exactly as saved in `docs/art/model-prompts.md`.
- Task: [60c97cf0-6496-456f-b3bf-d3457946c7b2](https://studio.tripo3d.ai/workspace/generate/60c97cf0-6496-456f-b3bf-d3457946c7b2).
- H3.1 HD Model, Geometry & Texture, text mode, Sharing Only. Generate button displayed **30 credits**. Account balance subsequently displayed 6355; other crews share the account, so this balance change is not treated as an isolated cost measurement.
- Ownership basis: newly generated from original Sentence Foundry prompt in the human's signed-in account; not a discovered third-party public model.
- Generation later completed visibly: 18,144 faces, 12,356 vertices. A cobalt/cream arch with gauges is suitable as the central washer. GLB / 1k export was acquired through the normal visible Export dialog with a supported tab `download` event armed before the final click. Actual returned file: `/Users/acedzn/Downloads/sentence-foundry-washer (1).glb`. Original preserved at `work/art/originals/washer-original.glb`; runtime file `public/models/washer.glb`.

### Service arm — acquired locally

- Original prompt: model-prompts.md item 1, exactly as saved in `docs/art/model-prompts.md`.
- Task: [3bda26ef-1f5a-4be0-af19-c531aef27d90](https://studio.tripo3d.ai/workspace/generate/3bda26ef-1f5a-4be0-af19-c531aef27d90).
- H3.1 HD Model text mode, displayed generation cost 30 credits. The previously timed-out submission **did succeed**; no duplicate was submitted.
- Generation visibly complete: 18,108 faces, 11,668 vertices. Cobalt articulated clamp arm on square base. No skeletal rig is required for this rigid mechanical object; no animation clips claimed.
- Ownership basis: original prompt generated in the human's signed-in account.
- Normal visible GLB / 1k Export dialog was used with a supported `download` event. Actual returned file: `/Users/acedzn/Downloads/sentence-foundry-service-arm.glb`. Original preserved at `work/art/originals/service-arm-original.glb`; runtime file `public/models/service-arm.glb`.
- Two of three maximum model generations have been used. No third generation needed.

## Resolved acquisition interruption

26 October 2026, approximately 16:10 UTC: Native CUA explicitly reported: **The Mac is locked and automatic unlock could not unlock it. Ask the user to unlock the Mac manually before continuing.** Earlier Chrome extension tab operations timed out, and native keyboard actions returned a Computer Use service startup failure. Native observation then identified the lock. The art owner released the shared native lock. The human subsequently unlocked the Mac. Browser connection recovery succeeded with a supported Chrome binding and `browser.tabs.get('512279438')`, followed by normal UI Export and `tab.playwright.waitForEvent('download')` / `download.path()`. Both local GLBs are now acquired. No raw API, browser-internal state, cache extraction or direct asset fetch was used. Runtime integration and gameplay visual review are owned by the lead.

## Runtime bytes and integrity

Both files are already below the 3 MB model target at the original 1k export setting. Runtime files deliberately retain the exact acquired bytes; no further lossy texture or mesh compression was needed. The **original and runtime/optimized figures are identical**, and no Draco, meshopt or external decoder dependency is introduced.

| Asset | Original bytes | Runtime bytes | SHA256 (original = runtime) |
|---|---:|---:|---|
| washer | 980,760 | 980,760 | `92849e8ec09b6893a68b57ef992dd379439fd45ee72bbcfa9bc4fcb36b148583` |
| service-arm | 1,062,788 | 1,062,788 | `ee0c1eb2888452a29aa05f65bee2546389ad71fedcd5464b6618f94d7bb2e22f` |

Combined model transfer: **2,043,548 bytes**. Each GLB contains one mesh/primitive, three embedded JPEG textures, no required extensions, no skins, and no animation clips. The arm is rigid mechanical art; motion is authored machine motion rather than skeletal animation. Detailed metrics are in `docs/art/asset-metrics.json`.

Original prompts are exact in `docs/art/model-prompts.md` (items 1 and 2). Item 3 was planned and **not generated**. Ownership/license basis is original user-owned-account generation on the already subscribed account, with the task visible under My Assets. No public gallery model was downloaded or redistributed and no new agreement or purchase was accepted.

Tripo acquisition proof images: `docs/art/tripo-washer.png` and `docs/art/tripo-service-arm.png`. These show the completed acquired models in Tripo, and are distinct from actual gameplay captures.

## Verified runtime use

Lead integrated both GLBs through GLTFLoader with local embedded textures and observable mesh/triangle metadata. Washer and fixed painter are central operating machines, mounted on authored supports/nozzles clear of travelling items. The fixed arm uses original PBR materials and rigid-base swivel. The detached workpiece uses the same genuine arm geometry with independently cloned gray primer/blue coat materials; it travels through the painter and changes color. No skeleton/clip playback is claimed because these exports are rigid machinery. Independent five-contract, mobile and strict-control review completed with both model statuses ready and no page/console errors. Generated concepts, Tripo acquisition proofs and actual gameplay captures remain separately named.
