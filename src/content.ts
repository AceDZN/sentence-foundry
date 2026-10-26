import type { Operation, ProductionSpec, Receiver } from './semantics';
import { validateSpec } from './semantics';

export const SOURCES = {
  roles: 'https://english.workbook.co.il/grade-8/chapter-7/who-does-it-and-what-is-done',
  process: 'https://english.workbook.co.il/grade-8/chapter-7/following-a-production-process',
} as const;

export interface Contract {
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
  receiverAlternative?: { text: string; spec: ProductionSpec; noun: string; nounHe: string };
}

const step = (id: string, action: Operation, receiver: Receiver, agent?: string) => ({ id, action, receiver, ...(agent ? { agent } : {}) });

export const FIRST_SPEC: ProductionSpec = {
  receiver: 'crate', final: { washed: true, painted: false, packed: false },
  steps: [step('wash', 'wash', 'crate', 'cleaning-arm')], before: [],
};
export const FOCUS_SPEC: ProductionSpec = {
  receiver: 'crate', final: { washed: true, painted: true, paintBonded: true, packed: false },
  steps: [step('wash', 'wash', 'crate', 'cleaning-arm'), step('paint', 'paint', 'crate', 'painter')],
  before: [['wash', 'paint']],
};
export const ARM_SPEC: ProductionSpec = {
  receiver: 'service-arm', final: { painted: true, packed: false },
  steps: [step('paint', 'paint', 'service-arm', 'painter')], before: [],
};
export const CRATE_PAINT_SPEC: ProductionSpec = {
  receiver: 'crate', final: { painted: true, packed: false },
  steps: [step('paint', 'paint', 'crate', 'painter')], before: [],
};
export const SEQUENCE_SPEC: ProductionSpec = {
  receiver: 'crate', final: { washed: true, painted: true, paintBonded: true, labelled: true, labelSurface: 'item', packed: true },
  steps: [step('wash', 'wash', 'crate', 'cleaning-arm'), step('paint', 'paint', 'crate', 'painter'),
    step('label', 'label', 'crate'), step('pack', 'pack', 'crate')],
  before: [['wash', 'paint'], ['paint', 'label'], ['label', 'pack']],
};
export const TRANSFER_SPEC: ProductionSpec = {
  receiver: 'panel', final: { washed: true, painted: false, labelled: true, labelSurface: 'package', packed: true },
  steps: [step('wash', 'wash', 'panel'), step('pack', 'pack', 'panel'), step('label', 'label', 'panel')],
  before: [['wash', 'pack'], ['pack', 'label']],
};

/** Original authored fixtures based on the saved Workbook comprehension scope. */
export const CONTRACTS: Contract[] = [
  {
    id: 'first-shipment', titleHe: 'משלוח ראשון',
    text: 'The cleaning arm washes the crate. Keep the wood unpainted and unpacked.',
    spec: FIRST_SPEC, count: 1, availableMachines: ['wash', 'paint', 'label', 'pack'],
    hintHe: 'חפשו מה עושה כל מכונה. חברו מסלול רציף מהכניסה למוצא. אפשר לעצור, לסובב ולנסות שוב.',
    skillHe: 'זיהוי מבצע הפעולה והחפץ שמקבל אותה', source: SOURCES.roles, transfer: false, noun: 'crate', nounHe: 'ארגז',
  },
  {
    id: 'same-work-new-focus', titleHe: 'אותה עבודה, מוקד חדש',
    text: 'First, the crates are washed by the cleaning arm. Then they are painted by the painter. Leave them unpacked.',
    alternateText: 'First, the cleaning arm washes the crates. Then the painter paints them. Leave them unpacked.',
    spec: FOCUS_SPEC, equivalentSpec: structuredClone(FOCUS_SPEC), count: 2,
    availableMachines: ['wash', 'paint', 'label', 'pack'],
    hintHe: 'בשני הניסוחים הארגזים מקבלים את אותן הפעולות. they ו־them מתייחסים לארגזים. צבע נצמד לעץ נקי.',
    skillHe: 'אותם תפקידים בפעיל ובסביל בהווה', source: SOURCES.roles, transfer: false, noun: 'crate', nounHe: 'ארגז',
  },
  {
    id: 'receiver-switch', titleHe: 'מי מקבל צבע?',
    text: 'The service arm is painted by the painter. Send it to the exit unpacked.',
    spec: ARM_SPEC, count: 1, availableMachines: ['wash', 'paint', 'label', 'pack'],
    receiverAlternative: {
      text: 'The painter paints the crate. Send it to the exit unpacked.', spec: CRATE_PAINT_SPEC, noun: 'crate', nounHe: 'ארגז',
    },
    hintHe: 'הזרוע שעל המסוע היא חלק נשלף. הצובע הקבוע מפעיל צבע. בדקו על מי כתוב שהצבע נעשה.',
    skillHe: 'החלפת מקבל הפעולה משנה את החפץ שיש לנתב', source: SOURCES.roles, transfer: false, noun: 'service arm', nounHe: 'זרוע שירות',
  },
  {
    id: 'sequence-and-reference', titleHe: 'לא שוטפים את התווית',
    text: 'First, the crates are washed by the cleaning arm. Next, the painter coats them. Labels are attached to the crates after painting. Finally, they are packed.',
    spec: SEQUENCE_SPEC, count: 3, availableMachines: ['wash', 'paint', 'label', 'pack'],
    hintHe: 'them ו־they מתייחסים לארגזים. שטיפה מסירה צבע ונייר, צבע מכסה תווית, ואריזה סוגרת את הארגז.',
    skillHe: 'מעקב אחר אותו חומר דרך סדר פעולות וכינויי גוף', source: SOURCES.process, transfer: false, noun: 'crate', nounHe: 'ארגז',
  },
  {
    id: 'new-workshop', titleHe: 'הזמנה בסדנה חדשה',
    text: 'The display panels are washed before packing. After they are packed, labels are attached to the outside of each package. Keep the panels unpainted.',
    spec: TRANSFER_SPEC, count: 3, availableMachines: ['wash', 'paint', 'label', 'pack'],
    hintHe: 'קראו שוב את החוזה. אפשר לעצור ולתכנן ללא קנס זמן.',
    skillHe: 'העברה למוצר חדש, סדר חדש ומבצע שאינו מצוין', source: SOURCES.process, transfer: true, noun: 'display panel', nounHe: 'לוח תצוגה',
  },
];

export const TOOL_DESCRIPTIONS: Record<Operation, { title: string; description: string; he: string }> = {
  wash: { title: 'Cleaning arm', description: 'Washes an unpacked item. Water removes paint and paper labels.', he: 'זרוע ניקוי' },
  paint: { title: 'Painter', description: 'Coats an unpacked item blue. Paint bonds to clean material and covers paper labels.', he: 'צובע' },
  label: { title: 'Label press', description: 'Attaches a paper label. After packing, it labels the outside of the package.', he: 'מכבש תוויות' },
  pack: { title: 'Packer', description: 'Seals an item in a package. The item can no longer be washed or painted.', he: 'אורז' },
};

export const VOCABULARY: Record<string, string> = {
  arm: 'זרוע', crate: 'ארגז', crates: 'ארגזים', washed: 'נשטפים / נשטף',
  washes: 'שוטף', painted: 'נצבע / נצבעים', painter: 'צובע', coats: 'מצפה בצבע',
  labels: 'תוויות', attached: 'מוצמדות', before: 'לפני', after: 'אחרי',
  finally: 'לבסוף', packed: 'נארזים / נארז', unpacked: 'ללא אריזה',
  panels: 'לוחות', package: 'אריזה', outside: 'החלק החיצוני',
  they: 'הם / הן — בדקו למה הכינוי מתייחס', them: 'אותם / אותן — בדקו למה הכינוי מתייחס',
};

/** Call before selecting a contract or shuffling any surface details. */
export function validateContracts(contracts: Contract[] = CONTRACTS): string[] {
  return contracts.flatMap(contract => {
    const errors = validateSpec(contract.spec).map(error => `${contract.id}:${error}`);
    if (contract.count < 1 || !Number.isInteger(contract.count)) errors.push(`${contract.id}:invalid-count`);
    if (contract.equivalentSpec && JSON.stringify(contract.spec) !== JSON.stringify(contract.equivalentSpec)) errors.push(`${contract.id}:unequal-paraphrase`);
    if (contract.receiverAlternative) errors.push(...validateSpec(contract.receiverAlternative.spec).map(error => `${contract.id}:alternative:${error}`));
    return errors;
  });
}
