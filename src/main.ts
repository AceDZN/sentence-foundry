import "./style.css";
import { FoundryAudio } from "./audio";
import { Foundry } from "./simulation";
import { Workshop } from "./workshop";
import { readCampaign, nextUnfinished } from "./campaign";
import { CONTROL_BINDINGS, shortcutAria, shortcutKey, type ControlBinding } from "./controls";
import {
  CONTRACTS,
  CHAPTERS,
  TOOL_DESCRIPTIONS,
  VOCABULARY,
  validateContracts,
} from "./content";
import type { Cell, Tile, Tool } from "./grid";
import { key } from "./grid";
import { initHost, parseLevelParam, postToHost, WorkbookSession } from "./host";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
initHost("sentence-foundry");
const hostSession = new WorkbookSession(postToHost);
let hostReady = false;
const requestedLevel = parseLevelParam(window.location.search, CONTRACTS.length);
const sim = new Foundry();
const soundtrack = new FoundryAudio();
const campaign = readCampaign(localStorage.getItem("sf-campaign-v1"));
const savedIndex = CONTRACTS.findIndex(c => c.id === campaign.current);
sim.load(requestedLevel ?? Math.max(0, savedIndex));
if (requestedLevel === null && campaign.draft?.id === sim.contract.id) {
  sim.tiles = campaign.draft.tiles;
  sim.variant = campaign.draft.variant;
  sim.activeText = campaign.draft.activeText;
}
let finaleVisible = requestedLevel === null && Boolean(campaign.endingVisible);
let persisted = "";
let storageAvailable = true;
let lastCompletion = "";
let coachVisible = localStorage.getItem("sf-controls-seen") !== "true";
const learned = new Set<string>();
let undoHistory: Tile[][] = [];
let editNotice = "";
function edit(action: () => unknown) {
  const before = sim.tiles.map(t => ({ ...t }));
  action();
  if (JSON.stringify(before) !== JSON.stringify(sim.tiles)) {
    undoHistory.push(before);
    if (undoHistory.length > 30) undoHistory.shift();
  }
}
function saveCampaign() {
  campaign.current = sim.contract.id;
  campaign.draft = { id: sim.contract.id, tiles: sim.tiles, variant: sim.variant, activeText: sim.activeText };
  if (sim.mode === "success") {
    const signature = `${sim.level}:${sim.time}:${sim.attempts}:${sim.variant}`;
    if (lastCompletion !== signature) {
      lastCompletion = signature;
      const wasComplete = Object.keys(campaign.completed).length === CONTRACTS.length;
      const previous = campaign.completed[sim.contract.id];
      campaign.completed[sim.contract.id] = {
        seconds: previous ? Math.min(previous.seconds, sim.time) : sim.time,
        pieces: previous ? Math.min(previous.pieces, sim.tiles.length) : sim.tiles.length,
        attempts: sim.attempts, supported: sim.hints > 0 || sim.readingSupport > 0,
      };
      if (!wasComplete && Object.keys(campaign.completed).length === CONTRACTS.length) finaleVisible = true;
    }
  }
  campaign.endingVisible = finaleVisible;
  const serialized = JSON.stringify(campaign);
  if (serialized !== persisted) {
    try { localStorage.setItem("sf-campaign-v1", serialized); persisted = serialized; }
    catch { storageAvailable = false; }
  }
}
let tool: Tool = "belt",
  rotation = 0,
  selected: Cell | null = null,
  moveFrom: Cell | null = null,
  editMode: "place" | "move" | "erase" = "place";
let muted = localStorage.getItem("sf-mute") === "true",
  reduced =
    localStorage.getItem("sf-motion") === "true" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
let manualUntil = 0,
  last = performance.now(),
  lastUi = "",
  lastDeliveries = 0,
  lastMode = "",
  dialogPaused = false;
let speechVersion = 0;
let workshop: Workshop;
const symbols: Record<Tool, string> = {
  belt: "➜",
  corner: "↳",
  wash: "◈",
  paint: "⚒",
  label: "▤",
  pack: "▣",
  dry: "☀",
  unpack: "⋈",
};
const labels: Record<Tool, string> = {
  belt: "Belt",
  corner: "Corner",
  wash: "Cleaning arm",
  paint: "Painter",
  label: "Label press",
  pack: "Packer",
  dry: "Dryer",
  unpack: "Unpacker",
};
const macKeyboard = /Mac|iPhone|iPad/.test(navigator.platform);
function decorateControl(button: HTMLElement, binding: ControlBinding) {
  button.querySelectorAll(":scope > kbd").forEach(k => k.remove());
  button.title = `${binding.label} (${shortcutKey(binding, macKeyboard)})`;
  button.setAttribute("aria-keyshortcuts", shortcutAria(binding));
}
function controlLabel(id: string, label: string) {
  $(id).textContent = label;
  const binding = CONTROL_BINDINGS.find(b => b.id === id);
  if (binding) decorateControl($(id), binding);
}
function showControlHints() {
  for (const binding of CONTROL_BINDINGS) decorateControl($(binding.id), binding);
  for (const cap of document.querySelectorAll<HTMLElement>("[data-shortcut]")) {
    const binding = CONTROL_BINDINGS.find(b => b.id === cap.dataset.shortcut);
    if (binding) { cap.dir = "ltr"; cap.textContent = shortcutKey(binding, macKeyboard); }
  }
}
function cancelEdit() {
  if (!["editing", "review"].includes(sim.mode)) return;
  selected = null;
  moveFrom = null;
  editMode = "place";
  rotation = 0;
  editNotice = "";
  refresh(true);
}
function unlockAudio(event: Event) {
  if ((event.target as HTMLElement).closest("#mute")) return;
  void soundtrack.unlock();
}
window.addEventListener("pointerdown", unlockAudio, { passive: true });
window.addEventListener("keydown", unlockAudio);
function selectTool(next: Tool) {
  editNotice = "";
  tool = next;
  rotation = 0;
  selected = null;
  moveFrom = null;
  editMode = "place";
  soundtrack.play("rotate", 0.35);
  refresh(true);
}
function clickCell(cell: Cell) {
  if (sim.mode !== "editing" && sim.mode !== "review" || finaleVisible) return;
  selected = cell;
  editNotice = "";
  if (editMode === "erase") {
    edit(() => sim.remove(cell));
    soundtrack.play("remove");
  } else if (editMode === "move") {
    if (!moveFrom) {
      if (sim.tiles.some(t => key(t) === key(cell))) moveFrom = { ...cell };
      else editNotice = "בחרו קודם את החלק שרוצים להעביר.";
    } else {
      let moved = false;
      edit(() => { moved = sim.move(moveFrom!, cell); });
      if (moved) {
        moveFrom = null;
        learned.add("move");
        soundtrack.play("place");
      } else editNotice = "המקום תפוס או חסום. בחרו משבצת פנויה; החלק נשאר במקומו.";
    }
  } else {
    const existing = sim.tiles.find(t => key(t) === key(cell));
    if (existing) {
      tool = existing.kind;
      rotation = existing.rotation;
    } else {
      let placed = false;
      edit(() => { placed = sim.place(cell, tool, rotation); });
      if (placed) {
        learned.add("place");
        soundtrack.play("place");
      } else editNotice = "אי אפשר לבנות כאן. בדקו את המכשול או את מגבלת החלקים.";
    }
  }
  refresh(true);
}
function rotate() {
  if (sim.mode !== "editing" && sim.mode !== "review") return;
  const tile = selected && sim.tiles.find((t) => key(t) === key(selected!));
  if (tile) {
    edit(() => sim.rotate(tile));
    rotation = tile.rotation;
    tool = tile.kind;
  } else rotation = (rotation + 1) % (tool === "corner" ? 8 : 4);
  learned.add("rotate");
  soundtrack.play("rotate");
  refresh(true);
}
function buildPalette() {
  const order: Tool[] = ["belt", "corner", ...sim.contract.availableMachines];
  $("palette").classList.toggle("expanded", order.length > 6);
  $("palette").innerHTML = order
    .map(
      (kind, i) =>
        `<button data-tool="${kind}" title="${labels[kind]} · מקש ${i + 1}" aria-label="${labels[kind]}" aria-keyshortcuts="${i + 1}" aria-pressed="${tool === kind}"><span class="symbol">${symbols[kind]}</span><small lang="en">${labels[kind]}</small></button>`,
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
  if (d.reasons.includes("final:paintCured"))
    return "הצבע עדיין לא התקשה. ייבוש צריך לפעול אחרי הצביעה, כשהחפץ מחוץ לאריזה.";
  if (d.reasons.includes("final:dried"))
    return "מצב הייבוש אינו מתאים להזמנה. שטיפה או צבע מחדש מבטלים ייבוש קודם.";
  if (d.reasons.includes("final:itemLabelled"))
    return "התווית הפנימית חסרה. בדקו אם היא הוצמדה לחפץ לפני שסגרתם את האריזה.";
  if (d.reasons.includes("final:packed"))
    return "מצב האריזה אינו מתאים להזמנה. פותח האריזות פועל רק על חפץ שכבר נארז.";
  if (d.reasons.includes("final:painted"))
    return "מצב הצבע אינו מתאים להזמנה. שימו לב למה קרה בדרך.";
  if (d.reasons.includes("final:labelled"))
    return "התווית נשטפה או כוסתה בצבע. עצרו והעבירו מכונה.";
  return "התוצר או סדר הפעולות אינם מתאימים. עצרו, בדקו את התוצר ותקנו את המסלול.";
}
function status() {
  if (editNotice) return editNotice;
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
  soundtrack.setPaused(sim.mode === "paused");
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
  saveCampaign();
  $("level-label").textContent = `הזמנה ${sim.level + 1} / ${CONTRACTS.length} · ${sim.contract.titleHe}`;
  $("chapter-label").textContent = `פרק ${sim.contract.chapter + 1} · ${CHAPTERS[sim.contract.chapter].titleHe}`;
  $("campaign-open").title = `${Object.keys(campaign.completed).length} / ${CONTRACTS.length} הושלמו · בחירת הזמנה (L)`;
  $("control-coach").hidden = !coachVisible || sim.level !== 0 || sim.mode === "running" || sim.mode === "success" || finaleVisible;
  const selectedTile = selected && sim.tiles.find(t => key(t) === key(selected!));
  $("control-tip").textContent = sim.mode === "running"
    ? "הקו עובד · לחצו עצירה כדי לסובב, להעביר או למחוק חלקים"
    : editMode === "move" ? (moveFrom ? "↔ עכשיו לחצו על המקום החדש · Esc מבטל העברה" : "↔ שלב 1: לחצו על החלק שרוצים להעביר")
    : editMode === "erase" ? "⌫ לחצו על חלק למחיקה · X שוב או Esc מבטלים את מצב המחיקה"
    : selectedTile ? `נבחר: ${"\u2066" + labels[selectedTile.kind] + "\u2069"} · ↻ / R לסיבוב · ↔ / M להעברה`
    : `בנייה: ${"\u2066" + labels[tool] + "\u2069"} · לחצו על משבצת פנויה`;
  ($("cancel-edit") as HTMLButtonElement).disabled = !["editing", "review"].includes(sim.mode) || !(selected || moveFrom || editMode !== "place" || rotation !== 0);
  ($("undo") as HTMLButtonElement).disabled = !undoHistory.length || !["editing", "review"].includes(sim.mode);
  for (const id of ["move", "rotate", "erase"]) ($<HTMLButtonElement>(id)).disabled = !["editing", "review"].includes(sim.mode);
  $("order").textContent = sim.text;
  $("quantity").textContent =
    `יעד: ${sim.contract.count} תוצרים · התקבלו ${sim.accepted}`;
  $("paraphrase").hidden = !sim.contract.alternateText;
  $("receiver").hidden = !sim.contract.receiverAlternative;
  controlLabel("paraphrase", sim.activeText ? "ניסוח סביל" : "ניסוח פעיל");
  $("status-text").textContent = status();
  $("build-size").textContent = `${sim.tiles.length}${sim.contract.maxPieces ? " / " + sim.contract.maxPieces : ""} חלקים`;
  $("run").classList.toggle("running", sim.mode === "running");
  $("run").querySelector("span")!.textContent =
    sim.mode === "running" ? "עצירה ועריכה" : "הפעלת המפעל";
  $("run").setAttribute("aria-disabled", String(sim.mode === "paused"));
  ($("run") as HTMLButtonElement).disabled = sim.mode === "paused";
  $("pause").setAttribute("aria-pressed", String(sim.mode === "paused"));
  $("mute").setAttribute("aria-pressed", String(muted));
  controlLabel("mute", muted ? "♩" : "♪");
  ($("speak") as HTMLButtonElement).disabled = muted;
  $("speak").title = muted ? "בטלו השתקה כדי לשמוע את ההזמנה (Y)" : "הקראת ההזמנה (Y)";
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
  $("result").hidden = sim.mode !== "success" || finaleVisible;
  $("finale").hidden = !finaleVisible;
  if (finaleVisible) {
    $("finale-stats").innerHTML = `<strong>45 <small>הזמנות</small></strong><strong>9 <small>פרקים</small></strong><strong>6 <small>מכונות</small></strong>`;
  }
  if (sim.mode === "success") {
    const final = sim.level === CONTRACTS.length - 1;
    const chapterEnd = (sim.level + 1) % 5 === 0;
    $("result-title").textContent = final ? "משלוח הגמר התקבל!" : chapterEnd ? `סיימתם את פרק ${sim.contract.chapter + 1}!` : "המשלוח יצא לדרך";
    $("result-detail").textContent = `${sim.contract.count} תוצרים תקינים · ${sim.time.toFixed(1)} שניות ייצור · ${sim.tiles.length} חלקים · ${sim.attempts} ניסיונות${sim.hints ? " · בעזרת רמז" : " · ללא רמז"}. הושלמו ${Object.keys(campaign.completed).length} / ${CONTRACTS.length}. קריאה ובנייה אינן נספרות בזמן.`;
    controlLabel("next", final ? "לשאר ההזמנות ☷" : "להזמנה הבאה ←");
  }
  try {
    localStorage.setItem("sf-events", JSON.stringify(sim.events));
  } catch {}
}
function run() {
  if (finaleVisible || ($("dialog") as HTMLDialogElement).open) return;
  const stopping = sim.mode === "running";
  if (sim.mode === "success") hostSession.restart();
  soundtrack.play(stopping ? "remove" : "start");
  if (!stopping) {
    soundtrack.resetRun();
    lastDeliveries = 0;
  }
  sim.run();
  selected = null;
  moveFrom = null;
  refresh(true);
}
function openDialog(html: string) {
  stopSpeech();
  dialogPaused = sim.mode !== "paused";
  if (dialogPaused) sim.pause();
  $("dialog").classList.remove("campaign-dialog");
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
$("contract-toggle").onclick = () => {
  const collapsed = $("contract").classList.toggle("collapsed");
  $("contract-toggle").setAttribute("aria-expanded", String(!collapsed));
  controlLabel("contract-toggle", collapsed ? "⌄" : "⌃");
};
$("close-dialog").onclick = closeDialog;
($("dialog") as HTMLDialogElement).addEventListener("cancel", (e) => {
  e.preventDefault();
  closeDialog();
});
$("help").onclick = () =>
  openDialog(
    `<h2>שליטה במפעל</h2><div class="control-lesson"><p><b>① בנייה</b> · בחרו כלי מהמדף ולחצו על משבצת פנויה. לחיצה על חלק קיים בוחרת אותו.</p><p><b>② סיבוב</b> · בחרו חלק ואז לחצו ↻ או R. החץ שלו מראה את כיוון היציאה.</p><p><b>③ העברה</b> · לחצו ↔ או M, בחרו חלק, ואז משבצת פנויה. אין צורך לגרור.</p><p><b>מחיקה וביטול</b> · X מפעיל מצב מחיקה; Delete מוחק מיד את החלק הנבחר. ${macKeyboard ? "⌘ Z" : "Ctrl Z"} מחזיר את העריכה האחרונה. Esc מבטל את הבחירה או הכלי בלי לשנות חלקים שכבר נבנו.</p></div><dl class="shortcut-list">${CONTROL_BINDINGS.filter(b => b.id !== "next").map(b => `<dt><kbd dir="ltr">${shortcutKey(b, macKeyboard)}</kbd></dt><dd>${b.label}</dd>`).join("")}</dl><p><b dir="ltr">1–8</b> כלים · <b dir="ltr">WASD / arrows</b> מיקוד משבצת · <b dir="ltr">Enter</b> בנייה / המשך אחרי הצלחה. כל הכפתורים זמינים גם עם Tab ואז Enter או Space. גרירה ימנית או גרירת אצבע מסובבת את המבט; גלגלת או צביטה משנה מרחק.</p><p>קריאה, תרגום ותכנון אינם גורעים מציון. זמן הייצור ושטח המפעל הם אתגרי יעילות נפרדים. המידע נשמר רק בדפדפן זה, ללא שמות תלמידים.</p>`,
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
$("cancel-edit").onclick = cancelEdit;
$("move").onclick = () => {
  editMode = editMode === "move" ? "place" : "move";
  moveFrom = null;
  if (editMode === "move" && selected && sim.tiles.some(t => key(t) === key(selected!))) moveFrom = { ...selected };
  editNotice = "";
  refresh(true);
};
$("erase").onclick = () => {
  editNotice = "";
  editMode = editMode === "erase" ? "place" : "erase";
  moveFrom = null;
  refresh(true);
};
function loadLevel(index: number) {
  stopSpeech();
  soundtrack.resetRun();
  sim.load(index);
  hostSession.restart();
  tool = "belt";
  rotation = 0;
  selected = null;
  moveFrom = null;
  editMode = "place";
  editNotice = "";
  undoHistory = [];
  lastDeliveries = 0;
  lastMode = "";
  finaleVisible = false;
  workshop.resetCamera();
  refresh(true);
}
$("restart").onclick = () => { sim.log("restart"); loadLevel(sim.level); };
$("next").onclick = () => {
  if (sim.level === CONTRACTS.length - 1) openCampaign();
  else loadLevel(sim.level + 1);
};
$("undo").onclick = () => {
  if (!["editing", "review"].includes(sim.mode)) return;
  const previous = undoHistory.pop();
  if (previous) { sim.tiles = previous; selected = null; moveFrom = null; editNotice = ""; }
  refresh(true);
};
$("dismiss-coach").onclick = () => {
  coachVisible = false;
  localStorage.setItem("sf-controls-seen", "true");
  refresh(true);
};
function openCampaign() {
  const count = Object.keys(campaign.completed).length;
  const recommended = nextUnfinished(campaign);
  openDialog(`<div class="campaign-heading"><span lang="en" dir="ltr">THE WORK ORDER BOOK</span><h2>ספר ההזמנות</h2><p>${count} מתוך ${CONTRACTS.length} הושלמו · אפשר לבחור כל הזמנה</p></div>${CHAPTERS.map((chapter, ci) => {
    const levels = CONTRACTS.map((contract, index) => ({ contract, index })).filter(({contract}) => contract.chapter === ci);
    const done = levels.filter(({contract}) => campaign.completed[contract.id]).length;
    return `<section class="campaign-chapter"><div><h3><b>${String(ci+1).padStart(2,"0")}</b> ${chapter.titleHe}</h3><span>${done} / ${levels.length}</span></div><p>${chapter.descriptionHe}</p><div class="campaign-levels">${levels.map(({contract,index}) => `<button data-level="${index}" class="${campaign.completed[contract.id] ? "done" : ""} ${sim.level === index ? "current" : ""}" aria-label="הזמנה ${index + 1}: ${contract.titleHe}${campaign.completed[contract.id] ? ", הושלמה" : ""}"><b>${index + 1}</b><span>${contract.titleHe}</span><small>${campaign.completed[contract.id] ? "✓ הושלם" : index === recommended ? "הבא בתור" : "לסדנה ←"}</small></button>`).join("")}</div></section>`;
  }).join("")}<p class="save-note">${storageAvailable ? "ההתקדמות והבנייה הנוכחית נשמרות אוטומטית בדפדפן הזה." : "הדפדפן אינו מאפשר שמירה כרגע. השאירו את החלון פתוח כדי לשמור על ההתקדמות."}</p>${count === CONTRACTS.length ? '<button id="view-finale">✦ חזרה לסיום החגיגי</button>' : ""}`);
  $("dialog").classList.add("campaign-dialog");
  document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach(b => b.onclick = () => {
    closeDialog();
    loadLevel(Number(b.dataset.level));
  });
  const viewFinale = document.getElementById("view-finale");
  if (viewFinale) viewFinale.onclick = () => { closeDialog(); finaleVisible = true; refresh(true); };
}
$("campaign-open").onclick = openCampaign;
$("finale-map").onclick = () => { finaleVisible = false; refresh(true); openCampaign(); };
$("finale-replay").onclick = () => { finaleVisible = false; refresh(true); };
$("try-again").onclick = () => {
  sim.stop();
  hostSession.restart();
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
  soundtrack.setMuted(muted);
  if (muted) stopSpeech();
  void soundtrack.unlock();
  refresh(true);
};
const musicToggle = $("music-enabled") as HTMLInputElement;
const effectsToggle = $("effects-enabled") as HTMLInputElement;
const musicVolume = $("music-volume") as HTMLInputElement;
const effectsVolume = $("effects-volume") as HTMLInputElement;
musicToggle.checked = soundtrack.musicEnabled;
effectsToggle.checked = soundtrack.effectsEnabled;
musicVolume.value = String(Math.round(soundtrack.musicVolume * 100));
effectsVolume.value = String(Math.round(soundtrack.effectsVolume * 100));
$("music-mix").onclick = () => {
  const open = $("audio-panel").hidden;
  $("audio-panel").hidden = !open;
  $("music-mix").setAttribute("aria-expanded", String(open));
};
$("close-audio").onclick = () => {
  $("audio-panel").hidden = true;
  $("music-mix").setAttribute("aria-expanded", "false");
  $("music-mix").focus({ preventScroll: true });
};
musicToggle.onchange = () => soundtrack.setMusicEnabled(musicToggle.checked);
effectsToggle.onchange = () =>
  soundtrack.setEffectsEnabled(effectsToggle.checked);
musicVolume.oninput = () =>
  soundtrack.setMusicVolume(Number(musicVolume.value) / 100);
effectsVolume.oninput = () =>
  soundtrack.setEffectsVolume(Number(effectsVolume.value) / 100);
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
function stopSpeech() {
  speechVersion++;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  soundtrack.setReading(false);
}
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
  if (muted) return;
  if (sim.mode === "running") sim.pause();
  stopSpeech();
  soundtrack.setReading(true);
  const utterance = new SpeechSynthesisUtterance(sim.text);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  utterance.voice = voices()[0] ?? null;
  const voiceVersion = speechVersion;
  utterance.onend = utterance.onerror = () => {
    if (voiceVersion === speechVersion) soundtrack.setReading(false);
  };
  speechSynthesis.speak(utterance);
  sim.readingSupport++;
  sim.log("listen");
  refresh(true);
};
window.addEventListener("keydown", (e) => {
  if (e.isComposing || ($("dialog") as HTMLDialogElement).open) return;
  const target = e.target instanceof HTMLElement ? e.target : document.body;
  if (e.code === "Escape" && !e.repeat) {
    e.preventDefault();
    if (document.fullscreenElement) { void document.exitFullscreen(); return; }
    if (!$("audio-panel").hidden) { $("close-audio").click(); return; }
    if (["editing", "review"].includes(sim.mode)) cancelEdit();
    else if (sim.mode === "running" || sim.mode === "paused") { sim.pause(); refresh(true); }
    return;
  }
  if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) {
    if (!e.altKey && !e.shiftKey && (e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
      e.preventDefault();
      if (!e.repeat) $("undo").click();
    }
    return; // Preserve browser shortcuts such as Cmd/Ctrl R and Cmd/Ctrl L.
  }
  if (target.closest("button") && (e.code === "Enter" || e.code === "Space")) return;
  const directions: Record<string, [number, number]> = {
    ArrowRight: [1, 0], KeyD: [1, 0], ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  };
  if (directions[e.code] && !e.shiftKey && !finaleVisible) {
    e.preventDefault();
    selected ??= { x: 4, z: 3 };
    const [x, z] = directions[e.code];
    selected = { x: Math.max(0, Math.min(8, selected.x + x)), z: Math.max(0, Math.min(6, selected.z + z)) };
    refresh(true);
    return;
  }
  if (e.repeat) return;
  if ((e.code === "Delete" || e.code === "Backspace") && !e.shiftKey) {
    e.preventDefault();
    if (selected && !finaleVisible) { edit(() => sim.remove(selected!)); refresh(true); }
    return;
  }
  if (e.code.startsWith("Digit") && !e.shiftKey && !finaleVisible) {
    const tools = [...document.querySelectorAll<HTMLElement>("[data-tool]")].map(b => b.dataset.tool as Tool);
    const nextTool = tools[Number(e.code.slice(-1)) - 1];
    if (nextTool) { e.preventDefault(); selectTool(nextTool); }
    return;
  }
  if (e.code === "Enter" && !e.shiftKey && !finaleVisible) {
    e.preventDefault();
    if (sim.mode === "success") $("next").click();
    else { selected ??= { x: 4, z: 3 }; clickCell(selected); }
    return;
  }
  const binding = CONTROL_BINDINGS.find(b => !b.modifier && b.code === e.code && Boolean(b.shift) === e.shiftKey);
  if (binding) {
    const button = $(binding.id) as HTMLButtonElement;
    if (!button.hidden && !button.disabled && (!finaleVisible || ["campaign-open", "help", "mute", "music-mix", "motion", "fullscreen"].includes(binding.id))) {
      e.preventDefault();
      button.click();
    }
  }
});
window.addEventListener("blur", () => {
  soundtrack.setBackground(true);
  stopSpeech();
  if (sim.mode === "running") {
    sim.pause();
    refresh(true);
  }
});
window.addEventListener("focus", () =>
  soundtrack.setBackground(document.hidden),
);
document.addEventListener("visibilitychange", () => {
  soundtrack.setBackground(document.hidden);
  if (document.hidden) stopSpeech();
  if (document.hidden && sim.mode === "running") {
    sim.pause();
    refresh(true);
  }
});
function syncHost() {
  hostSession.sync({
    ready: hostReady,
    level: sim.level + 1,
    complete: sim.mode === "success" || (sim.mode === "paused" && sim.previousMode === "success"),
    durationMs: sim.time * 1000,
  });
}
function tick(dt: number) {
  sim.step(dt);
  soundtrack.observe(sim);
  if (sim.deliveries.length > lastDeliveries) {
    const accepted = sim.deliveries.at(-1)!.accepted;
    soundtrack.play(accepted ? "delivery" : "mistake");
    lastDeliveries = sim.deliveries.length;
  }
  if (sim.mode === "success" && lastMode !== "success") {
    soundtrack.play("success");
  }
  lastMode = sim.mode;
  workshop.sync(sim, selected, sim.mode === "paused" ? 0 : dt);
  refresh();
  syncHost();
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
  void workshop.loadModels().then(() => {
    refresh(true);
    workshop.sync(sim, selected, 0);
    workshop.render();
    hostReady = true;
    syncHost();
  }).catch(() => postToHost({ type: "error", message: "Sentence Foundry could not load its workshop. Reload to try again." }));
  $("loading").hidden = true;
  showControlHints();
  refresh(true);
  requestAnimationFrame(frame);
} catch (e) {
  $("loading").textContent =
    "לא ניתן להפעיל תלת־ממד בדפדפן זה. נסו דפדפן עם WebGL פעיל.";
  postToHost({ type: "error", message: "Sentence Foundry needs an active WebGL browser." });
  console.error(e);
}
Object.assign(window, {
  render_game_to_text: () =>
    JSON.stringify({
      coordinateSystem:
        "grid x east/right 0..8, z south/front 0..6; world x=(gridX-4)*1.2, world z=(gridZ-3)*1.2; y up",
      mode: sim.mode,
      workbook: { ready: hostReady, requestedLevel: requestedLevel === null ? null : requestedLevel + 1 },
      campaign: { total: CONTRACTS.length, completed: Object.keys(campaign.completed).length, completedIds: Object.keys(campaign.completed), chapter: sim.contract.chapter + 1, layout: sim.contract.layout, finaleVisible, saved: storageAvailable },
      controls: { coachVisible, learned: [...learned], moveFrom, undoCount: undoHistory.length, shortcuts: Object.fromEntries(CONTROL_BINDINGS.map(b => [b.id, shortcutKey(b, macKeyboard)])) },
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
      industryAssets: workshop?.decorStatus,
      muted,
      audioState: soundtrack.state(),
      reduced,
      performance: workshop
        ? {
            meanFrameMs: +(
              workshop.frameSamples.reduce((a, b) => a + b, 0) /
              Math.max(1, workshop.frameSamples.length)
            ).toFixed(2),
            drawCalls: workshop.renderer.info.render.calls,
            triangles: workshop.renderer.info.render.triangles,
            resources: workshop.resourceInfo,
          }
        : null,
    }),
  advanceTime: (ms: number) => {
    manualUntil = performance.now() + 1000;
    for (let elapsed = 0; elapsed < ms; elapsed += 1000 / 60) tick(1 / 60);
    workshop.render();
  },
});
