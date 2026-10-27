/** One shortcut description drives the buttons, help and keyboard dispatch. */
export interface ControlBinding {
  id: string;
  code: string;
  key: string;
  label: string;
  shift?: boolean;
  modifier?: boolean;
}

export const CONTROL_BINDINGS: ControlBinding[] = [
  { id: "move", code: "KeyM", key: "M", label: "העברת חלק: בוחרים חלק ואז מקום פנוי" },
  { id: "rotate", code: "KeyR", key: "R", label: "סיבוב החלק הנבחר או הכלי הבא" },
  { id: "erase", code: "KeyX", key: "X", label: "מצב מחיקה; Delete או Backspace מוחקים מיד את החלק הנבחר" },
  { id: "undo", code: "KeyZ", key: "Z", modifier: true, label: "ביטול פעולת העריכה האחרונה" },
  { id: "camera", code: "KeyV", key: "V", label: "החזרת המבט למיקום ההתחלתי" },
  { id: "cancel-edit", code: "Escape", key: "Esc", label: "יציאה מכלי וביטול הבחירה, בלי לשנות את המפעל" },
  { id: "run", code: "Space", key: "Space", label: "הפעלת המפעל או עצירה לעריכה" },
  { id: "pause", code: "KeyP", key: "P", label: "השהיה או המשך" },
  { id: "restart", code: "KeyR", key: "Shift R", shift: true, label: "איפוס הבנייה בהזמנה הנוכחית" },
  { id: "hint", code: "KeyI", key: "I", label: "רמז להזמנה" },
  { id: "campaign-open", code: "KeyL", key: "L", label: "פתיחת ספר ההזמנות" },
  { id: "help", code: "KeyH", key: "H", label: "עזרה ומדריך מקשים" },
  { id: "mute", code: "KeyU", key: "U", label: "השתקה או הפעלת כל הצלילים" },
  { id: "music-mix", code: "KeyB", key: "B", label: "פתיחת או סגירת מערבל הצלילים" },
  { id: "motion", code: "KeyN", key: "N", label: "תנועה מופחתת" },
  { id: "fullscreen", code: "KeyF", key: "F", label: "כניסה או יציאה ממסך מלא" },
  { id: "read", code: "KeyT", key: "T", label: "מילים ותרגום בהזמנה" },
  { id: "speak", code: "KeyY", key: "Y", label: "הקראת ההזמנה באנגלית" },
  { id: "paraphrase", code: "KeyO", key: "O", label: "החלפה בין ניסוחים שקולים, כשיש" },
  { id: "receiver", code: "KeyO", key: "Shift O", shift: true, label: "הזמנה חלופית עם מקבל פעולה אחר, כשיש" },
  { id: "contract-toggle", code: "KeyC", key: "C", label: "קיפול או פתיחת ההזמנה" },
  { id: "next", code: "Enter", key: "Enter", label: "המשך אחרי משלוח שהושלם" },
];

export function shortcutKey(binding: ControlBinding, mac: boolean): string {
  return binding.modifier ? `${mac ? "⌘" : "Ctrl"} ${binding.key}` : binding.key;
}

export function shortcutAria(binding: ControlBinding): string {
  if (binding.modifier) return `Control+${binding.key} Meta+${binding.key}`;
  return `${binding.shift ? "Shift+" : ""}${binding.code === "Space" ? "Space" : binding.code === "Escape" ? "Escape" : binding.key.replace("Shift ", "")}`;
}
