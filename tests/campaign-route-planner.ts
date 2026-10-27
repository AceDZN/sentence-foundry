/** Test-only geometry search. No route or recipe is bundled into the game. */
import { DIRECTIONS, canPlace, key, same, type Board, type Cell, type Tile } from "../src/grid";
import type { Operation, Receiver } from "../src/semantics";

export function planRoute(board: Board, receiver: Receiver, actions: Operation[], maxPieces = 31): Tile[] {
  const source = board.sources.find(s => s.receiver === receiver);
  if (!source) throw new Error(`No source for ${receiver}`);
  const start = {x:0,z:source.z};
  const end = {x:board.width-1,z:board.exit.z};
  const distance = (a:Cell,b:Cell) => Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
  let solution: Cell[] | undefined;
  const path:Cell[] = [start];
  const visited = new Set([key(start)]);
  const straightCount = (cells:Cell[]) => cells.filter((c,i) => {
    if (!i) return false;
    const before = cells[i-1], after = cells[i+1] ?? board.exit;
    return c.x-before.x===after.x-c.x && c.z-before.z===after.z-c.z;
  }).length;
  let examined = 0;
  function search(limit:number):boolean {
    if (++examined > 2_000_000) return false;
    const current = path.at(-1)!;
    if (same(current,end)) {
      if (straightCount(path) >= actions.length) { solution = [...path]; return true; }
      return false;
    }
    if (path.length + distance(current,end) > limit) return false;
    const options = DIRECTIONS.map(d=>({x:current.x+d.x,z:current.z+d.z})).filter(c=>canPlace(board,c)&&!visited.has(key(c))).sort((a,b)=>distance(a,end)-distance(b,end));
    for (const cell of options) {
      visited.add(key(cell)); path.push(cell);
      if (search(limit)) return true;
      path.pop(); visited.delete(key(cell));
    }
    return false;
  }
  for (let length = distance(start,end)+1; length <= maxPieces; length += 2) {
    examined = 0;
    if (search(length)) break;
  }
  if (!solution) throw new Error(`No route for ${actions.join(",")} in ${maxPieces} cells`);
  let operation = 0;
  return solution.map((cell,i,cells) => {
    const from = cells[i-1] ?? source, to = cells[i+1] ?? board.exit;
    let rotation = DIRECTIONS.findIndex(d=>d.x===to.x-cell.x&&d.z===to.z-cell.z);
    const corner = cell.x-from.x!==to.x-cell.x || cell.z-from.z!==to.z-cell.z;
    if (corner) {
      const incoming = DIRECTIONS.findIndex(d=>d.x===from.x-cell.x&&d.z===from.z-cell.z);
      if (incoming===(rotation+3)%4) rotation+=4;
    }
    return {...cell,kind:corner?"corner":i>0&&operation<actions.length?actions[operation++]:"belt",rotation};
  });
}
