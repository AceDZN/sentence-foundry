# Independent audio UX review

26 October 2026. Stable preview audio build 45187 passed the full desktop/mobile audio flow; combined build 63760 then passed targeted native speech-replay and mobile/industry checks. The reviewer used real UI input and public `audioState`/native media properties, without monkeypatching AudioContext or injecting a win. This is a technical UX review, not a listening judgment of musical taste.

## Passed

- Before any gesture: context locked, no loaded audio buffers/music source/SFX output. First gesture on master mute decoded all 12 files but left context suspended, effective gain zero and SFX count zero.
- After a deliberate foreground gesture: the original 68.571-second track played from one retained source. The real audio playhead advanced independently of deterministic game time.
- Music and machine effects switched independently. With effects off, actual `sfxPlayed` stayed unchanged during editing; enabling effects resumed source creation while music continued.
- Both volume sliders updated independently. Master mute preserved those preferences, suspended the actual context, suppressed SFX and disabled spoken output.
- Dictionary reading and rapid pause cycles suspended AudioContext. Both the audio playhead and production time froze while reading.
- A native local English voice did start. Its reading state reduced effective music gain from 0.234 to 0.04212; Restart canceled speech and cleared ducking.
- Five restarts plus a real, UI-built correct shipment and Next transition retained `musicSourceCount=1` and `musicStarts=1`, with bounded active effects. No additional loop was created.
- Preferences persisted across reload; reload itself left audio locked with no new source before a gesture.
- At 390×844 the mixer, toggles, volume control and master mute fit on screen. Actual touchscreen taps toggled music/effects, adjusted volume and muted output. Desktop/mobile screenshots were opened and inspected.
- All 36 observed MP3 responses returned HTTP 200. No page, console or `audioState.error` errors occurred.

Evidence: `audio-summary.json`, `audio-desktop-mix.png`, `audio-mobile-mix.png` and the named audio state snapshots. Earlier browser-startup/input timing boundaries are archived separately in `audio-startup-boundary/`; the successful run used installed headless shell 1228 with Metal.

## Final combined-build follow-up

Native rapid Speak replay passed with the speech-generation guard: the replacement utterance remained ducked (`reading=true`, gain 0.0702). Master mute canceled native speech and suspended the context. Unmute, another Speak and Restart canceled the new utterance, cleared ducking and retained one music source/start. `audio-speech-summary.json` records the native test as exercised.

Mobile controls were retested with all four local Tripo assets ready: washer, arm, pump and spotlight. Actual touchscreen toggles, volume adjustment and master mute passed; the full UI and canvas captures were opened. The factory wall/windows and rear pump are visible, with the construction grid and mixer controls unobstructed. Evidence: `audio-mobile-summary.json`, `audio-mobile-mix.png` and `audio-mobile-industry-canvas.png`. Both follow-up runs decoded all 12 MP3s with HTTP 200 and no errors.

## Limits

Native background suspension remains unexercised in this headless environment: activating another isolated tab left `document.hidden=false` and `document.hasFocus()=true` before and after. No synthetic focus event is counted as native verification. Explicit pause/read suspension passed, and background/speech cancellation was reviewed in source.

Independent PCM analysis found the original score to be stereo 44.1 kHz, 68.5714 seconds, peak 0.820 and RMS 0.1145. Music and all 11 source cue WAVs had zero full-scale samples (`audio-pcm-metrics.json`). These measurements check level and clipping, not perceived quality or audibility on student devices. The browser used muted headless output; no listening assessment is claimed.

## Reproduce

Run `node tests/audio-browser-review.mjs` against static preview 4233. `SF_REVIEW_URL` and `SF_REVIEW_EXECUTABLE` override the preview and installed browser. `--speech-only` runs the narrow native replay/mute/restart check; `--mobile-only` runs touchscreen mixer checks. `--require-industry` requires both industrial Tripo props ready. These targeted modes preserve the full audio summary.
