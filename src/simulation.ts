import { CONTRACTS, type Contract } from "./content";
import {
  applyOperation,
  checkProduct,
  makeProduct,
  type Product,
  type ProductionSpec,
} from "./semantics";
import {
  accepts,
  boardFor,
  canPlace,
  inside,
  key,
  nextCell,
  same,
  type Cell,
  type Tile,
  type Tool,
} from "./grid";
export type Mode = "editing" | "running" | "paused" | "review" | "success";
export interface Piece {
  id: number;
  product: Product;
  cell: Cell;
  from: Cell;
  progress: number;
  dwell: number;
  processed: boolean;
  hops: number;
  blocked: string | null;
}
export interface Delivery {
  product: Product;
  accepted: boolean;
  reasons: string[];
}
export interface LocalEvent {
  type: string;
  challenge: number;
  attempt: number;
  aided: boolean;
  detail?: string;
}
export class Foundry {
  level = 0;
  board = boardFor(0);
  tiles: Tile[] = [];
  pieces: Piece[] = [];
  deliveries: Delivery[] = [];
  mode: Mode = "editing";
  previousMode: Mode = "editing";
  time = 0;
  attempts = 0;
  hints = 0;
  readingSupport = 0;
  variant = false;
  activeText = false;
  events: LocalEvent[] = [];
  nextId = 1;
  spawned = new Map<string, number>();
  spawnClock = 0;
  jam: string | null = null;
  medals: {
    time: number;
    footprint: number;
    attempts: number;
    hints: number;
    readingSupport: number;
  }[] = [];
  constructor() {
    this.load(0);
  }
  get contract(): Contract {
    return CONTRACTS[this.level];
  }
  get spec(): ProductionSpec {
    return this.variant && this.contract.receiverAlternative
      ? this.contract.receiverAlternative.spec
      : this.contract.spec;
  }
  get text(): string {
    return this.variant && this.contract.receiverAlternative
      ? this.contract.receiverAlternative.text
      : this.activeText && this.contract.alternateText
        ? this.contract.alternateText
        : this.contract.text;
  }
  get accepted(): number {
    return this.deliveries.filter((d) => d.accepted).length;
  }
  log(type: string, detail?: string) {
    // Retain decisions/support; routine grid edits must not evict first attempts.
    if (["edit", "remove", "rotate"].includes(type)) return;
    this.events.push({
      type,
      challenge: this.level + 1,
      attempt: this.attempts,
      aided: this.hints > 0 || this.readingSupport > 0,
      detail,
    });
    if (this.events.length > 100) this.events.shift();
  }
  load(index: number) {
    this.level = index;
    this.board = boardFor(index);
    this.tiles = this.board.initial.map((t) => ({ ...t }));
    this.pieces = [];
    this.deliveries = [];
    this.mode = "editing";
    this.attempts = 0;
    this.hints = 0;
    this.readingSupport = 0;
    this.variant = false;
    this.activeText = false;
    this.time = 0;
    this.jam = null;
    this.log("contract");
  }
  place(cell: Cell, kind: Tool, rotation: number) {
    if (this.mode !== "editing" && this.mode !== "review") return false;
    if (!canPlace(this.board, cell)) return false;
    this.tiles = this.tiles.filter((t) => !same(t, cell));
    this.tiles.push({
      ...cell,
      kind,
      rotation:
        ((rotation % (kind === "corner" ? 8 : 4)) +
          (kind === "corner" ? 8 : 4)) %
        (kind === "corner" ? 8 : 4),
    });
    this.log("edit", kind);
    return true;
  }
  remove(cell: Cell) {
    if (this.mode !== "editing" && this.mode !== "review") return;
    this.tiles = this.tiles.filter((t) => !same(t, cell));
    this.log("remove");
  }
  rotate(cell: Cell) {
    if (this.mode !== "editing" && this.mode !== "review") return;
    const tile = this.tiles.find((t) => same(t, cell));
    if (tile) {
      tile.rotation = (tile.rotation + 1) % (tile.kind === "corner" ? 8 : 4);
      this.log("rotate");
    }
  }
  stop() {
    this.mode = "editing";
    this.pieces = [];
    this.spawned.clear();
    this.spawnClock = 0;
    this.jam = null;
    this.log("stop");
  }
  run() {
    if (this.mode === "running") {
      this.stop();
      return;
    }
    if (this.mode === "paused") return;
    this.pieces = [];
    this.deliveries = [];
    this.spawned.clear();
    this.time = 0;
    this.spawnClock = 0;
    this.jam = null;
    this.attempts++;
    this.mode = "running";
    this.log("run");
  }
  pause() {
    if (this.mode === "paused") {
      this.mode = this.previousMode;
      this.log("resume");
    } else {
      this.previousMode = this.mode;
      this.mode = "paused";
      this.log("pause");
    }
  }
  hint() {
    this.hints++;
    this.log("hint");
  }
  toggleReceiver() {
    if (!this.contract.receiverAlternative) return;
    this.stop();
    this.variant = !this.variant;
    this.deliveries = [];
    this.log("changed-receiver", String(this.variant));
  }
  step(dt: number) {
    if (this.mode !== "running") return;
    this.time += dt;
    this.spawnClock -= dt;
    const sources = this.board.sources.filter((s) => {
      const t = this.tiles.find((t) => t.x === 0 && t.z === s.z);
      return t && accepts(t, s);
    });
    if (!sources.length) this.jam = "source";
    if (this.spawnClock <= 0) {
      let did = false;
      for (const source of sources) {
        const n = this.spawned.get(key(source)) ?? 0;
        if (
          n < this.contract.count &&
          !this.pieces.some((p) => p.cell.x === 0 && p.cell.z === source.z)
        ) {
          this.pieces.push({
            id: this.nextId++,
            product: makeProduct(source.receiver),
            cell: { x: 0, z: source.z },
            from: { x: source.x, z: source.z },
            progress: 0,
            dwell: 0,
            processed: false,
            hops: 0,
            blocked: null,
          });
          this.spawned.set(key(source), n + 1);
          did = true;
        }
      }
      if (did) this.spawnClock = 1.05;
    }
    const completed = new Set<number>();
    for (const p of this.pieces) {
      p.blocked = null;
      if (p.progress < 1) {
        p.progress = Math.min(1, p.progress + dt * 1.8);
        continue;
      }
      if (same(p.cell, this.board.exit)) {
        const check = checkProduct(p.product, this.spec);
        this.deliveries.push({ product: p.product, ...check });
        completed.add(p.id);
        this.log(
          check.accepted ? "delivery" : "rejected",
          check.reasons.join(","),
        );
        continue;
      }
      const tile = this.tiles.find((t) => same(t, p.cell));
      if (!tile) {
        p.blocked = "gap";
        continue;
      }
      if (!p.processed) {
        if (tile.kind !== "belt" && tile.kind !== "corner")
          p.product = applyOperation(p.product, tile.kind);
        p.processed = true;
        p.dwell = tile.kind === "belt" || tile.kind === "corner" ? 0.02 : 0.55;
      }
      if (p.dwell > 0) {
        p.dwell -= dt;
        continue;
      }
      const target = nextCell(tile);
      const next = this.tiles.find((t) => same(t, target));
      if (p.hops > 90) {
        p.blocked = "loop";
        continue;
      }
      if (
        !same(target, this.board.exit) &&
        (!inside(this.board, target) ||
          this.board.obstacles.some((o) => same(o, target)) ||
          !next)
      ) {
        p.blocked = "gap";
        continue;
      }
      if (next && !accepts(next, p.cell)) {
        p.blocked = "inlet";
        continue;
      }
      if (
        this.pieces.some(
          (other) =>
            other.id !== p.id &&
            !completed.has(other.id) &&
            same(other.cell, target),
        )
      ) {
        p.blocked = "queue";
        continue;
      }
      p.from = { ...p.cell };
      p.cell = target;
      p.progress = 0;
      p.processed = false;
      p.hops++;
    }
    this.pieces = this.pieces.filter((p) => !completed.has(p.id));
    const blocked = this.pieces.find((p) => p.blocked && p.blocked !== "queue");
    this.jam = blocked?.blocked ?? (sources.length ? null : "source");
    const allFinished =
      sources.length > 0 &&
      this.pieces.length === 0 &&
      sources.every(
        (s) => (this.spawned.get(key(s)) ?? 0) >= this.contract.count,
      );
    if (
      allFinished &&
      this.accepted >= this.contract.count &&
      this.deliveries.every((d) => d.accepted)
    ) {
      this.mode = "success";
      this.medals[this.level] = {
        time: this.time,
        footprint: this.tiles.length,
        attempts: this.attempts,
        hints: this.hints,
        readingSupport: this.readingSupport,
      };
      this.log("success", this.contract.transfer ? "transfer" : "practice");
    } else if (allFinished) {
      this.mode = "review";
      this.log("review");
    }
  }
}
