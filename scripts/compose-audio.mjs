/** Original Sentence Foundry composition and sound design. Deterministic synthesis;
 * no external samples. Run node scripts/compose-audio.mjs; encode with ffmpeg. */
import fs from "node:fs";
const SR = 44100,
  BPM = 112,
  beat = 60 / BPM,
  bars = 32,
  frames = Math.round(bars * 4 * beat * SR);
const left = new Float32Array(frames),
  right = new Float32Array(frames);
let seed = 74191;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function note(target, start, duration, midi, volume, voice = "pluck", pan = 0) {
  const [L, R] = target,
    N = L.length,
    offset = Math.round(start * SR),
    length = Math.round(duration * SR),
    freq = hz(midi),
    lg = Math.sqrt((1 - pan) / 2),
    rg = Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < length; i++) {
    const t = i / SR,
      u = t / duration,
      attack = 1 - Math.exp(-t * 220);
    let x = 0;
    if (voice === "pluck") {
      const e = Math.exp(-t * 7);
      x =
        attack *
        (Math.sin(2 * Math.PI * freq * t) * e +
          0.32 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-t * 16) +
          0.09 * Math.sin(2 * Math.PI * freq * 5.4 * t) * Math.exp(-t * 25));
    } else if (voice === "keys") {
      x =
        attack *
        Math.exp(-t * 2.7) *
        (Math.sin(2 * Math.PI * freq * t) +
          0.22 * Math.sin(2 * Math.PI * freq * 2.004 * t) * Math.exp(-t * 3) +
          0.08 * Math.sin(2 * Math.PI * freq * 3 * t));
    } else if (voice === "bass") {
      x =
        (1 - Math.exp(-t * 150)) *
        Math.exp(-t * 4) *
        (Math.sin(2 * Math.PI * freq * t) +
          0.24 * Math.sin(2 * Math.PI * freq * 2 * t) +
          0.08 * Math.sin(2 * Math.PI * freq * 3 * t));
    } else if (voice === "bell") {
      x =
        attack *
        Math.exp(-t * 3.5) *
        (Math.sin(2 * Math.PI * freq * t) +
          0.25 * Math.sin(2 * Math.PI * freq * 2.005 * t) * Math.exp(-t * 5));
    }
    const tail = Math.min(1, (1 - u) * 50);
    const idx = (((offset + i) % N) + N) % N;
    L[idx] += x * volume * lg * tail;
    R[idx] += x * volume * rg * tail;
  }
}
function hit(target, start, kind, gain = 1, pan = 0) {
  const [L, R] = target,
    N = L.length,
    offset = Math.round(start * SR),
    duration = kind === "kick" ? 0.21 : kind === "wood" ? 0.075 : 0.045;
  const lg = Math.sqrt((1 - pan) / 2),
    rg = Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < duration * SR; i++) {
    const t = i / SR;
    let x;
    if (kind === "kick") {
      const phase = 2 * Math.PI * (48 * t + 9 * (1 - Math.exp(-t * 24)));
      x =
        Math.sin(phase) * Math.exp(-t * 23) * (1 - Math.exp(-t * 1000)) * 0.34;
    } else if (kind === "wood") {
      x =
        (Math.sin(2 * Math.PI * 805 * t) +
          0.35 * Math.sin(2 * Math.PI * 1741 * t)) *
        Math.exp(-t * 75) *
        (1 - Math.exp(-t * 2500)) *
        0.15;
    } else {
      x =
        (Math.sin(2 * Math.PI * 6211 * t) +
          0.35 * Math.sin(2 * Math.PI * 8333 * t) +
          0.25 * Math.sin(2 * Math.PI * 10477 * t)) *
        Math.exp(-t * 140) *
        (1 - Math.exp(-t * 2800)) *
        0.043;
    }
    const idx = (offset + i + N) % N;
    L[idx] += x * gain * lg;
    R[idx] += x * gain * rg;
  }
}
// C6 / Am9 / Fmaj9 / G13, with a contrasting Dm7–Em7 bridge.
const chords = [
  [48, 52, 55, 57],
  [45, 48, 52, 59],
  [41, 45, 48, 55],
  [43, 47, 50, 57],
  [50, 53, 57, 60],
  [52, 55, 59, 62],
  [41, 45, 48, 55],
  [43, 47, 50, 53],
];
const melody = [
  [
    [0, 76],
    [0.75, 79],
    [1.5, 81],
    [2.5, 79],
    [3.25, 76],
  ],
  [
    [0.5, 76],
    [1.25, 74],
    [2, 72],
    [3, 71],
  ],
  [
    [0, 72],
    [1.5, 76],
    [2.25, 79],
    [3.5, 76],
  ],
  [
    [0.5, 74],
    [1, 76],
    [2.5, 74],
    [3.25, 71],
  ],
  [
    [0, 77],
    [0.75, 81],
    [2, 79],
    [3, 77],
  ],
  [
    [0.5, 79],
    [1.25, 83],
    [2.5, 81],
    [3.5, 79],
  ],
  [
    [0, 76],
    [1.5, 74],
    [2.25, 72],
  ],
  [
    [0.5, 74],
    [1.25, 71],
    [2.5, 67],
    [3.5, 71],
  ],
];
for (let bar = 0; bar < bars; bar++) {
  const section = Math.floor(bar / 8),
    ci = bar % 8,
    chord = chords[ci],
    base = bar * 4 * beat;
  for (const pos of [0, 1.5, 2.75])
    for (let k = 0; k < chord.length; k++)
      note(
        [left, right],
        base + pos * beat + k * 0.009,
        0.9,
        chord[k] + 12,
        0.052,
        "keys",
        -0.32,
      );
  for (const [pos, interval] of [
    [0, 0],
    [1.5, 12],
    [2, 7],
    [3.25, 12],
  ])
    note(
      [left, right],
      base + pos * beat,
      0.39,
      chord[0] - 12 + interval,
      0.15,
      "bass",
      0.05,
    );
  for (const pos of [0, 2, 3.5])
    hit([left, right], base + pos * beat, "kick", pos === 3.5 ? 0.32 : 0.75);
  for (const pos of [1, 3])
    hit([left, right], base + pos * beat, "wood", 0.62, 0.22);
  for (let n = 0; n < 8; n++)
    hit(
      [left, right],
      base + (n * 0.5 + (n % 2 ? 0.035 : 0)) * beat,
      "steel",
      n % 2 ? 0.63 : 0.36,
      n % 2 ? 0.5 : -0.45,
    );
  if (section !== 2 || ci % 2 === 0)
    for (const [pos, m] of melody[ci])
      note(
        [left, right],
        base + pos * beat + (random() - 0.5) * 0.009,
        0.62,
        m + (section === 3 && ci < 4 ? 12 : 0),
        section === 3 ? 0.105 : 0.12,
        "pluck",
        0.25,
      );
  if (section === 2)
    for (const pos of [0.75, 2.25, 3.5])
      note(
        [left, right],
        base + pos * beat,
        0.42,
        chord[(Math.floor(pos) * 2) % 4] + 24,
        0.065,
        "bell",
        -0.42,
      );
  if (bar % 8 === 7) {
    note([left, right], base + 3.75 * beat, 0.9, 84, 0.07, "bell", -0.2);
    hit([left, right], base + 3.75 * beat, "wood", 0.35, -0.2);
  }
}
// Short stereo room reflections and a quiet rhythmic answer, circular for a seamless loop.
for (const [delay, amount] of [
  [0.087, 0.1],
  [0.173, 0.065],
  [beat * 0.75, 0.055],
]) {
  const n = Math.round(delay * SR);
  const a = left.slice(),
    b = right.slice();
  for (let i = 0; i < frames; i++) {
    left[(i + n) % frames] += b[i] * amount;
    right[(i + n) % frames] += a[i] * amount;
  }
}
function wav(path, L, R, normalize = 0.8) {
  let peak = 0,
    sum = 0;
  for (let i = 0; i < L.length; i++) {
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    sum += L[i] ** 2 + R[i] ** 2;
  }
  const factor = normalize / Math.max(peak, 0.001),
    bytes = Buffer.alloc(44 + L.length * 4);
  bytes.write("RIFF");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(SR, 24);
  bytes.writeUInt32LE(SR * 4, 28);
  bytes.writeUInt16LE(4, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(L.length * 4, 40);
  for (let i = 0; i < L.length; i++) {
    bytes.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, L[i] * factor)) * 32767),
      44 + i * 4,
    );
    bytes.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, R[i] * factor)) * 32767),
      46 + i * 4,
    );
  }
  fs.writeFileSync(path, bytes);
  return {
    path,
    seconds: L.length / SR,
    peakBefore: peak,
    rmsBefore: Math.sqrt(sum / (L.length * 2)),
    frames: L.length,
  };
}
fs.mkdirSync("work/audio", { recursive: true });
fs.mkdirSync("public/audio", { recursive: true });
const report = [wav("work/audio/brass-and-belts.wav", left, right, 0.82)];
function sfx(name, seconds, fn) {
  const n = Math.ceil(seconds * SR),
    L = new Float32Array(n),
    R = new Float32Array(n);
  fn([L, R]);
  report.push(wav(`work/audio/${name}.wav`, L, R, 0.7));
}
sfx("place", 0.15, (t) => {
  hit(t, 0.0, "wood", 1);
  note(t, 0.01, 0.12, 72, 0.15, "pluck");
});
sfx("rotate", 0.18, (t) => {
  hit(t, 0.0, "steel", 1);
  note(t, 0.015, 0.16, 79, 0.2, "bell");
});
sfx("remove", 0.17, (t) => {
  hit(t, 0, "wood", 0.8);
  note(t, 0, 0.16, 55, 0.15, "bass");
});
sfx("start", 0.42, (t) => {
  [48, 55, 60].forEach((m, i) => note(t, i * 0.075, 0.25, m, 0.16, "keys"));
});
sfx("wash", 0.36, (t) => {
  [76, 79, 84, 88].forEach((m, i) =>
    note(t, i * 0.045, 0.16, m, 0.18, "bell", i * 0.2 - 0.3),
  );
});
sfx("paint", 0.25, (t) => {
  [67, 74, 79].forEach((m, i) =>
    note(t, i * 0.045, 0.14, m, 0.2, "pluck", 0.15),
  );
  hit(t, 0.02, "steel", 0.7);
});
sfx("label", 0.22, (t) => {
  hit(t, 0.0, "wood", 1);
  note(t, 0.025, 0.16, 84, 0.16, "bell");
});
sfx("pack", 0.28, (t) => {
  hit(t, 0, "kick", 1);
  hit(t, 0.075, "wood", 0.8);
  note(t, 0.09, 0.15, 60, 0.13, "pluck");
});
sfx("delivery", 0.58, (t) => {
  [72, 76, 79].forEach((m, i) =>
    note(t, i * 0.1, 0.3, m, 0.19, "bell", i * 0.25 - 0.25),
  );
});
sfx("mistake", 0.4, (t) => {
  [67, 62].forEach((m, i) => note(t, i * 0.11, 0.22, m, 0.18, "pluck"));
});
sfx("success", 1.2, (t) => {
  [72, 76, 79, 84].forEach((m, i) =>
    note(t, i * 0.13, 0.55, m, 0.17, "bell", i * 0.15 - 0.2),
  );
});
fs.writeFileSync(
  "work/audio/render-metrics.json",
  JSON.stringify(
    {
      title: "Brass & Belts",
      bpm: BPM,
      bars,
      original: true,
      method: "deterministic original composition and synthesis",
      report,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    title: "Brass & Belts",
    seconds: frames / SR,
    notes: "32 bars at112 BPM; stereo original synthesis;11 effect cues",
  }),
);
