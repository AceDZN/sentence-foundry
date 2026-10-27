import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedParentOrigin,
  isWorkbookParentOrigin,
  parseLevelParam,
  initHost,
  postToHost,
  WorkbookSession,
  type HostMessage,
} from "../src/host";
import { Foundry } from "../src/simulation";

test("all 45 canonical deep links select exactly their authored zero-based index", () => {
  for (let n = 1; n <= 45; n++)
    assert.equal(parseLevelParam(`?level=${n}`, 45), n - 1);
  assert.equal(parseLevelParam("?level=45"), 44);
  assert.equal(parseLevelParam("?other=x&level=%34%35"), 44);
});
test("malformed, ambiguous and out-of-range links preserve the saved opening", () => {
  for (const q of [
    "",
    "?level=",
    "?level=0",
    "?level=46",
    "?level=-1",
    "?level=+1",
    "?level=%201",
    "?level=1%20",
    "?level=1.0",
    "?level=3abc",
    "?level=NaN",
    "?level=Infinity",
    "?level=1e1",
    "?level=01",
    "?level=1&level=2",
    "?level=9007199254740993",
  ])
    assert.equal(parseLevelParam(q, 45), null, q);
  for (const count of [0, -1, NaN, Infinity, 1.5])
    assert.equal(parseLevelParam("?level=1", count), null);
  assert.equal(parseLevelParam("?level=46", 100), null);
  assert.equal(parseLevelParam("?level=3", 2), null);
});
test("trusts canonical Workbook HTTPS and loopback HTTP origins with an explicit target", () => {
  for (const o of [
    "https://workbook.co.il",
    "https://english.workbook.co.il",
    "https://english-games.workbook.co.il",
    "https://www.workbook.co.il",
    "http://localhost",
    "http://localhost:4233",
    "http://127.0.0.1:4017",
  ]) {
    assert.equal(allowedParentOrigin(o, "http://localhost:4233"), o);
    assert.equal(isWorkbookParentOrigin(o), true);
  }
});
test("Vercel trust is limited to the exact same-origin preview", () => {
  const own = "https://acedzn-workbook-games-preview-abc.vercel.app";
  assert.equal(allowedParentOrigin(own, own), own);
  assert.equal(isWorkbookParentOrigin(own), false);
  for (const o of [
    "https://another-preview.vercel.app",
    "https://nested.other.vercel.app",
    "https://workbook.co.il.evil.test",
    "https://evilworkbook.co.il",
    "http://english-games.workbook.co.il",
    "https://english.workbook.co.il:8443",
    "https://user@workbook.co.il",
    "https://workbook.co.il/path",
    "https://workbook.co.il/",
    "https://workbook.co.il?x=1",
    "https://example.com",
    "http://192.168.1.3:4233",
    "null",
    "*",
    "",
  ])
    assert.equal(allowedParentOrigin(o, own), null, o);
});

type FakeMessage = { message: unknown; target: string };
function fakeBrowser(
  parentOrigin: string,
  options: {
    standalone?: boolean;
    referrer?: string;
    own?: string;
    noAncestor?: boolean;
  } = {},
  run: (
    messages: FakeMessage[],
    listeners: Map<string, Set<() => void>>,
  ) => void,
) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window"),
    oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const messages: FakeMessage[] = [],
    listeners = new Map<string, Set<() => void>>();
  const parent = {
    postMessage: (message: unknown, target: string) =>
      messages.push({ message, target }),
  };
  const w = {
    parent,
    location: {
      origin: options.own ?? "http://localhost:4233",
      ancestorOrigins: options.noAncestor ? undefined : [parentOrigin],
    },
    addEventListener: (name: string, fn: () => void) => {
      const set = listeners.get(name) ?? new Set();
      set.add(fn);
      listeners.set(name, set);
    },
    removeEventListener: (name: string, fn: () => void) =>
      listeners.get(name)?.delete(fn),
  };
  if (options.standalone) w.parent = w as unknown as typeof parent;
  Object.defineProperty(globalThis, "window", { configurable: true, value: w });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { referrer: options.referrer ?? "" },
  });
  try {
    run(messages, listeners);
  } finally {
    initHost("");
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
}
test("bridge sends the required envelope to a precise parent origin, never star", () => {
  fakeBrowser("https://english-games.workbook.co.il", {}, (messages) => {
    initHost("sentence-foundry");
    postToHost({ type: "level-start", level: 45 });
    assert.deepEqual(messages, [
      {
        message: {
          type: "level-start",
          level: 45,
          source: "workbook-game",
          version: 1,
          slug: "sentence-foundry",
        },
        target: "https://english-games.workbook.co.il",
      },
    ]);
  });
});
test("standalone, unknown and opaque parents post nothing", () => {
  for (const [origin, options] of [
    ["http://localhost:4233", { standalone: true }],
    ["https://evil.test", {}],
    ["null", { referrer: "https://english-games.workbook.co.il/play" }],
    ["", {}],
  ] as const) {
    fakeBrowser(origin, options, (m) => {
      initHost("sentence-foundry");
      postToHost({ type: "ready" });
      assert.deepEqual(m, []);
    });
  }
});
test("referrer fallback and exact same-origin preview use explicit targets", () => {
  fakeBrowser(
    "",
    {
      noAncestor: true,
      referrer: "https://english-games.workbook.co.il/games/sentence-foundry",
    },
    (m) => {
      initHost("sentence-foundry");
      postToHost({ type: "ready" });
      assert.equal(m[0].target, "https://english-games.workbook.co.il");
    },
  );
  const preview = "https://games-stage.vercel.app";
  fakeBrowser(preview, { own: preview }, (m) => {
    initHost("sentence-foundry");
    postToHost({ type: "ready" });
    assert.equal(m[0].target, preview);
  });
});
test("reinitialization installs one generic error reporter without leaking error details", () => {
  fakeBrowser("http://localhost:4233", {}, (m, listeners) => {
    initHost("sentence-foundry");
    initHost("sentence-foundry");
    assert.equal(listeners.get("error")?.size, 1);
    for (const listener of listeners.get("error") ?? []) listener();
    assert.equal(m.length, 1);
    assert.equal((m[0].message as HostMessage).type, "error");
    assert.equal(m[0].target, "http://localhost:4233");
    assert.ok(
      !(m[0].message as { message: string }).message.includes("/Users/"),
    );
  });
});
test("model readiness gates ready/start, completion is unique, and restart preserves ready", () => {
  const messages: HostMessage[] = [],
    s = new WorkbookSession((m) => messages.push(m));
  const sync = (
    ready: boolean,
    level: number,
    complete: boolean,
    durationMs = 1234.6,
  ) => s.sync({ ready, level, complete, durationMs });
  sync(false, 45, false);
  assert.deepEqual(messages, []);
  sync(true, 45, false);
  sync(true, 45, false);
  assert.deepEqual(messages, [
    { type: "ready" },
    { type: "level-start", level: 45 },
  ]);
  sync(true, 45, true);
  sync(true, 45, false);
  sync(true, 45, true);
  assert.deepEqual(messages.at(-1), {
    type: "level-complete",
    level: 45,
    durationMs: 1235,
  });
  assert.equal(messages.length, 3);
  s.restart();
  sync(false, 45, false);
  assert.equal(messages.length, 3);
  sync(true, 45, false);
  sync(true, 45, true, -5);
  assert.deepEqual(messages.slice(-2), [
    { type: "level-start", level: 45 },
    { type: "level-complete", level: 45, durationMs: 0 },
  ]);
  assert.equal(messages.filter((m) => m.type === "ready").length, 1);
  sync(true, 2, false);
  assert.deepEqual(messages.at(-1), { type: "level-start", level: 2 });
});
test("invalid session levels never emit malformed host messages; non-finite duration is normalized", () => {
  const m: HostMessage[] = [],
    s = new WorkbookSession((x) => m.push(x));
  for (const level of [0, 46, NaN, 1.2])
    s.sync({ ready: true, level, complete: true, durationMs: 1 });
  assert.deepEqual(m, []);
  s.sync({ ready: true, level: 1, complete: true, durationMs: NaN });
  assert.deepEqual(m, [
    { type: "ready" },
    { type: "level-start", level: 1 },
    { type: "level-complete", level: 1, durationMs: 0 },
  ]);
});
test("an actual mistaken line, repair, completion and Next report only real gameplay success", () => {
  const sim = new Foundry(),
    m: HostMessage[] = [],
    session = new WorkbookSession((x) => m.push(x));
  const observe = () =>
    session.sync({
      ready: true,
      level: sim.level + 1,
      complete: sim.mode === "success",
      durationMs: sim.time * 1000,
    });
  observe();
  for (const x of [2, 4, 5]) sim.place({ x, z: 3 }, "belt", 0);
  sim.run();
  for (let i = 0; i < 1200 && sim.mode === "running"; i++) {
    sim.step(1 / 60);
    observe();
  }
  assert.equal(sim.mode, "review");
  assert.equal(m.filter((x) => x.type === "level-complete").length, 0);
  sim.stop();
  sim.place({ x: 5, z: 3 }, "wash", 0);
  sim.run();
  for (let i = 0; i < 1200 && sim.mode === "running"; i++) {
    sim.step(1 / 60);
    observe();
  }
  assert.equal(sim.mode, "success");
  observe();
  assert.equal(m.filter((x) => x.type === "level-complete").length, 1);
  const done = m.at(-1);
  assert.equal(done?.type, "level-complete");
  if (done?.type === "level-complete") assert.ok(done.durationMs > 0);
  sim.load(1);
  session.restart();
  observe();
  assert.deepEqual(
    m.map((x) => x.type),
    ["ready", "level-start", "level-complete", "level-start"],
  );
  assert.deepEqual(m.at(-1), { type: "level-start", level: 2 });
});
