/** Authored meaning, separate from sentence wording, grid layout and rendering.
 * This is an oracle for the five verified contracts, not an English parser.
 */
export type Operation = "wash" | "paint" | "label" | "pack";
export type Receiver = "crate" | "service-arm" | "panel";
export type LabelSurface = "item" | "package" | null;

export const OPERATION_AGENTS: Readonly<Record<Operation, string>> = {
  wash: "cleaning-arm",
  paint: "painter",
  label: "label-press",
  pack: "packing-press",
};

/** Backwards-compatible descriptive alias for callers. */
export const DEFAULT_AGENTS = OPERATION_AGENTS;

export interface ProductionEvent {
  action: Operation;
  receiver: Receiver;
  agent: string;
  effect: "washed" | "painted" | "labelled" | "packed" | "sealed";
  removedPaint?: boolean;
  removedLabel?: boolean;
}

export interface Product {
  receiver: Receiver;
  washed: boolean;
  painted: boolean;
  paintBonded: boolean;
  labelled: boolean;
  labelSurface: LabelSurface;
  packed: boolean;
  history: ProductionEvent[];
}

export interface SemanticStep {
  id: string;
  action: Operation;
  receiver: Receiver;
  /** Omission means the contract does not restrict the worker's identity. */
  agent?: string;
}

export type ProductProperties = Pick<
  Product,
  "washed" | "painted" | "paintBonded" | "labelled" | "labelSurface" | "packed"
>;

export interface ProductionSpec {
  receiver: Receiver;
  final: Partial<ProductProperties>;
  steps: SemanticStep[];
  /** [earlier step id, later step id], a partial order rather than a fixed belt. */
  before: [string, string][];
}

export interface ProductCheck {
  accepted: boolean;
  reasons: string[];
}

export function makeProduct(receiver: Receiver): Product {
  return {
    receiver,
    washed: false,
    painted: false,
    paintBonded: false,
    labelled: false,
    labelSurface: null,
    packed: false,
    history: [],
  };
}

/** Each machine changes the physical product. Washing removes paint and paper;
 * paint adheres only to clean material. Packing seals the item. A press can label
 * a sealed package, so labelling before and after packing have distinct results.
 * An arm on the conveyor is a detached workpiece; the fixed painter remains agent.
 */
export function applyOperation(
  product: Product,
  action: Operation,
  agent = OPERATION_AGENTS[action],
): Product {
  const next: Product = { ...product, history: [...product.history] };
  const event: ProductionEvent = {
    action,
    agent,
    receiver: product.receiver,
    effect: "sealed",
  };
  if (action === "label") {
    next.labelled = true;
    next.labelSurface = next.packed ? "package" : "item";
    event.effect = "labelled";
  } else if (action === "pack") {
    next.packed = true;
    event.effect = "packed";
  } else if (!product.packed && action === "wash") {
    event.effect = "washed";
    event.removedPaint = product.painted;
    event.removedLabel = product.labelled;
    next.washed = true;
    next.painted = false;
    next.paintBonded = false;
    next.labelled = false;
    next.labelSurface = null;
  } else if (!product.packed && action === "paint") {
    event.effect = "painted";
    event.removedLabel = product.labelled;
    next.painted = true;
    next.paintBonded = product.washed;
    next.labelled = false;
    next.labelSurface = null;
  }
  next.history.push(event);
  return next;
}

function matchingEvent(event: ProductionEvent, step: SemanticStep): boolean {
  return (
    event.action === step.action &&
    event.receiver === step.receiver &&
    (step.agent === undefined || event.agent === step.agent) &&
    event.effect !== "sealed"
  );
}

/** True if distinct observed operations can witness the authored truth graph.
 * Reworking an item is permitted: a corrected wash→paint chain can follow an
 * earlier mistake. Final properties still reject paint/labels washed off later.
 */
export function witnessesGraph(
  history: ProductionEvent[],
  spec: ProductionSpec,
): boolean {
  const candidates = spec.steps.map((step) =>
    history.flatMap((event, i) => (matchingEvent(event, step) ? [i] : [])),
  );
  if (candidates.some((items) => items.length === 0)) return false;
  const assigned = new Map<string, number>();
  const used = new Set<number>();
  const search = (index: number): boolean => {
    if (index === spec.steps.length) return true;
    const step = spec.steps[index];
    for (const eventIndex of candidates[index]) {
      if (used.has(eventIndex)) continue;
      assigned.set(step.id, eventIndex);
      const valid = spec.before.every(
        ([a, b]) =>
          !assigned.has(a) ||
          !assigned.has(b) ||
          assigned.get(a)! < assigned.get(b)!,
      );
      if (valid) {
        used.add(eventIndex);
        if (search(index + 1)) return true;
        used.delete(eventIndex);
      }
      assigned.delete(step.id);
    }
    return false;
  };
  return search(0);
}

export function checkProduct(
  product: Product,
  spec: ProductionSpec,
): ProductCheck {
  const reasons: string[] = [];
  if (product.receiver !== spec.receiver)
    reasons.push(`receiver:${spec.receiver}`);
  for (const [key, expected] of Object.entries(spec.final)) {
    if (product[key as keyof ProductProperties] !== expected)
      reasons.push(`final:${key}`);
  }
  if (!witnessesGraph(product.history, spec))
    reasons.push("process:roles-or-order");
  return { accepted: reasons.length === 0, reasons };
}

export function validateSpec(spec: ProductionSpec): string[] {
  const errors: string[] = [];
  const ids = spec.steps.map((step) => step.id);
  if (new Set(ids).size !== ids.length) errors.push("duplicate-step-id");
  if (spec.steps.some((step) => step.receiver !== spec.receiver))
    errors.push("receiver-mismatch");
  if (spec.before.some(([a, b]) => !ids.includes(a) || !ids.includes(b)))
    errors.push("unknown-order-step");
  const reaches = (
    start: string,
    target: string,
    seen = new Set<string>(),
  ): boolean => {
    if (seen.has(start)) return false;
    seen.add(start);
    return spec.before.some(
      ([a, b]) => a === start && (b === target || reaches(b, target, seen)),
    );
  };
  if (ids.some((id) => reaches(id, id))) errors.push("cyclic-order");
  if (spec.final.labelled === false && spec.final.labelSurface)
    errors.push("label-surface-without-label");
  return errors;
}

export interface PassiveFormFixture {
  number: "singular" | "plural";
  auxiliary: "is" | "are";
  action: Operation;
  participle: string;
}

const PARTICIPLES: Readonly<Record<Operation, string>> = {
  wash: "washed",
  paint: "painted",
  label: "labelled",
  pack: "packed",
};

/** Checks the limited authored present-passive forms used in this slice. The
 * participle's name does not change the tense: is/are supplies present tense.
 * This is content validation, not a quiz or an arbitrary-language parser.
 */
export function validatePassiveForm(fixture: PassiveFormFixture): boolean {
  const agreement =
    fixture.auxiliary === (fixture.number === "singular" ? "is" : "are");
  return agreement && fixture.participle === PARTICIPLES[fixture.action];
}
