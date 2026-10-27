# Brass & Belts

Original Sentence Foundry score and sound design,26October2026. The composition and synthesizer source are included in `scripts/compose-audio.mjs`; compressed masters are local in `public/audio`. No external samples, music-service account or generation credits were used.

## Score

68.5714 seconds,32bars,112BPM,4/4. C-major/A-minor jazz colors move through C6,Am9,Fmaj9,G13 and a Dm7–Em7 bridge. A plucked marimba-like melody, soft electric keys, round bass, woodblock/cog hits and restrained steel percussion form four8bar sections, including a thinner contrasting bridge and a higher final variation. Stereo room reflections are rendered circularly for the loop. There is no continuous noise layer.

Master measured at-18.10LUFS integrated and-2.66dBTP after MP3 encoding. Original PCM peak0.820; no full-scale samples in the score or11 cues. Those measurements check level and clipping, not subjective musical quality. `docs/review/audio-pcm-metrics.json` records the independent numeric checks.

## Cues and runtime mix

13 short local cues cover placement, rotation, removal, start, wash, paint, label, pack, dry, unpack, accepted delivery, recoverable mistake and shipment completion. Machine operation cues fire once for each new observed operation, with a voice cap and short real-time cooldown. They do not create a continuous machinery hiss.

One WebAudio context and one retained music source serve the entire session. Audio starts after a trusted interaction. The mixer has separate music/effects switches and volume sliders; master mute preserves those preferences. Reading/game pause suspends the context and preserves the loop position. Native focus/visibility handlers suspend it in the background. English speech ducks music when it can play; mute, restart, next and backgrounding cancel stale speech. A token guards against old speech callbacks clearing a newer utterance's ducking. A soft master compressor controls simultaneous cue peaks.

Audio is scheduled against real AudioContext time, so deterministic gameplay stepping cannot stack songs or schedule thousands of notes. Repeated restarts and real level transitions were checked with source/start counters remaining1. Audio preferences stay in this browser and contain no student identity.

## Rebuild

With Node and FFmpeg with libmp3lame installed, run:

```sh
node scripts/build-audio.mjs
```

This recreates the deterministic PCM in ignored `work/audio`, then local MP3 masters and SHA256/size manifest `docs/audio-files.json`. Audio is loaded on first interaction; normal game play uses no external music service or API.

Campaign expansion adds two original short synthesized cues for the dryer and unpacker. Existing score and eleven cues are unchanged; the complete 14-file manifest is in `docs/audio-files.json`.
