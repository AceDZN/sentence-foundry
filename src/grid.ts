import type { Operation, Receiver } from "./semantics";
export type Tool = "belt" | "corner" | Operation;
export interface Cell {
  x: number;
  z: number;
}
export interface Tile extends Cell {
  kind: Tool;
  rotation: number;
}
export interface Port extends Cell {
  receiver: Receiver;
}
export interface Board {
  width: number;
  depth: number;
  sources: Port[];
  exit: Cell;
  obstacles: Cell[];
  initial: Tile[];
}
export const DIRECTIONS = [
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
  { x: 0, z: -1 },
];
export const key = (c: Cell) => `${c.x},${c.z}`;
export const same = (a: Cell, b: Cell) => a.x === b.x && a.z === b.z;
export const inside = (b: Board, c: Cell) =>
  c.x >= 0 && c.x < b.width && c.z >= 0 && c.z < b.depth;
export function boardFor(index: number): Board {
  const width = 9,
    depth = 7;
  const row = index === 4 ? 5 : 3;
  const sources: Port[] =
    index === 2
      ? [
          { x: -1, z: 2, receiver: "crate" },
          { x: -1, z: 4, receiver: "service-arm" },
        ]
      : [{ x: -1, z: row, receiver: index === 4 ? "panel" : "crate" }];
  const obstacles =
    index < 2
      ? []
      : index === 2
        ? [{ x: 4, z: 3 }]
        : index === 3
          ? [
              { x: 3, z: 3 },
              { x: 5, z: 2 },
              { x: 5, z: 4 },
            ]
          : [
              { x: 2, z: 5 },
              { x: 4, z: 3 },
              { x: 6, z: 1 },
            ];
  const initial: Tile[] =
    index === 0
      ? [0, 1, 3, 6, 7, 8].map((x) => ({ x, z: 3, kind: "belt", rotation: 0 }))
      : [];
  if (index === 0)
    initial.push(
      { x: 2, z: 2, kind: "belt", rotation: 2 },
      { x: 4, z: 4, kind: "belt", rotation: 1 },
    );
  return {
    width,
    depth,
    sources,
    exit: { x: 9, z: index === 4 ? 1 : 3 },
    obstacles,
    initial,
  };
}
export function nextCell(tile: Tile): Cell {
  const d = DIRECTIONS[((tile.rotation % 4) + 4) % 4];
  return { x: tile.x + d.x, z: tile.z + d.z };
}
/** Conveyors/machines accept along their axis; elbows accept a perpendicular leg.
 * This is authored grid collision/port geometry, independent of decorative meshes. */
export function accepts(tile: Tile, from: Cell): boolean {
  const dx = from.x - tile.x,
    dz = from.z - tile.z;
  if (Math.abs(dx) + Math.abs(dz) !== 1) return false;
  const out = DIRECTIONS[((tile.rotation % 4) + 4) % 4];
  if (tile.kind === "corner") {
    const incoming =
      DIRECTIONS[((tile.rotation % 4) + (tile.rotation >= 4 ? 3 : 1)) % 4];
    return dx === incoming.x && dz === incoming.z;
  }
  return dx === -out.x && dz === -out.z;
}
export function canPlace(board: Board, cell: Cell): boolean {
  return inside(board, cell) && !board.obstacles.some((o) => same(o, cell));
}
export function traceRoute(
  board: Board,
  tiles: Tile[],
  source: Port,
): { cells: Tile[]; error: string | null } {
  const lookup = new Map(tiles.map((t) => [key(t), t]));
  let from: Cell = source,
    current: Cell = { x: 0, z: source.z };
  const cells: Tile[] = [];
  const visited = new Set<string>();
  for (let i = 0; i < 100; i++) {
    if (same(current, board.exit)) return { cells, error: null };
    if (!inside(board, current)) return { cells, error: "edge" };
    if (board.obstacles.some((o) => same(o, current)))
      return { cells, error: "obstacle" };
    if (visited.has(key(current))) return { cells, error: "loop" };
    const tile = lookup.get(key(current));
    if (!tile) return { cells, error: "gap" };
    if (!accepts(tile, from)) return { cells, error: "inlet" };
    visited.add(key(current));
    cells.push(tile);
    from = current;
    current = nextCell(tile);
  }
  return { cells, error: "loop" };
}
