import type { Foundry } from "./simulation";
export type Cue =
  | "place"
  | "rotate"
  | "remove"
  | "start"
  | "wash"
  | "paint"
  | "label"
  | "pack"
  | "delivery"
  | "mistake"
  | "success";
const CUES: Cue[] = [
  "place",
  "rotate",
  "remove",
  "start",
  "wash",
  "paint",
  "label",
  "pack",
  "delivery",
  "mistake",
  "success",
];
const read = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};
const clamp = (v: number) => Math.max(0, Math.min(1, v));
/** One context and one music source for the lifetime of the game. Audio uses
 * real AudioContext time; deterministic game stepping cannot multiply loops. */
export class FoundryAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private music: AudioBufferSourceNode | null = null;
  private loading: Promise<void> | null = null;
  private startedAt = 0;
  private lastCue = new Map<Cue, number>();
  private operationCursor = new Map<number, number>();
  private voices = new Set<AudioBufferSourceNode>();
  private syncing = false;
  private resync = false;
  private error = "";
  unlocked = false;
  paused = false;
  background = false;
  reading = false;
  musicStarts = 0;
  sfxPlayed = 0;
  muted = read("sf-mute", "false") === "true";
  musicEnabled = read("sf-music", "true") !== "false";
  effectsEnabled = read("sf-effects", "true") !== "false";
  musicVolume = clamp(Number(read("sf-music-volume", "0.5")));
  effectsVolume = clamp(Number(read("sf-effects-volume", "0.65")));
  async unlock() {
    this.unlocked = true;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.78;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 6;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.09;
        this.master.connect(limiter);
        limiter.connect(this.context.destination);
        this.musicGain = this.context.createGain();
        this.effectsGain = this.context.createGain();
        this.musicGain.connect(this.master);
        this.effectsGain.connect(this.master);
        this.setLevels();
        void this.sync();
      }
      if (!this.muted && !this.paused && !this.background)
        await this.context.resume();
      this.loading ??= this.load();
      await this.loading;
      this.startMusic();
      void this.sync();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    }
  }
  private async load() {
    const context = this.context!;
    await Promise.all(
      ["brass-and-belts", ...CUES].map(async (name) => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}audio/${name}.mp3`,
        );
        if (!response.ok) throw new Error(`Audio ${name}: ${response.status}`);
        const buffer = await context.decodeAudioData(
          await response.arrayBuffer(),
        );
        this.buffers.set(name, buffer);
      }),
    );
  }
  private startMusic() {
    if (this.music || !this.context || !this.musicGain) return;
    const buffer = this.buffers.get("brass-and-belts");
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = buffer.duration;
    source.connect(this.musicGain);
    source.start();
    this.music = source;
    this.startedAt = this.context.currentTime;
    this.musicStarts++;
  }
  private setLevels() {
    const at = this.context?.currentTime ?? 0;
    this.master?.gain.setTargetAtTime(this.muted ? 0 : 0.78, at, 0.02);
    this.musicGain?.gain.setTargetAtTime(
      this.musicEnabled ? this.musicVolume * (this.reading ? 0.18 : 1) : 0,
      at,
      0.12,
    );
    this.effectsGain?.gain.setTargetAtTime(
      this.effectsEnabled ? this.effectsVolume : 0,
      at,
      0.025,
    );
  }
  private async sync() {
    this.setLevels();
    if (!this.context) return;
    if (this.syncing) {
      this.resync = true;
      return;
    }
    this.syncing = true;
    try {
      const suspend = this.muted || this.paused || this.background;
      if (suspend && this.context.state === "running")
        await this.context.suspend();
      else if (!suspend && this.unlocked && this.context.state === "suspended")
        await this.context.resume();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.syncing = false;
      if (this.resync) {
        this.resync = false;
        void this.sync();
      }
    }
  }
  setMuted(value: boolean) {
    this.muted = value;
    write("sf-mute", String(value));
    void this.sync();
  }
  setMusicEnabled(value: boolean) {
    this.musicEnabled = value;
    write("sf-music", String(value));
    this.setLevels();
  }
  setEffectsEnabled(value: boolean) {
    this.effectsEnabled = value;
    write("sf-effects", String(value));
    this.setLevels();
  }
  setMusicVolume(value: number) {
    this.musicVolume = clamp(value);
    write("sf-music-volume", String(this.musicVolume));
    this.setLevels();
  }
  setEffectsVolume(value: number) {
    this.effectsVolume = clamp(value);
    write("sf-effects-volume", String(this.effectsVolume));
    this.setLevels();
  }
  setPaused(value: boolean) {
    if (this.paused === value) return;
    this.paused = value;
    void this.sync();
  }
  setBackground(value: boolean) {
    if (this.background === value) return;
    this.background = value;
    void this.sync();
  }
  setReading(value: boolean) {
    if (this.reading === value) return;
    this.reading = value;
    this.setLevels();
  }
  play(cue: Cue, level = 1) {
    const context = this.context,
      buffer = this.buffers.get(cue);
    if (
      !context ||
      context.state !== "running" ||
      this.muted ||
      this.paused ||
      this.background ||
      !this.effectsEnabled ||
      !buffer ||
      this.effectsVolume === 0
    )
      return;
    const last = this.lastCue.get(cue) ?? -Infinity;
    if (context.currentTime - last < 0.06 || this.voices.size >= 12) return;
    this.lastCue.set(cue, context.currentTime);
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = clamp(level);
    source.connect(gain);
    gain.connect(this.effectsGain!);
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
    this.sfxPlayed++;
  }
  observe(sim: Foundry) {
    this.setPaused(sim.mode === "paused");
    for (const piece of sim.pieces) {
      const n = this.operationCursor.get(piece.id) ?? 0;
      for (const event of piece.product.history.slice(n))
        this.play(event.action, 0.62);
      this.operationCursor.set(piece.id, piece.product.history.length);
    }
  }
  resetRun() {
    this.operationCursor.clear();
  }
  state() {
    const running =
      this.context?.state === "running" &&
      !this.muted &&
      !this.paused &&
      !this.background;
    return {
      unlocked: this.unlocked,
      contextState: this.context?.state ?? "locked",
      loadedCues: this.buffers.size,
      musicLoaded: this.buffers.has("brass-and-belts"),
      musicEnabled: this.musicEnabled,
      effectsEnabled: this.effectsEnabled,
      muted: this.muted,
      musicVolume: this.musicVolume,
      effectsVolume: this.effectsVolume,
      paused: this.paused,
      background: this.background,
      reading: this.reading,
      effectiveMusicGain:
        running && this.musicEnabled
          ? this.musicVolume * (this.reading ? 0.18 : 1) * 0.78
          : 0,
      activeMusicLoops:
        running && this.musicEnabled && this.musicVolume > 0 && this.music
          ? 1
          : 0,
      musicSourceCount: this.music ? 1 : 0,
      musicStarts: this.musicStarts,
      sfxPlayed: this.sfxPlayed,
      activeEffects: this.voices.size,
      musicSeconds: this.music?.buffer?.duration ?? 0,
      playhead:
        this.music?.buffer && this.context
          ? (this.context.currentTime - this.startedAt) %
            this.music.buffer.duration
          : 0,
      error: this.error,
    };
  }
}
