import { CONTRACTS } from "./content";
import { boardFor, canPlace, key, type Tile } from "./grid";

export interface Completion {
  seconds: number;
  pieces: number;
  attempts: number;
  supported: boolean;
}
export interface CampaignSave {
  version: 1;
  current: string;
  completed: Record<string, Completion>;
  endingVisible?: boolean;
  draft?: { id: string; tiles: Tile[]; variant: boolean; activeText: boolean };
}
export function emptyCampaign(): CampaignSave {
  return { version: 1, current: CONTRACTS[0].id, completed: {} };
}
/** Saved data never supplies a success state or changes an authored contract. */
export function readCampaign(raw: string | null): CampaignSave {
  const result = emptyCampaign();
  if (!raw) return result;
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1) return result;
    if (CONTRACTS.some(c => c.id === data.current)) result.current = data.current;
    for (const contract of CONTRACTS) {
      const score = data.completed?.[contract.id];
      if (score && [score.seconds, score.pieces, score.attempts].every(n => Number.isFinite(n) && n >= 0)) {
        result.completed[contract.id] = {
          seconds: score.seconds, pieces: score.pieces, attempts: score.attempts,
          supported: Boolean(score.supported),
        };
      }
    }
    result.endingVisible = Boolean(data.endingVisible && Object.keys(result.completed).length === CONTRACTS.length);
    const contract = CONTRACTS.find(c => c.id === data.draft?.id);
    if (contract && Array.isArray(data.draft.tiles) && data.draft.tiles.length <= 63) {
      const board = boardFor(contract.layout, contract.spec.receiver);
      const tools = ["belt", "corner", ...contract.availableMachines];
      const cells = new Set<string>();
      const valid = data.draft.tiles.every((tile: Tile) => {
        if (!Number.isInteger(tile.x) || !Number.isInteger(tile.z) || !canPlace(board, tile) || !tools.includes(tile.kind) || !Number.isInteger(tile.rotation) || tile.rotation < 0 || tile.rotation >= (tile.kind === "corner" ? 8 : 4) || cells.has(key(tile))) return false;
        cells.add(key(tile));
        return true;
      });
      if (valid && (!contract.maxPieces || data.draft.tiles.length <= contract.maxPieces)) result.draft = {
        id: contract.id,
        tiles: data.draft.tiles.map((t: Tile) => ({ x: t.x, z: t.z, kind: t.kind, rotation: t.rotation })),
        variant: Boolean(data.draft.variant && contract.receiverAlternative),
        activeText: Boolean(data.draft.activeText && contract.alternateText),
      };
    }
  } catch { /* A damaged save returns the recoverable entries or a fresh campaign. */ }
  return result;
}

export function nextUnfinished(save: CampaignSave, after = -1): number {
  for (let offset = 1; offset <= CONTRACTS.length; offset++) {
    const i = (after + offset) % CONTRACTS.length;
    if (!save.completed[CONTRACTS[i].id]) return i;
  }
  return -1;
}
