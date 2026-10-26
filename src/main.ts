import "./style.css";
import { Foundry } from "./simulation";
import { Workshop } from "./workshop";
import {
  CONTRACTS,
  TOOL_DESCRIPTIONS,
  VOCABULARY,
  validateContracts,
} from "./content";
import type { Cell, Tile, Tool } from "./grid";
import { key } from "./grid";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const sim = new Foundry();
let tool: Tool = "belt",
  rotation = 0,
  selected: Cell | null = null,
  moveFrom: Cell | null = null,
  editMode: "place" | "move" | "erase" = "place";
let muted = localStorage.getItem("sf-mute") === "true",
  reduced =
    localStorage.getItem("sf-motion") === "true" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
let audio: AudioContext | null = null,
  manualUntil = 0,
  last = performance.now(),
  lastUi = "",
  lastDeliveries = 0,
  lastMode = "",
  dialogPaused = false;
let workshop: Workshop;
const symbols: Record<Tool, string> = {
  belt: "➜",
  corner: "↳",
  wash: "◈",
  paint: "⚒",
  label: "▤",
  pack: "▣",
};
const labels: Record<Tool, string> = {
  belt: "Belt",
  corner: "Corner",
  wash: "Cleaning arm",
  paint: "Painter",
  label: "Label press",
  pack: "Packer",
};
function sound(
  note = 440,
  duration = 0.08,
  type: OscillatorType = "sine",
  volume = 0.045,
) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(note, audio.currentTime);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch {
    /* Sound is optional. */
  }
}
function selectTool(next: Tool) {
  tool = next;
  rotation = 0;
  selected = null;
  moveFrom = null;
  editMode = "place";
  sound(330, 0.035, "triangle");
  refresh(true);
}
function clickCell(cell: Cell) {
  if (sim.mode !== "editing" && sim.mode !== "review") return;
  selected = cell;
  if (editMode === "erase") {
    sim.remove(cell);
    sound(180, 0.05, "triangle");
  } else if (editMode === "move") {
    if (!moveFrom) {
      if (sim.tiles.some((t) => key(t) === key(cell))) moveFrom = cell;
    } else {
      const tile = sim.tiles.find((t) => key(t) === key(moveFrom!));
      if (tile && sim.place(cell, tile.kind, tile.rotation)) {
        if (key(moveFrom) !== key(cell)) sim.remove(moveFrom);
        moveFrom = null;
        sound(380, 0.06, "triangle");
      }
    }
  } else if (sim.place(cell, tool, rotation)) {
    sound(300 + (cell.x % 3) * 60, 0.045, "triangle");
  }
  refresh(true);
}
function rotate() {
  if (sim.mode !== "editing" && sim.mode !== "review") return;
  const tile = selected && sim.tiles.find((t) => key(t) === key(selected!));
  if (tile) {
    sim.rotate(tile);
    rotation = tile.rotation;
    tool = tile.kind;
  } else rotation = (rotation + 1) % (tool === "corner" ? 8 : 4);
  sound(480, 0.035, "triangle");
  refresh(true);
}
function buildPalette() {
  const order: Tool[] =
    sim.level % 2 === 0
      ? ["belt", "corner", "wash", "paint", "label", "pack"]
      : ["belt", "corner", "paint", "pack", "wash", "label"];
  $("palette").innerHTML = order
    .map(
      (kind, i) =>
        `<button data-tool="${kind}" aria-label="${labels[kind]}" aria-pressed="${tool === kind}"><kbd>${i + 1}</kbd><span class="symbol">${symbols[kind]}</span><small lang="en">${labels[kind]}</small></button>`,
    )
    .join("");
  document
    .querySelectorAll<HTMLButtonElement>("[data-tool]")
    .forEach((b) => (b.onclick = () => selectTool(b.dataset.tool as Tool)));
}
function describeRejection() {
  const d = sim.deliveries.find((d) => !d.accepted);
  if (!d) return "";
  if (d.reasons.some((r) => r.startsWith("receiver:")))
    return "נשלח חפץ אחר מזה שבהזמנה. עצרו ונתבו את הכניסה המתאימה.";
  if (d.reasons.includes("final:labelled") && !d.product.labelled)
    return "התווית נשטפה או כוסתה בצבע. עצרו והעבירו מכונה.";
  if (
    d.reasons.includes("final:labelSurface") &&
    d.product.labelSurface === "item" &&
    d.product.packed
  )
    return "התווית נמצאת בתוך האריזה. בדקו מתי היא הוצמדה.";
  if (d.reasons.includes("final:painted"))
    return "מצב הצבע אינו מתאים להזמנה. שימו לב למה קרה בדרך.";
  if (d.reasons.includes("final:labelled"))
    return "התווית נשטפה או כוסתה בצבע. עצרו והעבירו מכונה.";
  return "התוצר או סדר הפעולות אינם מתאימים. עצרו, בדקו את התוצר ותקנו את המסלול.";
}
function status() {
  if (sim.mode === "paused") return "מושהה · אפשר לקרוא ולתכנן בלי קנס זמן";
  if (moveFrom) return "בחרו משבצת להעברת החלק · R מסובב את החלק";
  if (sim.mode === "success")
    return "המשלוח התקבל! אפשר לשפר את השטח או להמשיך להזמנה הבאה.";
  if (sim.mode === "review") return describeRejection();
  if (sim.jam === "source")
    return "אין כניסה מחוברת. עצרו וחברו מסוע לאחד החפצים.";
  if (sim.jam) return "הקו נעצר בחיבור. עצרו ובדקו פער, כיוון או כניסה למכונה.";
  if (sim.mode === "running")
    return `המסועים עובדים · התקבלו ${sim.accepted} מתוך ${sim.contract.count}`;
  return sim.level === 0
    ? "בנו מסלול לפי ההזמנה. חלקים אפשר להעביר, לסובב או להחליף."
    : "קראו את ההזמנה ובנו מסלול. עצירה מחזירה לעריכה.";
}
function refresh(force = false) {
  const signature = [
    sim.level,
    sim.mode,
    sim.variant,
    sim.activeText,
    sim.accepted,
    sim.deliveries.length,
    sim.jam,
    tool,
    rotation,
    editMode,
    moveFrom && key(moveFrom),
    sim.tiles.length,
    muted,
    reduced,
  ].join("|");
  if (!force && signature === lastUi) return;
  lastUi = signature;
  $("level-label").textContent =
    `הזמנה ${sim.level + 1} / 5 · ${sim.contract.titleHe}`;
  $("order").textContent = sim.text;
  $("quantity").textContent =
    `יעד: ${sim.contract.count} תוצרים · התקבלו ${sim.accepted}`;
  $("paraphrase").hidden = !sim.contract.alternateText;
  $("receiver").hidden = !sim.contract.receiverAlternative;
  $("paraphrase").textContent = sim.activeText ? "ניסוח סביל" : "ניסוח פעיל";
  $("status-text").textContent = status();
  $("build-size").textContent = `${sim.tiles.length} חלקים`;
  $("run").classList.toggle("running", sim.mode === "running");
  $("run").querySelector("span")!.textContent =
    sim.mode === "running" ? "עצירה ועריכה" : "הפעלת המפעל";
  $("run").setAttribute("aria-disabled", String(sim.mode === "paused"));
  ($("run") as HTMLButtonElement).disabled = sim.mode === "paused";
  $("pause").setAttribute("aria-pressed", String(sim.mode === "paused"));
  $("mute").setAttribute("aria-pressed", String(muted));
  $("mute").textContent = muted ? "♩" : "♪";
  $("motion").setAttribute("aria-pressed", String(reduced));
  $("move").setAttribute("aria-pressed", String(editMode === "move"));
  $("erase").setAttribute("aria-pressed", String(editMode === "erase"));
  document.body.classList.toggle("reduced", reduced);
  if (workshop) {
    workshop.reduced = reduced;
    workshop.controls.enableDamping = !reduced;
  }
  const desc =
    tool === "belt"
      ? {
          title: "Belt",
          description: "Moves an item straight to the next tile.",
        }
      : tool === "corner"
        ? {
            title: "Corner belt",
            description:
              "Turns one incoming item. Rotate through eight directed bends.",
          }
        : TOOL_DESCRIPTIONS[tool];
  $("tool-title").textContent = desc.title;
  $("tool-description").textContent = desc.description;
  $("orientation").textContent =
    `יציאה: ${["ימינה", "קדימה", "שמאלה", "אחורה"][rotation % 4]}${tool === "corner" ? " · " + (rotation >= 4 ? "פנייה הפוכה" : "פנייה רגילה") : ""}`;
  buildPalette();
  $("result").hidden = sim.mode !== "success";
  if (sim.mode === "success") {
    const final = sim.level === 4;
    $("result-title").textContent = final
      ? "כל חמש ההזמנות הושלמו!"
      : "המשלוח יצא לדרך";
    $("result-detail").textContent =
      `${sim.contract.count} תוצרים תקינים · ${sim.time.toFixed(1)} שניות ייצור · ${sim.tiles.length} חלקים · ${sim.attempts} ניסיונות${sim.hints ? " · בעזרת רמז" : " · ללא רמז"}. קריאה ובנייה אינן נספרות בזמן.`;
    $("next").textContent = final ? "סדנה חדשה ↺" : "להזמנה הבאה ←";
  }
  try {
    localStorage.setItem("sf-events", JSON.stringify(sim.events));
  } catch {}
}
function run() {
  sound(180, 0.13, "triangle");
  sim.run();
  selected = null;
  moveFrom = null;
  refresh(true);
}
function openDialog(html: string) {
  dialogPaused = sim.mode !== "paused";
  if (dialogPaused) sim.pause();
  $("dialog-content").innerHTML = html;
  ($("dialog") as HTMLDialogElement).showModal();
  refresh(true);
}
function closeDialog() {
  ($("dialog") as HTMLDialogElement).close();
  if (dialogPaused && sim.mode === "paused") sim.pause();
  dialogPaused = false;
  refresh(true);
}
$("close-dialog").onclick = closeDialog;
($("dialog") as HTMLDialogElement).addEventListener("cancel", (e) => {
  e.preventDefault();
  closeDialog();
});
$("help").onclick = () =>
  openDialog(
    `<h2>בונים. מפעילים. מתקנים.</h2><p>קראו את הזמנת הלקוח באנגלית. בחרו מסוע או מכונה, ולחצו על השולחן כדי לבנות מסלול מהכניסה אל <b dir="ltr">DISPATCH</b>. כל חץ מראה לאן החפץ ייצא. מכונה ישרה מקבלת חפץ מהצד הנגדי לחץ.</p><p>בחרו <b>העברה</b>, לחצו על חלק ואז על המקום החדש. <b>סיבוב / R</b> מסובב את החלק הנבחר, או את החלק הבא שייבנה. למסוע פנייה יש 8 מצבי כניסה ויציאה.</p><p>הפעילו וצפו בחפצים. מים מסירים צבע ונייר, צבע מכסה נייר, ואריזה אוטמת את החפץ. אפשר לעצור, להעביר מכונה ולהריץ שוב. גם תור במסוע בטוח לחפצים.</p><p>מקשים: <b dir="ltr">1–6</b> כלים · <b dir="ltr">WASD / arrows</b> מיקוד משבצת · <b dir="ltr">Enter</b> בנייה · <b dir="ltr">R</b> סיבוב · <b dir="ltr">Space</b> הפעלה/עצירה · <b dir="ltr">P / Esc</b> השהיה · <b dir="ltr">F</b> מסך מלא. גרירה ימנית או גרירת אצבע מסובבת את המבט; צביטה משנה מרחק.</p><p>קריאה, תרגום ותכנון אינם גורעים מציון. זמן הייצור ושטח המפעל הם אתגרי יעילות נפרדים. המידע נשמר רק בדפדפן זה, ללא שמות תלמידים.</p><p style="font-size:11px">תרגול הבנה לפי Workbook כיתה ח׳. המשפטים במשחק מקוריים. אין כאן מדידה של הפקת דקדוק או אישור של הישגי למידה.</p>`,
  );
$("read").onclick = () => {
  sim.readingSupport++;
  sim.log("vocabulary");
  const words = Object.entries(VOCABULARY).filter(([w]) =>
    new RegExp(`\\b${w}\\b`, "i").test(sim.text),
  );
  openDialog(
    `<h2>מילים בהזמנה</h2><p lang="en" dir="ltr">${sim.text}</p><dl>${words.map(([w, he]) => `<dt lang="en">${w}</dt><dd>${he}</dd>`).join("")}</dl><p>הייצור מושהה בזמן הקריאה.</p>`,
  );
};
$("hint").onclick = () => {
  sim.hint();
  openDialog(
    `<h2>זמן לתכנון</h2><p>${sim.contract.hintHe}</p><p>השימוש ברמז נרשם בנפרד מיעילות הבנייה.</p>`,
  );
};
$("pause").onclick = () => {
  sim.pause();
  refresh(true);
};
$("run").onclick = run;
$("rotate").onclick = rotate;
$("move").onclick = () => {
  editMode = editMode === "move" ? "place" : "move";
  moveFrom = null;
  selected = null;
  refresh(true);
};
$("erase").onclick = () => {
  editMode = editMode === "erase" ? "place" : "erase";
  moveFrom = null;
  refresh(true);
};
$("restart").onclick = () => {
  sim.log("restart");
  sim.load(sim.level);
  tool = "belt";
  selected = null;
  moveFrom = null;
  editMode = "place";
  refresh(true);
};
$("next").onclick = () => {
  sim.load((sim.level + 1) % 5);
  tool = "belt";
  rotation = 0;
  selected = null;
  moveFrom = null;
  editMode = "place";
  lastDeliveries = 0;
  workshop.resetCamera();
  refresh(true);
};
$("try-again").onclick = () => {
  sim.stop();
  refresh(true);
};
$("paraphrase").onclick = () => {
  sim.activeText = !sim.activeText;
  sim.readingSupport++;
  sim.log("paraphrase");
  refresh(true);
};
$("receiver").onclick = () => {
  sim.toggleReceiver();
  refresh(true);
};
$("mute").onclick = () => {
  muted = !muted;
  localStorage.setItem("sf-mute", String(muted));
  if (!muted) sound();
  refresh(true);
};
$("motion").onclick = () => {
  reduced = !reduced;
  localStorage.setItem("sf-motion", String(reduced));
  refresh(true);
};
function fullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}
$("fullscreen").onclick = fullscreen;
$("camera").onclick = () => workshop.resetCamera();
function voices() {
  if (!("speechSynthesis" in window)) return [] as SpeechSynthesisVoice[];
  return speechSynthesis
    .getVoices()
    .filter((v) => v.localService && v.lang.startsWith("en"));
}
$("speak").hidden = !voices().length;
if ("speechSynthesis" in window)
  speechSynthesis.onvoiceschanged = () => {
    $("speak").hidden = !voices().length;
  };
$("speak").onclick = () => {
  if (sim.mode === "running") sim.pause();
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sim.text);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  utterance.voice = voices()[0] ?? null;
  speechSynthesis.speak(utterance);
  sim.readingSupport++;
  sim.log("listen");
  refresh(true);
};
window.addEventListener("keydown", (e) => {
  if (($("dialog") as HTMLDialogElement).open) return;
  if ((e.target as HTMLElement).tagName === "INPUT") return;
  if (
    (e.target as HTMLElement).closest("button") &&
    (e.code === "Enter" || e.code === "Space")
  )
    return;
  if (
    [
      "Space",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Enter",
    ].includes(e.code)
  )
    e.preventDefault();
  const tools = [...document.querySelectorAll<HTMLElement>("[data-tool]")].map(
    (b) => b.dataset.tool as Tool,
  );
  if (e.code.startsWith("Digit")) {
    const t = tools[Number(e.code.slice(-1)) - 1];
    if (t) selectTool(t);
  }
  if (e.code === "Escape" && document.fullscreenElement)
    void document.exitFullscreen();
  if (e.code === "KeyR") rotate();
  if (e.code === "Space" && !e.repeat) run();
  if ((e.code === "KeyP" || e.code === "Escape") && !e.repeat) {
    sim.pause();
    refresh(true);
  }
  if (e.code === "KeyF") fullscreen();
  const dirs: Record<string, [number, number]> = {
    ArrowRight: [1, 0],
    KeyD: [1, 0],
    ArrowLeft: [-1, 0],
    KeyA: [-1, 0],
    ArrowUp: [0, -1],
    KeyW: [0, -1],
    ArrowDown: [0, 1],
    KeyS: [0, 1],
  };
  if (dirs[e.code]) {
    selected ??= { x: 4, z: 3 };
    const [x, z] = dirs[e.code];
    selected = {
      x: Math.max(0, Math.min(8, selected.x + x)),
      z: Math.max(0, Math.min(6, selected.z + z)),
    };
    refresh(true);
  }
  if (e.code === "Enter") {
    selected ??= { x: 4, z: 3 };
    clickCell(selected);
  }
});
window.addEventListener("blur", () => {
  if (sim.mode === "running") {
    sim.pause();
    refresh(true);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && sim.mode === "running") {
    sim.pause();
    refresh(true);
  }
});
function tick(dt: number) {
  sim.step(dt);
  if (sim.deliveries.length > lastDeliveries) {
    const accepted = sim.deliveries.at(-1)!.accepted;
    sound(accepted ? 660 : 180, 0.17, "triangle");
    lastDeliveries = sim.deliveries.length;
  }
  if (sim.mode === "success" && lastMode !== "success") {
    sound(880, 0.3, "sine");
  }
  lastMode = sim.mode;
  workshop.sync(sim, selected, sim.mode === "paused" ? 0 : dt);
  refresh();
}
function frame(now: number) {
  const elapsed = now - last;
  last = now;
  if (elapsed < 250) {
    workshop.frameSamples.push(elapsed);
    if (workshop.frameSamples.length > 180) workshop.frameSamples.shift();
  }
  tick(now < manualUntil ? 0 : Math.min(0.05, elapsed / 1000));
  workshop.render();
  requestAnimationFrame(frame);
}
try {
  const errors = validateContracts();
  if (errors.length) throw new Error(errors.join(","));
  workshop = new Workshop($("world"), clickCell);
  void workshop.loadModels().then(() => refresh(true));
  $("loading").hidden = true;
  refresh(true);
  requestAnimationFrame(frame);
} catch (e) {
  $("loading").textContent =
    "לא ניתן להפעיל תלת־ממד בדפדפן זה. נסו דפדפן עם WebGL פעיל.";
  console.error(e);
}
Object.assign(window, {
  render_game_to_text: () =>
    JSON.stringify({
      coordinateSystem:
        "grid x east/right 0..8, z south/front 0..6; world x=(gridX-4)*1.2, world z=(gridZ-3)*1.2; y up",
      mode: sim.mode,
      challenge: sim.level + 1,
      title: sim.contract.titleHe,
      contract: sim.text,
      required: sim.contract.count,
      receiver: sim.spec.receiver,
      variant: sim.variant,
      tool,
      rotation,
      editMode,
      selected,
      board: {
        width: 9,
        depth: 7,
        sources: sim.board.sources,
        exit: sim.board.exit,
        obstacles: sim.board.obstacles,
      },
      tiles: sim.tiles,
      cellScreen: workshop
        ? Array.from({ length: 7 }, (_, z) =>
            Array.from({ length: 9 }, (_, x) => ({
              x,
              z,
              ...{ screen: workshop.screen({ x, z }) },
            })),
          ).flat()
        : [],
      pieces: sim.pieces.map((p) => ({
        id: p.id,
        from: p.from,
        cell: p.cell,
        progress: +p.progress.toFixed(3),
        blocked: p.blocked,
        product: p.product,
      })),
      deliveries: sim.deliveries,
      accepted: sim.accepted,
      productionSeconds: +sim.time.toFixed(2),
      jam: sim.jam,
      attempts: sim.attempts,
      hints: sim.hints,
      readingSupport: sim.readingSupport,
      events: sim.events.slice(-8),
      medals: sim.medals,
      assets: workshop?.assetStatus,
      assetInfo: workshop?.assetInfo,
      muted,
      reduced,
      performance: workshop
        ? {
            meanFrameMs: +(
              workshop.frameSamples.reduce((a, b) => a + b, 0) /
              Math.max(1, workshop.frameSamples.length)
            ).toFixed(2),
            drawCalls: workshop.renderer.info.render.calls,
            triangles: workshop.renderer.info.render.triangles,
          }
        : null,
    }),
  advanceTime: (ms: number) => {
    manualUntil = performance.now() + 1000;
    for (let elapsed = 0; elapsed < ms; elapsed += 1000 / 60) tick(1 / 60);
    workshop.render();
  },
});
