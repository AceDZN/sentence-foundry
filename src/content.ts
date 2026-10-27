import type { Operation, ProductionSpec, Receiver } from "./semantics";
import { OPERATION_AGENTS, validateSpec } from "./semantics";

export const SOURCES = {
  roles:
    "https://english.workbook.co.il/grade-8/chapter-7/who-does-it-and-what-is-done",
  process:
    "https://english.workbook.co.il/grade-8/chapter-7/following-a-production-process",
} as const;

export interface Contract {
  chapter: number;
  layout: number;
  /** Counts every placed belt/machine; a real construction constraint. */
  maxPieces?: number;
  id: string;
  titleHe: string;
  text: string;
  alternateText?: string;
  /** Same meaning, changed focus. Never use this for a receiver change. */
  equivalentSpec?: ProductionSpec;
  spec: ProductionSpec;
  count: number;
  availableMachines: Operation[];
  hintHe: string;
  skillHe: string;
  source: string;
  transfer: boolean;
  noun: string;
  nounHe: string;
  /** Challenge 3 can change the receiver, while retaining the shared workshop. */
  receiverAlternative?: {
    text: string;
    spec: ProductionSpec;
    noun: string;
    nounHe: string;
  };
}

export interface Chapter { id: string; titleHe: string; descriptionHe: string; unlockedOperations: Operation[] }
const CORE: Operation[] = ["wash", "paint", "label", "pack"];
const HEAT: Operation[] = [...CORE, "dry"];
const ALL: Operation[] = [...HEAT, "unpack"];
export const CHAPTERS: Chapter[] = [
 {id:"first-shift",titleHe:"המשמרת הראשונה",descriptionHe:"מחברים קו, מזהים מי פועל ומה מקבל את הפעולה, ומתקנים את המשלוח הראשון.",unlockedOperations:CORE},
 {id:"precise-orders",titleHe:"הלקוח מתכוון בדיוק",descriptionHe:"אותן מכונות, דרישות שונות: חפץ נכון, תווית במקום נכון ותכונה שצריכה להישאר חסרה.",unlockedOperations:CORE},
 {id:"drying-room",titleHe:"חדר הייבוש",descriptionHe:"מייבשים חומר וקובעים צבע. ייבוש לפני צביעה אינו ייבוש של הצבע שאחריה.",unlockedOperations:HEAT},
 {id:"follow-the-material",titleHe:"עוקבים אחרי החומר",descriptionHe:"כינויי גוף וסדר פעולות מלווים את אותו מוצר דרך קווים ארוכים יותר.",unlockedOperations:HEAT},
 {id:"compact-commission",titleHe:"סדנה קטנה, חוזה גדול",descriptionHe:"בונים קווים קומפקטיים ומבחינים בין סדר הכרחי לבין שתי פעולות שיכולות להתחלף.",unlockedOperations:HEAT},
 {id:"open-again",titleHe:"פותחים שוב",descriptionHe:"תחנת הפתיחה מאפשרת להגיע לתוכן האריזה. תווית חיצונית נזרקת; תווית פנימית נשמרת.",unlockedOperations:ALL},
 {id:"repair-shift",titleHe:"משמרת התיקונים",descriptionHe:"פותחים, מתקנים ומרכיבים מחדש משלוחים בלי לאבד את זהות מקבל הפעולה.",unlockedOperations:ALL},
 {id:"inspection-line",titleHe:"קו הביקורת",descriptionHe:"מבצעים תהליכי בדיקה בני כמה שלבים, עם פעולות חוזרות ודרישות שליליות מדויקות.",unlockedOperations:ALL},
 {id:"exhibition-dispatch",titleHe:"המשלוח לתערוכה",descriptionHe:"חמש הזמנות גמר משלבות את כל הכלים עד למשלוח שנושא תווית פנימית וחיצונית.",unlockedOperations:ALL},
];
export const CAMPAIGN_ENDING = {
 titleHe:"המשלוח לתערוכה יצא לדרך!",
 textHe:"כל 45 ההזמנות הושלמו. הקווים שבניתם שלחו את המוצרים לתערוכת ההמצאות. אפשר לחזור לכל פרק ולנסות מסלול קומפקטי יותר.",
 textEn:"The exhibition shipment is ready. Every service arm is clean, its paint is cured, and its identity label remains inside. A dispatch label is attached outside each sealed package.",
};

const step = (
  id: string,
  action: Operation,
  receiver: Receiver,
  agent?: string,
) => ({ id, action, receiver, ...(agent ? { agent } : {}) });

export const FIRST_SPEC: ProductionSpec = {
  receiver: "crate",
  final: { washed: true, painted: false, packed: false },
  steps: [step("wash", "wash", "crate", "cleaning-arm")],
  before: [],
};
export const FOCUS_SPEC: ProductionSpec = {
  receiver: "crate",
  final: { washed: true, painted: true, paintBonded: true, packed: false },
  steps: [
    step("wash", "wash", "crate", "cleaning-arm"),
    step("paint", "paint", "crate", "painter"),
  ],
  before: [["wash", "paint"]],
};
export const ARM_SPEC: ProductionSpec = {
  receiver: "service-arm",
  final: { painted: true, packed: false },
  steps: [step("paint", "paint", "service-arm", "painter")],
  before: [],
};
export const CRATE_PAINT_SPEC: ProductionSpec = {
  receiver: "crate",
  final: { painted: true, packed: false },
  steps: [step("paint", "paint", "crate", "painter")],
  before: [],
};
export const SEQUENCE_SPEC: ProductionSpec = {
  receiver: "crate",
  final: {
    washed: true,
    painted: true,
    paintBonded: true,
    labelled: true,
    labelSurface: "item",
    packed: true,
  },
  steps: [
    step("wash", "wash", "crate", "cleaning-arm"),
    step("paint", "paint", "crate", "painter"),
    step("label", "label", "crate"),
    step("pack", "pack", "crate"),
  ],
  before: [
    ["wash", "paint"],
    ["paint", "label"],
    ["label", "pack"],
  ],
};
export const TRANSFER_SPEC: ProductionSpec = {
  receiver: "panel",
  final: {
    washed: true,
    painted: false,
    labelled: true,
    labelSurface: "package",
    packed: true,
  },
  steps: [
    step("wash", "wash", "panel"),
    step("pack", "pack", "panel"),
    step("label", "label", "panel"),
  ],
  before: [
    ["wash", "pack"],
    ["pack", "label"],
  ],
};

/** Original authored fixtures based on the saved Workbook comprehension scope. */
export const CONTRACTS: Contract[] = [
  {
    id: "first-shipment",
    chapter: 0, layout: 0,
    titleHe: "משלוח ראשון",
    text: "The cleaning arm washes the crate. Keep the wood unpainted and unpacked.",
    spec: FIRST_SPEC,
    count: 1,
    availableMachines: ["wash", "paint", "label", "pack"],
    hintHe:
      "חפשו מה עושה כל מכונה. חברו מסלול רציף מהכניסה למוצא. אפשר לעצור, לסובב ולנסות שוב.",
    skillHe: "זיהוי מבצע הפעולה והחפץ שמקבל אותה",
    source: SOURCES.roles,
    transfer: false,
    noun: "crate",
    nounHe: "ארגז",
  },
  {
    id: "same-work-new-focus",
    chapter: 0, layout: 1,
    titleHe: "אותה עבודה, מוקד חדש",
    text: "First, the crates are washed by the cleaning arm. Then they are painted by the painter. Leave them unpacked.",
    alternateText:
      "First, the cleaning arm washes the crates. Then the painter paints them. Leave them unpacked.",
    spec: FOCUS_SPEC,
    equivalentSpec: structuredClone(FOCUS_SPEC),
    count: 2,
    availableMachines: ["wash", "paint", "label", "pack"],
    hintHe:
      "בשני הניסוחים הארגזים מקבלים את אותן הפעולות. they ו־them מתייחסים לארגזים. צבע נצמד לעץ נקי.",
    skillHe: "אותם תפקידים בפעיל ובסביל בהווה",
    source: SOURCES.roles,
    transfer: false,
    noun: "crate",
    nounHe: "ארגז",
  },
  {
    id: "receiver-switch",
    chapter: 0, layout: 2,
    titleHe: "מי מקבל צבע?",
    text: "The service arm is painted by the painter. Send it to the exit unpacked.",
    spec: ARM_SPEC,
    count: 1,
    availableMachines: ["wash", "paint", "label", "pack"],
    receiverAlternative: {
      text: "The painter paints the crate. Send it to the exit unpacked.",
      spec: CRATE_PAINT_SPEC,
      noun: "crate",
      nounHe: "ארגז",
    },
    hintHe:
      "הזרוע שעל המסוע היא חלק נשלף. הצובע הקבוע מפעיל צבע. בדקו על מי כתוב שהצבע נעשה.",
    skillHe: "החלפת מקבל הפעולה משנה את החפץ שיש לנתב",
    source: SOURCES.roles,
    transfer: false,
    noun: "service arm",
    nounHe: "זרוע שירות",
  },
  {
    id: "sequence-and-reference",
    chapter: 0, layout: 3,
    titleHe: "לא שוטפים את התווית",
    text: "First, the crates are washed by the cleaning arm. Next, the painter coats them. Labels are attached to the crates after painting. Finally, the crates are packed.",
    spec: SEQUENCE_SPEC,
    count: 3,
    availableMachines: ["wash", "paint", "label", "pack"],
    hintHe:
      "them מתייחס לארגזים. שטיפה מסירה צבע ונייר, צבע מכסה תווית, ואריזה סוגרת את הארגז.",
    skillHe: "מעקב אחר אותו חומר דרך סדר פעולות וכינויי גוף",
    source: SOURCES.process,
    transfer: false,
    noun: "crate",
    nounHe: "ארגז",
  },
  {
    id: "new-workshop",
    chapter: 0, layout: 4,
    titleHe: "הזמנה בסדנה חדשה",
    text: "The display panels are washed before packing. After they are packed, labels are attached to the outside of each package. Keep the panels unpainted.",
    spec: TRANSFER_SPEC,
    count: 3,
    availableMachines: ["wash", "paint", "label", "pack"],
    hintHe: "קראו שוב את החוזה. אפשר לעצור ולתכנן ללא קנס זמן.",
    skillHe: "העברה למוצר חדש, סדר חדש ומבצע שאינו מצוין",
    source: SOURCES.process,
    transfer: true,
    noun: "display panel",
    nounHe: "לוח תצוגה",
  },
];

type Authored = {
 id:string;titleHe:string;text:string;receiver:Receiver;sequence:Operation[];
 final:ProductionSpec['final'];chapter:number;layout:number;count?:number;maxPieces?:number;
 named?:number[];order?:[number,number][];alternateText?:string;transfer?:boolean;skillHe:string;
};
const CHAPTER_HINTS = [
 "קראו את החוזה וחברו קו שאפשר לעצור ולתקן.",
 "בדקו איזה חפץ מתואר, מי פועל, ומה צריך להישאר בלי צבע, תווית או אריזה.",
 "עקבו אחרי שכבת הצבע: ייבוש מוקדם אינו יכול לקבע צבע שעוד לא נוסף.",
 "למי מתייחסים הכינויים? איזה שלב יכול למחוק תוצאה של שלב קודם?",
 "בדקו איזה סדר הכרחי ואילו פעולות יכולות להתחלף. התקציב כולל כל חלק שמונח על השולחן.",
 "תווית על החפץ ותווית על האריזה נמצאות בשתי שכבות שונות. חשבו מה נשאר כשהאריזה נפתחת.",
 "הבחינו בין החומר הראשון לחומר המתוקן, ובין תג ישן לחדש. בדקו מתי מתאפשרת גישה לחפץ.",
 "before, after ו־again מחברים הופעות נפרדות של פעולות. מצב סופי בלבד אינו מחליף את הבדיקה שבחוזה.",
 "קראו את כל המשלוח לפני הבנייה. בדקו מה חייב להישאר בפנים ומה צריך להופיע בחוץ.",
];
function authored(a:Authored):Contract {
 const steps=a.sequence.map((action,i)=>({id:`stage${i+1}`,action,receiver:a.receiver,...(a.named?.includes(i)?{agent:OPERATION_AGENTS[action]}:{})}));
 const order=a.order??a.sequence.slice(1).map((_,i)=>[i,i+1] as [number,number]);
 const spec:ProductionSpec={receiver:a.receiver,final:a.final,steps,before:order.map(([x,y])=>[steps[x].id,steps[y].id])};
 return {id:a.id,titleHe:a.titleHe,text:a.text,spec,chapter:a.chapter,layout:a.layout,count:a.count??2,
 availableMachines:[...CHAPTERS[a.chapter].unlockedOperations],hintHe:a.transfer?"קראו שוב את החוזה. עצרו לתכנון ובדקו מה חייב להישאר במוצר שנשלח.":CHAPTER_HINTS[a.chapter],
 skillHe:a.skillHe,source:a.chapter===1?SOURCES.roles:SOURCES.process,transfer:a.transfer??false,
 noun:a.receiver==='service-arm'?'service arm':a.receiver==='panel'?'display panel':'crate',nounHe:a.receiver==='service-arm'?'זרוע שירות':a.receiver==='panel'?'לוח תצוגה':'ארגז',
 ...(a.maxPieces?{maxPieces:a.maxPieces}:{}),...(a.alternateText?{alternateText:a.alternateText,equivalentSpec:structuredClone(spec)}:{})};
}
CONTRACTS.push(
 // Chapter 2: exact specifications, rather than a single memorized recipe.
 authored({id:'clean-identities',titleHe:'תווית על העץ',chapter:1,layout:1,receiver:'crate',count:2,
 text:'The cleaning arm washes the crates. Afterwards, the label press attaches a label to each crate. The crates leave without paint or packaging.',
 sequence:['wash','label'],final:{washed:true,painted:false,labelled:true,labelSurface:'item',packed:false},named:[0,1],skillHe:'מבצעים מפורשים ודרישות שליליות על התוצר'}),
 authored({id:'plain-protection',titleHe:'אריזה בלי קישוטים',chapter:1,layout:5,receiver:'panel',count:3,
 text:'The display panels are washed before they are packed. No label is needed, and the panels must remain unpainted. A sealed package protects the clean surface.',
 sequence:['wash','pack'],final:{washed:true,packed:true,painted:false,labelled:false},skillHe:'מבצע מושמט אינו פעולה חסרה; מעקב אחרי they'}),
 authored({id:'tag-the-unit',titleHe:'התג של היחידה',chapter:1,layout:6,receiver:'service-arm',count:1,
 text:'The cleaning arm washes the service arm. A label is then attached to the service arm itself. Send the unit without a package and without paint.',
 sequence:['wash','label'],final:{washed:true,painted:false,labelled:true,labelSurface:'item',packed:false},named:[0],skillHe:'הבחנה בין זרוע פועלת לזרוע שמקבלת טיפול'}),
 authored({id:'blue-nameplates',titleHe:'לוחות כחולים עם שם',chapter:1,layout:8,receiver:'panel',count:2,
 text:'The painter coats the display panels, and the label press labels them afterwards. Keep their original unwashed surface. The panels are displayed without packages.',
 sequence:['paint','label'],final:{washed:false,painted:true,labelled:true,labelSurface:'item',packed:false},named:[0,1],skillHe:'them ו־their מתייחסים ללוחות; תכונה שלילית קובעת בחירה'}),
 authored({id:'wrapped-blue-order',titleHe:'הצבע בפנים, התווית בחוץ',chapter:1,layout:0,receiver:'crate',count:3,
 text:'The painter paints the crates. They are packed after painting. Only then are labels attached to the packages, so the dispatch team can read them outside.',
 alternateText:'The crates are painted by the painter. They are packed after painting. Only then are labels attached to the packages, so the dispatch team can read them outside.',
 sequence:['paint','pack','label'],final:{painted:true,packed:true,labelled:true,labelSurface:'package'},named:[0],skillHe:'שינוי מוקד פעיל וסביל שומר את אותה שרשרת'}),
 // Chapter 3: drying changes material state, and curing requires paint to exist.
 authored({id:'dry-wood',titleHe:'עץ יבש למשלוח',chapter:2,layout:1,receiver:'crate',count:2,
 text:'The crates are washed first. The dryer dries them before they leave. Their wood stays unpainted, and no label or package is added.',
 sequence:['wash','dry'],final:{washed:true,dried:true,painted:false,paintCured:false,labelled:false,packed:false},named:[1],skillHe:'ייבוש חומר אינו קיבוע צבע שאינו קיים'}),
 authored({id:'cured-panels',titleHe:'הצבע צריך להתקבע',chapter:2,layout:5,receiver:'panel',count:3,
 text:'The cleaning arm washes the display panels before the painter coats them. The fresh paint is then cured in the dryer. Send the dry panels unpacked.',
 sequence:['wash','paint','dry'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,packed:false},named:[0,1,2],skillHe:'הצבע הוא מקבל פעולת הקיבוע; סדר משנה מצב אמיתי'}),
 authored({id:'wet-coat-demonstration',titleHe:'דוגמה של צבע טרי',chapter:2,layout:8,receiver:'crate',count:1,
 text:'For the demonstration, the crate is washed and dried before the painter paints it. The final blue coat must remain uncured. Leave the crate unpacked so visitors can inspect it.',
 sequence:['wash','dry','paint'],final:{washed:true,painted:true,paintBonded:true,dried:false,paintCured:false,packed:false},named:[2],skillHe:'before משנה את סדר הייבוש; הדרישה השלילית מתארת את הצבע הסופי'}),
 authored({id:'dry-service-return',titleHe:'זרוע נקייה, בלי צבע',chapter:2,layout:6,receiver:'service-arm',count:2,
 text:'The service arms are washed and then dried. They are returned without paint, labels or packages. The cleaning arm performs the washing; the service arms receive it.',
 sequence:['wash','dry'],final:{washed:true,dried:true,painted:false,labelled:false,packed:false},named:[0],skillHe:'נושא סביל שונה ממבצע הפעולה המפורש'}),
 authored({id:'two-drying-stages',titleHe:'שני תפקידים למייבש',chapter:2,layout:7,receiver:'panel',count:2,
 text:'First, the panels are washed and dried. Next, the painter coats them. Finally, the new coating is cured by drying the panels again. They leave without packages.',
 sequence:['wash','dry','paint','dry'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,packed:false},named:[2],skillHe:'again דורש שלב שני; ייבוש מוקדם לא מקבע צבע מאוחר'}),
 // Chapter 4: longer reference chains and physically meaningful counterexamples.
 authored({id:'cure-before-paper',titleHe:'קודם צבע יציב, אחר כך נייר',chapter:3,layout:3,receiver:'crate',count:3,
 text:'The crates are washed before painting. Once the painter coats them, the dryer cures the paint. Labels are attached afterwards, and the labelled crates are finally packed.',
 sequence:['wash','paint','dry','label','pack'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'item',packed:true},named:[1,2],skillHe:'שרשרת them והקשר בין שלב לתוצר שלו'}),
 authored({id:'paper-removal-test',titleHe:'בדיקת הסרת נייר',chapter:3,layout:5,receiver:'panel',count:2,
 text:'A test label is attached to each panel before washing. Washing removes that paper. The panels are dried, and a new label is attached to the bare panel. Keep them unpainted and unpacked.',
 sequence:['label','wash','dry','label'],final:{washed:true,dried:true,painted:false,labelled:true,labelSurface:'item',packed:false},skillHe:'that paper ו־a new label מסמנים תווית שהוסרה ואחרת שנוספה'}),
 authored({id:'arm-cure-and-tag',titleHe:'הזרוע מוכנה לזיהוי',chapter:3,layout:2,receiver:'service-arm',count:2,
 text:'Each service arm is washed and then painted by the painter. Its paint is cured before the label press attaches an identity label to the arm. The arm leaves without a package.',
 sequence:['wash','paint','dry','label'],final:{washed:true,painted:true,paintBonded:true,paintCured:true,dried:true,labelled:true,labelSurface:'item',packed:false},named:[1,3],skillHe:'its paint ו־the arm: מעקב אחר החלק והציפוי שלו'}),
 authored({id:'strip-the-trial-coat',titleHe:'הצבע היה רק לבדיקה',chapter:3,layout:8,receiver:'crate',count:2,
 text:'The painter applies a trial coat to the crate. The crate is then washed, removing that coat. The clean wood is then dried and packed. The finished crate has no paint or label.',
 sequence:['paint','wash','dry','pack'],final:{washed:true,painted:false,paintCured:false,dried:true,labelled:false,packed:true},named:[0],skillHe:'משפט סיום שלילי ושינוי מצב באמצע התהליך'}),
 authored({id:'outside-after-curing',titleHe:'התג הגלוי של הלוחות',chapter:3,layout:7,receiver:'panel',count:4,
 text:'The panels are washed, painted and dried in that order. After they are sealed in packages, the label press adds an outside label. The coating must be cured before packing.',
 sequence:['wash','paint','dry','pack','label'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,packed:true,labelled:true,labelSurface:'package'},named:[4],transfer:true,skillHe:'העברה למוצר ולמיקום תווית שונים; סדר מפורש'}),
 // Chapter 5: real footprint caps and partial orders with several valid solutions.
 authored({id:'compact-clear-panel',titleHe:'קו קטן לחומר נקי',chapter:4,layout:0,receiver:'panel',count:3,maxPieces:11,
 text:'The panels are washed and dried before packing. A label is attached outside each package. Keep the panels unpainted. Fit the complete working line within the available piece budget.',
 sequence:['wash','dry','pack','label'],final:{washed:true,dried:true,painted:false,packed:true,labelled:true,labelSurface:'package'},skillHe:'קריאת מגבלה נפרדת על הבנייה ועל התוצר'}),
 authored({id:'compact-cured-crates',titleHe:'ציפוי בקו קומפקטי',chapter:4,layout:1,receiver:'crate',count:3,maxPieces:11,
 text:'The cleaning arm washes the crates, the painter coats them, and the dryer cures the coating. After curing, labels are attached to the crates before packing. Use a compact continuous line.',
 sequence:['wash','paint','dry','label','pack'],final:{washed:true,painted:true,paintBonded:true,paintCured:true,dried:true,labelled:true,labelSurface:'item',packed:true},named:[0,1,2],skillHe:'שלושה מבצעים ואותו מקבל; תכנון תחת תקציב חלקים'}),
 authored({id:'either-after-paint',titleHe:'שתי פעולות יכולות להתחלף',chapter:4,layout:6,receiver:'service-arm',count:2,
 text:'The service arms are washed before painting. After painting, they are dried and labelled; either of these two jobs may come first. Both jobs are completed before the arms are packed.',
 sequence:['wash','paint','dry','label','pack'],order:[[0,1],[1,2],[1,3],[2,4],[3,4]],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'item',packed:true},skillHe:'and אינו תמיד רצף יחיד; both קובע שני תנאים'}),
 authored({id:'two-jobs-before-sealing',titleHe:'לפני האטימה',chapter:4,layout:1,receiver:'panel',count:2,maxPieces:11,
 text:'The panels are washed. They need drying and an identity label before they are packed. Drying and labelling may be done in either order. The panels must leave without paint.',
 sequence:['wash','dry','label','pack'],order:[[0,1],[0,2],[1,3],[2,3]],final:{washed:true,dried:true,painted:false,labelled:true,labelSurface:'item',packed:true},skillHe:'either order מאפשר יותר מקו נכון אחד'}),
 authored({id:'compact-wet-finish',titleHe:'הציפוי הסופי נשאר טרי',chapter:4,layout:0,receiver:'crate',count:2,maxPieces:11,
 text:'Wash and dry the crates before the painter coats them. The final paint remains uncured. Attach labels to the crates after painting, then pack them. Keep the route within the piece budget.',
 sequence:['wash','dry','paint','label','pack'],final:{washed:true,painted:true,paintBonded:true,dried:false,paintCured:false,labelled:true,labelSurface:'item',packed:true},named:[2],transfer:true,skillHe:'שלילת קיבוע סופי מבדילה בין שתי עמדות ייבוש אפשריות'}),
 // Chapter 6: opening is an effective physical operation, never a word-only quiz.
 authored({id:'open-for-tagging',titleHe:'פותחים כדי לתייג',chapter:5,layout:5,receiver:'crate',count:2,
 text:'The crates are packed for a fitting check. The unpacker then opens the packages. An identity label is attached directly to each crate, and the crates leave unpacked.',
 sequence:['pack','unpack','label'],final:{packed:false,labelled:true,labelSurface:'item'},named:[1],skillHe:'פתיחה מחזירה גישה לחפץ; directly קובע מיקום תווית'}),
 authored({id:'open-before-paint',titleHe:'הצובע צריך להגיע פנימה',chapter:5,layout:8,receiver:'panel',count:2,
 text:'The panels are washed and packed before the trial delivery. Open their packages before the painter coats the panels. Send the painted panels unpacked; the packages are not painted.',
 sequence:['wash','pack','unpack','paint'],final:{washed:true,painted:true,paintBonded:true,packed:false},named:[3],skillHe:'חפץ ואריזה הם מקבלים שונים; פעולה על תוכן אטום אינה יעילה'}),
 authored({id:'keep-the-inner-id',titleHe:'התג הפנימי נשאר',chapter:5,layout:6,receiver:'service-arm',count:2,
 text:'Each service arm is washed and receives an identity label before packing. The package is then opened for inspection. Keep that label on the arm, and send the arm without its package.',
 sequence:['wash','label','pack','unpack'],final:{washed:true,labelled:true,itemLabelled:true,labelSurface:'item',packed:false},skillHe:'that label מתייחס לתג הפנימי שנשמר בפתיחה'}),
 authored({id:'replace-the-wrapper-tag',titleHe:'מחליפים תג אריזה',chapter:5,layout:3,receiver:'crate',count:3,
 text:'Pack each crate and attach a temporary label outside. Opening the package removes that label. After opening, attach a new label to the crate itself. The crate leaves unpacked.',
 sequence:['pack','label','unpack','label'],final:{packed:false,labelled:true,labelSurface:'item',itemLabelled:true},skillHe:'שתי תוויות בשני מקומות; that ו־a new אינם אותה הופעה'}),
 authored({id:'return-to-clean-material',titleHe:'חוזרים לחומר הנקי',chapter:5,layout:7,receiver:'panel',count:3,
 text:'The panels are packed and labelled outside for a delivery test. They are then unpacked, washed and dried before being packed again. The final packages have no labels, and the panels have no paint.',
 sequence:['pack','label','unpack','wash','dry','pack'],final:{washed:true,dried:true,painted:false,labelled:false,packed:true},transfer:true,skillHe:'again דורש אריזה שנייה אחרי פתיחה ותיקון'}),
 // Chapter 7: genuine rework, preserving or replacing state for a reason.
 authored({id:'replace-the-faulty-coat',titleHe:'מחליפים ציפוי שנכשל',chapter:6,layout:8,receiver:'crate',count:2,
 text:'The crates are washed, painted and packed for inspection. Open them and wash off the first coat. The painter adds a new coat; it is dried before labels are attached. Send the crates unpacked.',
 sequence:['wash','paint','pack','unpack','wash','paint','dry','label'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'item',packed:false},named:[5],skillHe:'first coat ו־a new coat דורשים תיקון ולא רק מצב סופי'}),
 authored({id:'inside-id-outside-dispatch',titleHe:'שתי שכבות של מידע',chapter:6,layout:5,receiver:'panel',count:3,
 text:'Label each panel before packing. Add a temporary package label, then open the package and discard only that outside label. Repack the panel with its identity label still inside. Attach a fresh dispatch label outside.',
 sequence:['label','pack','label','unpack','pack','label'],final:{packed:true,labelled:true,labelSurface:'package',itemLabelled:true},skillHe:'only מגביל מה מוסר; תג פנימי וחיצוני יכולים להתקיים יחד'}),
 authored({id:'serial-tag-after-inspection',titleHe:'המספר נוסף אחרי הבדיקה',chapter:6,layout:2,receiver:'service-arm',count:2,
 text:'The service arms are washed, painted and dried before the first packing. Open the packages for inspection. Only after opening does the label press attach a label to each arm. Repack the labelled arms.',
 sequence:['wash','paint','dry','pack','unpack','label','pack'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'item',itemLabelled:true,packed:true},named:[5],skillHe:'only after מגדיר תווית פנימית שנוספה מאוחר'}),
 authored({id:'open-the-unwashed-sample',titleHe:'דוגמה בלי שטיפה',chapter:6,layout:7,receiver:'panel',count:1,
 text:'The unwashed panel is packed and labelled outside for a demonstration. Open the package before painting the panel. Cure the new paint and pack the panel again. Its original surface remains unwashed; no label remains.',
 sequence:['pack','label','unpack','paint','dry','pack'],final:{washed:false,painted:true,paintBonded:false,dried:true,paintCured:true,labelled:false,packed:true},skillHe:'שלילה נשמרת גם בתהליך ארוך; קיבוע והיצמדות שונים'}),
 authored({id:'cure-then-strip',titleHe:'בדיקת ציפוי חוזרת',chapter:6,layout:3,receiver:'crate',count:3,
 text:'The crates are washed before they receive a trial coat. That coat is cured before it is washed off. Dry the bare crates, attach labels to them, and pack them. The finished crates contain no paint.',
 sequence:['wash','paint','dry','wash','dry','label','pack'],final:{washed:true,painted:false,paintCured:false,dried:true,labelled:true,labelSurface:'item',packed:true},skillHe:'that coat ו־it עוקבים אחרי ציפוי שנעלם בהמשך'}),
 // Chapter 8: inspection chains, not repeated short recipes with a higher count.
 authored({id:'open-and-retag',titleHe:'תג חדש אחרי פתיחה',chapter:7,layout:8,receiver:'panel',count:2,
 text:'The panels are washed, painted and dried. An identity label is attached before packing. Open the packages for a check, then apply a replacement label directly to the panels. Leave them unpacked.',
 sequence:['wash','paint','dry','label','pack','unpack','label'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'item',itemLabelled:true,packed:false},skillHe:'replacement מתאר הופעה חדשה של פעולה אחרי בדיקה'}),
 authored({id:'cover-the-fit-label',titleHe:'הצבע מכסה את תג הבדיקה',chapter:7,layout:5,receiver:'crate',count:2,
 text:'Wash the crates and attach a label for a fit check. Pack and then reopen them. The painter coats the crates, covering the old label. Cure the paint, repack the crates, and label the outside packages.',
 sequence:['wash','label','pack','unpack','paint','dry','pack','label'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'package',itemLabelled:false,packed:true},named:[4],skillHe:'פעולה חדשה משנה מה נשאר מהשלב הקודם'}),
 authored({id:'pressure-check-panels',titleHe:'בדיקת אטימה לפני הצביעה',chapter:7,layout:7,receiver:'panel',count:3,
 text:'Pack the panels for a sealing check, then open the packages. The panels are washed and dried before painting. The new coating is dried too. Finally, pack the panels and attach labels outside.',
 sequence:['pack','unpack','wash','dry','paint','dry','pack','label'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,packed:true,labelled:true,labelSurface:'package'},skillHe:'too מוסיף ייבוש שני לחומר שכבר השתנה'}),
 authored({id:'repair-the-tagged-unit',titleHe:'מתקנים יחידה מתויגת',chapter:7,layout:6,receiver:'service-arm',count:2,
 text:'Wash each service arm, pack it and attach a temporary label outside. Reopen the package before painting the arm. After its paint is cured, attach an identity label directly to the arm and pack it again.',
 sequence:['wash','pack','label','unpack','paint','dry','label','pack'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'item',itemLabelled:true,packed:true},skillHe:'it ו־its נשארים עם הזרוע גם כשאריזתה מוסרת'}),
 authored({id:'inspection-keeps-the-label',titleHe:'הבדיקה אינה מוחקת זהות',chapter:7,layout:3,receiver:'crate',count:4,
 text:'The crates are washed and painted, and the paint is cured. Label the crates before packing. Open their packages for inspection, keeping the labels on the crates, then seal the crates again. No outside label is added.',
 sequence:['wash','paint','dry','label','pack','unpack','pack'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'item',itemLabelled:true,packed:true},transfer:true,skillHe:'שמירת תג פנימי לצד דרישה שלילית על התג החיצוני'}),
 // Chapter 9: five authored exhibition commissions and a finite final shipment.
 authored({id:'exhibition-crate-relabel',titleHe:'ארגז התערוכה חוזר לבדיקה',chapter:8,layout:8,receiver:'crate',count:3,
 text:'Wash, paint and dry the exhibition crates before packing. Label the packages for inspection. Open them and replace the discarded outside labels with labels on the crates themselves. Repack the crates; their labels must now be inside.',
 sequence:['wash','paint','dry','pack','label','unpack','label','pack'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'item',itemLabelled:true,packed:true},skillHe:'now משנה את הדרישה למיקום התווית אחרי תיקון'}),
 authored({id:'exhibition-bare-panels',titleHe:'בתערוכה רואים את החומר',chapter:8,layout:7,receiver:'panel',count:3,
 text:'Dry the panels before applying a trial coat. Wash that coat off, then dry and label the bare panels. Pack them for a check, open the packages, and pack them again. The exhibition panels must finish unpainted.',
 sequence:['dry','paint','wash','dry','label','pack','unpack','pack'],final:{washed:true,painted:false,paintCured:false,dried:true,labelled:true,labelSurface:'item',itemLabelled:true,packed:true},skillHe:'דרישה סופית מנוגדת למצב ביניים; שתי אריזות שונות'}),
 authored({id:'exhibition-preserve-the-id',titleHe:'שומרים את זהות הזרוע',chapter:8,layout:6,receiver:'service-arm',count:2,
 text:'The service arms are washed, painted and dried. Label each arm before packing, then add an outside label for a transport test. Open the package, discard its outside label and seal it again. The arm must keep its inside identity label.',
 sequence:['wash','paint','dry','label','pack','label','unpack','pack'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'item',itemLabelled:true,packed:true},skillHe:'its outside label שונה מ־its inside identity label'}),
 authored({id:'exhibition-returned-shipment',titleHe:'המשלוח שחזר לסדנה',chapter:8,layout:5,receiver:'crate',count:4,
 text:'Pack the crates and attach temporary outside labels for a route test. Open the returned packages. The crates are then washed, painted and dried. Repack them and attach new labels outside the final packages.',
 sequence:['pack','label','unpack','wash','paint','dry','pack','label'],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'package',itemLabelled:false,packed:true},transfer:true,skillHe:'returned ו־final מבחינים בין שני סבבי אותו משלוח'}),
 authored({id:'foundry-exhibition-finale',titleHe:'משלוח הגמר לתערוכה',chapter:8,layout:8,receiver:'service-arm',count:3,
 text:'The cleaning arm washes the service arms before the painter coats them. Cure the paint and attach an identity label to each arm; either job may come first. Pack the arms, open the packages for inspection, and seal them again without losing their identity labels. Finally, attach a dispatch label outside every package.',
 sequence:['wash','paint','dry','label','pack','unpack','pack','label'],order:[[0,1],[1,2],[1,3],[2,4],[3,4],[4,5],[5,6],[6,7]],final:{washed:true,painted:true,paintBonded:true,dried:true,paintCured:true,labelled:true,labelSurface:'package',itemLabelled:true,packed:true},named:[0,1],transfer:true,skillHe:'שילוב תפקידים, סדר חלקי, שימור מידע ותג כפול במשלוח סופי'})
);

export const TOOL_DESCRIPTIONS: Record<
  Operation,
  { title: string; description: string; he: string }
> = {
  wash: {
    title: "Cleaning arm",
    description:
      "Washes an unpacked item. Water removes paint and paper labels.",
    he: "זרוע ניקוי",
  },
  paint: {
    title: "Painter",
    description:
      "Coats an unpacked item blue. Paint bonds to clean material and covers paper labels.",
    he: "צובע",
  },
  label: {
    title: "Label press",
    description:
      "Attaches a paper label. After packing, it labels the outside of the package.",
    he: "מכבש תוויות",
  },
  pack: {
    title: "Packer",
    description:
      "Seals an item in a package. Open it before washing, painting or drying its contents.",
    he: "אורז",
  },
  dry: {
    title: "Dryer",
    description: "Dries an unpacked item and cures paint already on it. A later wash or new coat clears this dry state.",
    he: "מייבש",
  },
  unpack: {
    title: "Unpacker",
    description: "Opens a package. Its outside label is discarded; a label on the item is retained.",
    he: "פותח אריזות",
  },
};

export const VOCABULARY: Record<string, string> = {
  unwashed:"ללא שטיפה", unlabelled:"ללא תווית", cure:"לקבע צבע", curing:"קיבוע צבע",
  fit:"התאמה", fitting:"בדיקת התאמה", surface:"משטח", bare:"חשוף", fresh:"טרי",
  each:"כל אחד", only:"רק", once:"לאחר ש־", pressure:"לחץ", protect:"להגן",
  dryer:"מייבש", dry:"יבש / לייבש", dries:"מייבש", dried:"מיובש / מיובשים",
  cured:"צבע שהתקבע בייבוש", uncured:"צבע שעדיין לא קובע", coating:"ציפוי", coat:"שכבת צבע",
  unpack:"לפתוח אריזה", unpacker:"פותח אריזות", open:"לפתוח", opens:"פותח", reopen:"לפתוח שוב",
  sealed:"אטום באריזה", seal:"לאטום", repack:"לארוז מחדש", inside:"בפנים", directly:"ישירות",
  identity:"זהות", temporary:"זמני", discard:"להשליך", discarded:"הושלך", retained:"נשמר",
  again:"שוב", either:"כל אחת משתי האפשרויות", both:"שניהם / שתיהן", without:"ללא",
  remain:"להישאר", original:"מקורי", trial:"ניסיוני", inspection:"בדיקה", replacement:"תחליף",
  exhibition:"תערוכה", dispatch:"שילוח", afterwards:"לאחר מכן",
  first: "ראשית",
  next: "לאחר מכן",
  then: "ואז",
  keep: "השאירו",
  wood: "עץ",
  unpainted: "ללא צבע",
  cleaning: "ניקוי",
  washing: "שטיפה",
  painting: "צביעה",
  label: "תווית",
  packing: "אריזה",
  display: "תצוגה",
  service: "שירות",
  send: "שלחו",
  exit: "מוצא",
  crate: "ארגז",
  arm: "זרוע",
  crates: "ארגזים",
  washed: "נשטפים / נשטף",
  washes: "שוטף",
  painted: "נצבע / נצבעים",
  painter: "צובע",
  coats: "מצפה בצבע",
  labels: "תוויות",
  attached: "מוצמדות",
  before: "לפני",
  after: "אחרי",
  finally: "לבסוף",
  packed: "נארזים / נארז",
  unpacked: "ללא אריזה",
  panels: "לוחות",
  package: "אריזה",
  outside: "החלק החיצוני",
  they: "הם / הן — בדקו למה הכינוי מתייחס",
  them: "אותם / אותן — בדקו למה הכינוי מתייחס",
};

/** Call before selecting a contract or shuffling any surface details. */
export function validateContracts(contracts: Contract[] = CONTRACTS): string[] {
  const ids = new Set<string>(), texts = new Set<string>();
  const campaignErrors: string[] = [];
  if (contracts.length !== 45) campaignErrors.push("campaign:expected-45-contracts");
  const counts = Array.from({length:9},()=>0);
  const errors = contracts.flatMap((contract,index) => {
    const errors = validateSpec(contract.spec).map(
      (error) => `${contract.id}:${error}`,
    );
    if (contract.count < 1 || contract.count > 4 || !Number.isInteger(contract.count))
      errors.push(`${contract.id}:invalid-count`);
    if (!contract.id.trim() || ids.has(contract.id)) errors.push(`${contract.id}:duplicate-or-empty-id`);
    ids.add(contract.id);
    if (!contract.text.trim() || texts.has(contract.text.trim())) errors.push(`${contract.id}:duplicate-or-empty-text`);
    texts.add(contract.text.trim());
    if (!Number.isInteger(contract.chapter) || contract.chapter<0 || contract.chapter>8 || contract.chapter!==Math.floor(index/5)) errors.push(`${contract.id}:invalid-chapter`);
    else counts[contract.chapter]++;
    if (!Number.isInteger(contract.layout)||contract.layout<0||contract.layout>8||(index<5&&contract.layout!==index)) errors.push(`${contract.id}:invalid-layout`);
    if ([2,6].includes(contract.layout)&&contract.spec.receiver==='panel') errors.push(`${contract.id}:panel-on-dual-source-layout`);
    if (contract.spec.steps.length<1||contract.spec.steps.length>8) errors.push(`${contract.id}:invalid-stage-count`);
    const available=new Set(contract.availableMachines);
    if(available.size!==contract.availableMachines.length||contract.availableMachines.some(op=>!(op in OPERATION_AGENTS)))errors.push(`${contract.id}:invalid-machine-palette`);
    if(contract.spec.steps.some(step=>!available.has(step.action)))errors.push(`${contract.id}:unavailable-required-operation`);
    const unlocked=CHAPTERS[contract.chapter]?.unlockedOperations??[];
    if(contract.availableMachines.some(op=>!unlocked.includes(op)))errors.push(`${contract.id}:locked-machine`);
    if(contract.spec.steps.some(step=>step.agent!==undefined&&step.agent!==OPERATION_AGENTS[step.action]))errors.push(`${contract.id}:unavailable-named-agent`);
    if(contract.maxPieces!==undefined&&(!Number.isInteger(contract.maxPieces)||contract.maxPieces<Math.max(9,contract.spec.steps.length)||contract.maxPieces>63))errors.push(`${contract.id}:invalid-piece-budget`);
    if(!Object.values(SOURCES).includes(contract.source as typeof SOURCES.roles))errors.push(`${contract.id}:unknown-curriculum-source`);
    if (
      contract.equivalentSpec &&
      JSON.stringify(contract.spec) !== JSON.stringify(contract.equivalentSpec)
    )
      errors.push(`${contract.id}:unequal-paraphrase`);
    if (contract.receiverAlternative)
      errors.push(
        ...validateSpec(contract.receiverAlternative.spec).map(
          (error) => `${contract.id}:alternative:${error}`,
        ),
      );
    return errors;
  });
  if(counts.some(count=>count!==5))campaignErrors.push("campaign:expected-five-per-chapter");
  return [...campaignErrors,...errors];
}
