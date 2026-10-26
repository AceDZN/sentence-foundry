# Acquired-task silhouette notes

Two original Tripo H3.1 tasks are generated in the human's account. Both models are now acquired locally; ASSETS.md records the resolved interruption and exact provenance.

## Washer

Task `60c97cf0-6496-456f-b3bf-d3457946c7b2`, 18,144 triangles. Tall cobalt/cream arch with silver capped top, twin front pressure gauges and side brass valve, cobalt low pedestal. Strong recognisable outline. The generated geometry includes gauges in the lower opening, so place the model **behind the belt path** as the wash tower, with authored nozzle/pipe/water effect reaching over the belt. Do not pretend its visual opening defines the collider. Normalize uniformly, floor aligned at local y=0, and preserve its main viewing front toward the default camera. This retains the target's cobalt machine, amber hardware and tactile curved silhouette.

## Service arm

Task `3bda26ef-1f5a-4be0-af19-c531aef27d90`, 18,108 triangles. Cobalt square pedestal, clearly separated round mechanical elbows, silver two-finger clamp. Its asset thumbnail and full completed workspace are visible. As active painter, put the square base beside the belt and author a restrained base swivel, light pulse and emitted paint mist; those are mechanical transforms. For receiver-switch, the same arm silhouette can sit detached on a low travel sled and receive a material overlay; retain a separate fixed actor so the travelling object is unambiguous. No skeleton rig or mixer clip should be claimed.

## Alignment and loading

- Runtime paths intended: `public/models/washer.glb`, `public/models/service-arm.glb` (UI exports complete).
- Each intended normalized machine envelope: approximately 0.9 × 1.5 × 0.9 world units, uniform scale preserving silhouette, minimum y aligned to 0.
- Use authored collision boxes and production-grid state; generated meshes are appearance only.
- Keep at least these two GLBs clearly visible as operating central machines rather than hidden decoration.
- Lead owns renderer/GLTFLoader integration. Art owner owns downloaded models and provenance.

## Final authored mounting

Integrated model-only bounds are uniformly normalized as described. Because the washer's decorative gauges and the painter's base cross a low conveyor volume if placed directly on it, final runtime mounts the washer model at local y1.12 and painter at y1.04 on authored steel/brass supports behind the belt, with nozzles above the workpiece. The washer's top is consequently about2.48world units including its support. This keeps the real generated silhouette visible and crates/arms clear; the generated meshes still do not change grid ports or authoritative colliders. Final actual captures and independent review verified the normal processing routes.
