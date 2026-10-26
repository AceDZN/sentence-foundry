/** Independent route fixtures: no injected product, success flag, or private clock. */
import assert from "node:assert/strict";
import test from "node:test";
import { Foundry } from "../src/simulation";
import {
  DIRECTIONS,
  accepts,
  key,
  traceRoute,
  type Cell,
  type Tile,
} from "../src/grid";
import type { Operation } from "../src/semantics";

function line(points: Cell[]): Cell[] {
  const cells: Cell[] = [];
  for (let p = 0; p < points.length - 1; p++) {
    const a = points[p],
      b = points[p + 1];
    assert.ok(
      a.x === b.x || a.z === b.z,
      "fixture segments must be axis aligned",
    );
    const dx = Math.sign(b.x - a.x),
      dz = Math.sign(b.z - a.z);
    let c = { ...a };
    while (c.x !== b.x || c.z !== b.z) {
      if (!cells.length || key(c) !== key(cells.at(-1)!)) cells.push(c);
      c = { x: c.x + dx, z: c.z + dz };
    }
  }
  const last = points.at(-1)!;
  if (!cells.length || key(cells.at(-1)!) !== key(last)) cells.push(last);
  return cells;
}

const routes: Cell[][][] = [
  [
    line([
      { x: 0, z: 3 },
      { x: 8, z: 3 },
    ]),
    line([
      { x: 0, z: 3 },
      { x: 1, z: 3 },
      { x: 1, z: 1 },
      { x: 7, z: 1 },
      { x: 7, z: 3 },
      { x: 8, z: 3 },
    ]),
  ],
  [
    line([
      { x: 0, z: 3 },
      { x: 8, z: 3 },
    ]),
    line([
      { x: 0, z: 3 },
      { x: 1, z: 3 },
      { x: 1, z: 5 },
      { x: 7, z: 5 },
      { x: 7, z: 3 },
      { x: 8, z: 3 },
    ]),
  ],
  [
    line([
      { x: 0, z: 4 },
      { x: 6, z: 4 },
      { x: 6, z: 3 },
      { x: 8, z: 3 },
    ]),
    line([
      { x: 0, z: 4 },
      { x: 1, z: 4 },
      { x: 1, z: 6 },
      { x: 7, z: 6 },
      { x: 7, z: 3 },
      { x: 8, z: 3 },
    ]),
  ],
  [
    line([
      { x: 0, z: 3 },
      { x: 1, z: 3 },
      { x: 1, z: 1 },
      { x: 7, z: 1 },
      { x: 7, z: 3 },
      { x: 8, z: 3 },
    ]),
    line([
      { x: 0, z: 3 },
      { x: 1, z: 3 },
      { x: 1, z: 5 },
      { x: 7, z: 5 },
      { x: 7, z: 3 },
      { x: 8, z: 3 },
    ]),
  ],
  [
    line([
      { x: 0, z: 5 },
      { x: 1, z: 5 },
      { x: 1, z: 4 },
      { x: 7, z: 4 },
      { x: 7, z: 1 },
      { x: 8, z: 1 },
    ]),
    line([
      { x: 0, z: 5 },
      { x: 1, z: 5 },
      { x: 1, z: 6 },
      { x: 8, z: 6 },
      { x: 8, z: 1 },
    ]),
  ],
];

const orders: Operation[][] = [
  ["wash"],
  ["wash", "paint"],
  ["paint"],
  ["wash", "paint", "label", "pack"],
  ["wash", "pack", "label"],
];

function install(game: Foundry, cells: Cell[], actions: Operation[]) {
  game.tiles = [];
  const source = game.board.sources.find((source) => source.z === cells[0].z)!;
  assert.ok(source, "source exists");
  let machine = 0;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const from = cells[i - 1] ?? source;
    const to = cells[i + 1] ?? game.board.exit;
    let rotation = DIRECTIONS.findIndex(
      (d) => d.x === to.x - c.x && d.z === to.z - c.z,
    );
    assert.notEqual(rotation, -1, "unit movement");
    const inX = c.x - from.x,
      inZ = c.z - from.z;
    const outX = to.x - c.x,
      outZ = to.z - c.z;
    const corner = inX !== outX || inZ !== outZ;
    if (corner) {
      const incoming = DIRECTIONS.findIndex(
        (d) => d.x === from.x - c.x && d.z === from.z - c.z,
      );
      if (incoming === (rotation + 3) % 4) rotation += 4;
      else assert.equal(incoming, (rotation + 1) % 4, "elbow inlet");
    }
    const kind = corner
      ? "corner"
      : i > 0 && machine < actions.length
        ? actions[machine++]
        : "belt";
    assert.equal(game.place(c, kind, rotation), true, `place ${key(c)}`);
  }
  assert.equal(
    machine,
    actions.length,
    "fixture has enough straight machine slots",
  );
  assert.equal(traceRoute(game.board, game.tiles, source).error, null);
}

function runToEnd(game: Foundry, maxSeconds = 90) {
  game.run();
  for (let i = 0; i < maxSeconds * 60 && game.mode === "running"; i++)
    game.step(1 / 60);
}

for (let level = 0; level < 5; level++) {
  test(`independent challenge ${level + 1} has two distinct constructed solutions`, () => {
    for (const cells of routes[level]) {
      const game = new Foundry();
      game.load(level);
      install(game, cells, orders[level]);
      runToEnd(game);
      assert.equal(game.mode, "success", `level ${level + 1} ${game.jam}`);
      assert.equal(game.accepted, game.contract.count);
    }
  });
}

test("a route gap causes a visible jam; stop/edit/restart repairs it", () => {
  const game = new Foundry();
  install(game, routes[0][0], orders[0]);
  game.remove({ x: 6, z: 3 });
  game.run();
  for (let i = 0; i < 15 * 60; i++) game.step(1 / 60);
  assert.equal(game.mode, "running");
  assert.equal(game.jam, "gap");
  assert.equal(game.accepted, 0);
  const blocked = game.pieces.find((piece) => piece.blocked === "gap");
  assert.ok(blocked);
  assert.equal(
    game.place({ x: 6, z: 3 }, "belt", 0),
    false,
    "cannot edit moving line",
  );
  game.stop();
  assert.equal(game.place({ x: 6, z: 3 }, "belt", 0), true);
  runToEnd(game);
  assert.equal(game.mode, "success");
  assert.equal(game.attempts, 2);
});

test("pause freezes travel, operation history, spawning and production time", () => {
  const game = new Foundry();
  install(game, routes[1][0], orders[1]);
  game.run();
  game.step(0.1);
  game.pause();
  const before = JSON.stringify({
    pieces: game.pieces,
    time: game.time,
    spawned: [...game.spawned],
  });
  game.step(20);
  assert.equal(
    JSON.stringify({
      pieces: game.pieces,
      time: game.time,
      spawned: [...game.spawned],
    }),
    before,
  );
  game.pause();
  game.step(0.1);
  assert.ok(game.time > 0.1);
});

test("wrong receiver can be built and painted but cannot fulfill the arm order", () => {
  const game = new Foundry();
  game.load(2);
  const crateRoute = line([
    { x: 0, z: 2 },
    { x: 6, z: 2 },
    { x: 6, z: 3 },
    { x: 8, z: 3 },
  ]);
  install(game, crateRoute, ["paint"]);
  runToEnd(game);
  assert.equal(game.mode, "review");
  assert.equal(game.accepted, 0);
  assert.equal(game.deliveries[0].product.painted, true);
  assert.ok(game.deliveries[0].reasons.includes("receiver:service-arm"));
  game.toggleReceiver();
  runToEnd(game);
  assert.equal(
    game.mode,
    "success",
    "same constructed world works for changed active crate order",
  );
});

test("multiple travelling pieces never occupy one authored grid cell", () => {
  const game = new Foundry();
  game.load(3);
  install(game, routes[3][0], orders[3]);
  game.run();
  let queued = false;
  for (let i = 0; i < 90 * 60 && game.mode === "running"; i++) {
    game.step(1 / 60);
    const occupied = game.pieces.map((piece) => key(piece.cell));
    assert.equal(new Set(occupied).size, occupied.length);
    queued ||= game.pieces.some((piece) => piece.blocked === "queue");
  }
  assert.equal(game.mode, "success");
  assert.ok(
    queued,
    "fixture exercises harmless spacing queue and automatic recovery",
  );
});

test("dual receiver feed must not bypass the requested receiver", () => {
  const game = new Foundry();
  game.load(2);
  const armRoute = routes[2][0];
  install(game, armRoute, ["paint"]);
  const armTiles = [...game.tiles];
  const crateRoute = line([
    { x: 0, z: 2 },
    { x: 6, z: 2 },
    { x: 6, z: 3 },
    { x: 8, z: 3 },
  ]);
  install(game, crateRoute, ["paint"]);
  const byCell = new Map<string, Tile>();
  for (const tile of [...armTiles, ...game.tiles]) byCell.set(key(tile), tile);
  game.tiles = [...byCell.values()];
  const merge = game.tiles.find((tile) => tile.x === 6 && tile.z === 3)!;
  // If the renderer/simulation changes corners to a true one-inlet elbow this
  // exploit is physically impossible; otherwise rejecting wrong output is vital.
  const canMerge =
    accepts(merge, { x: 6, z: 2 }) && accepts(merge, { x: 6, z: 4 });
  assert.equal(canMerge, false, "an elbow has one physical incoming leg");
  game.toggleReceiver(); // crate request: north branch reaches output, south arm remains blocked
  runToEnd(game);
  assert.equal(game.accepted, 1, "requested crate really reaches output");
  assert.notEqual(
    game.mode,
    "success",
    "pending wrong-receiver work cannot be ignored",
  );
});
