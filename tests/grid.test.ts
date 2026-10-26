import { test } from "node:test";
import assert from "node:assert/strict";
import { accepts, boardFor, canPlace, traceRoute } from "../src/grid";

test("authored grid collisions reject bolts and bounds", () => {
  const b = boardFor(3);
  assert.equal(canPlace(b, { x: 3, z: 3 }), false);
  assert.equal(canPlace(b, { x: -1, z: 0 }), false);
  assert.equal(canPlace(b, { x: 4, z: 3 }), true);
});
test("straight and corner inlet geometry follows actual direction", () => {
  assert.ok(accepts({ x: 2, z: 2, kind: "wash", rotation: 0 }, { x: 1, z: 2 }));
  assert.equal(
    accepts({ x: 2, z: 2, kind: "wash", rotation: 0 }, { x: 2, z: 1 }),
    false,
  );
  assert.ok(
    accepts({ x: 2, z: 2, kind: "corner", rotation: 1 }, { x: 1, z: 2 }),
  );
  assert.equal(
    accepts({ x: 2, z: 2, kind: "corner", rotation: 0 }, { x: 1, z: 2 }),
    false,
  );
});
test("trace identifies recoverable missing link and rotated machine inlet", () => {
  const b = boardFor(0);
  const tiles = Array.from({ length: 9 }, (_, x) => ({
    x,
    z: 3,
    kind: "belt" as const,
    rotation: 0,
  }));
  assert.equal(traceRoute(b, tiles, b.sources[0]).error, null);
  assert.equal(
    traceRoute(
      b,
      tiles.filter((t) => t.x !== 4),
      b.sources[0],
    ).error,
    "gap",
  );
  tiles[4].rotation = 1;
  assert.equal(traceRoute(b, tiles, b.sources[0]).error, "inlet");
});
