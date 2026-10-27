/** Workbook games bridge. Standalone pages never post; embedded pages use an
 * explicit, validated immediate-parent origin rather than a wildcard target. */
export type HostMessage =
  | { type: "ready" }
  | { type: "level-start"; level: number }
  | { type: "level-complete"; level: number; durationMs: number }
  | { type: "error"; message: string };

const LEVEL_COUNT = 45;

/** Returns an explicit canonical origin, or null. A Vercel preview is trusted
 * only when its parent and iframe have exactly the same origin. */
export function allowedParentOrigin(
  origin: string,
  ownOrigin: string,
): string | null {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.origin !== origin || url.username || url.password) return null;
  const workbook =
    url.protocol === "https:" &&
    url.port === "" &&
    /^(?:[a-z0-9-]+\.)*workbook\.co\.il$/.test(url.hostname);
  const local =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  const samePreview =
    origin === ownOrigin &&
    url.protocol === "https:" &&
    url.port === "" &&
    /^[a-z0-9-]+\.vercel\.app$/.test(url.hostname);
  return workbook || local || samePreview ? origin : null;
}

export function isWorkbookParentOrigin(origin: string): boolean {
  return allowedParentOrigin(origin, "") !== null;
}

/** A canonical 1-based ?level=N becomes a zero-based authored contract index.
 * Ambiguous duplicates, signs, whitespace, decimals and out-of-range values
 * preserve the normal saved-game opening by returning null. */
export function parseLevelParam(
  search: string,
  levelCount = LEVEL_COUNT,
): number | null {
  if (!Number.isSafeInteger(levelCount) || levelCount < 1) return null;
  const values = new URLSearchParams(search).getAll("level");
  if (values.length !== 1 || !/^[1-9]\d*$/.test(values[0])) return null;
  const n = Number(values[0]);
  return Number.isSafeInteger(n) && n <= Math.min(levelCount, LEVEL_COUNT)
    ? n - 1
    : null;
}

let slug = "";
let targetOrigin: string | null = null;
let errorWindow: Window | null = null;
let errorListener: (() => void) | null = null;

function parentOrigin(): string | null {
  if (typeof window === "undefined" || window.parent === window) return null;
  let origin = "";
  try {
    origin = window.location.ancestorOrigins?.[0] ?? "";
  } catch {
    /* referrer fallback */
  }
  if (!origin && typeof document !== "undefined" && document.referrer) {
    try {
      origin = new URL(document.referrer).origin;
    } catch {
      return null;
    }
  }
  return allowedParentOrigin(origin, window.location.origin);
}

export function initHost(gameSlug: string): void {
  if (errorWindow && errorListener)
    errorWindow.removeEventListener("error", errorListener);
  errorWindow = null;
  errorListener = null;
  slug = gameSlug.trim();
  targetOrigin = slug ? parentOrigin() : null;
  if (!targetOrigin || typeof window === "undefined") return;
  errorWindow = window;
  errorListener = () =>
    postToHost({
      type: "error",
      message:
        "Sentence Foundry could not continue. Reload the game to try again.",
    });
  window.addEventListener("error", errorListener);
}

export function postToHost(message: HostMessage): void {
  if (
    !targetOrigin ||
    typeof window === "undefined" ||
    window.parent === window
  )
    return;
  window.parent.postMessage(
    { ...message, source: "workbook-game", version: 1, slug },
    targetOrigin,
  );
}

/** One ready event per document. A restart starts a fresh level entry without
 * pretending that models became ready again or replaying an old completion. */
export class WorkbookSession {
  private readySent = false;
  private level: number | null = null;
  private completeSent = false;
  constructor(private readonly send: (message: HostMessage) => void) {}
  restart(): void {
    this.level = null;
    this.completeSent = false;
  }
  sync(state: {
    ready: boolean;
    level: number;
    complete: boolean;
    durationMs: number;
  }): void {
    if (
      !state.ready ||
      !Number.isInteger(state.level) ||
      state.level < 1 ||
      state.level > LEVEL_COUNT
    )
      return;
    if (!this.readySent) {
      this.readySent = true;
      this.send({ type: "ready" });
    }
    if (this.level !== state.level) {
      this.level = state.level;
      this.completeSent = false;
      this.send({ type: "level-start", level: state.level });
    }
    if (state.complete && !this.completeSent) {
      this.completeSent = true;
      this.send({
        type: "level-complete",
        level: state.level,
        durationMs: Number.isFinite(state.durationMs)
          ? Math.max(0, Math.round(state.durationMs))
          : 0,
      });
    }
  }
}
