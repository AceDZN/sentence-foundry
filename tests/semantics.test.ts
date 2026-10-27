import assert from "node:assert/strict";
import test from "node:test";
import {
  applyOperation,
  checkProduct,
  makeProduct,
  validatePassiveForm,
  validateSpec,
  type Operation,
  type ProductionSpec,
  type Receiver,
} from "../src/semantics";
import {
  ARM_SPEC,
  CONTRACTS,
  CRATE_PAINT_SPEC,
  FIRST_SPEC,
  FOCUS_SPEC,
  SEQUENCE_SPEC,
  TRANSFER_SPEC,
  validateContracts,
} from "../src/content";

const process = (receiver: Receiver, actions: Operation[]) =>
  actions.reduce(
    (product, action) => applyOperation(product, action),
    makeProduct(receiver),
  );

test("original five contracts retain their scope inside the validated campaign", () => {
  assert.deepEqual(validateContracts(), []);
  assert.equal(CONTRACTS.length, 45);
  assert.deepEqual(
    CONTRACTS.slice(0, 5).map((c) => c.count),
    [1, 2, 1, 3, 3],
  );
  assert.equal(CONTRACTS.slice(0, 5).filter((c) => c.transfer).length, 1);
});

test("first shipment requires actual cleaning and rejects paint as a substitute", () => {
  assert.equal(checkProduct(makeProduct("crate"), FIRST_SPEC).accepted, false);
  assert.equal(
    checkProduct(process("crate", ["paint"]), FIRST_SPEC).accepted,
    false,
  );
  assert.equal(
    checkProduct(process("crate", ["wash"]), FIRST_SPEC).accepted,
    true,
  );
});

test("active and passive focus preserve agent, action, receiver and acceptance", () => {
  const passive = CONTRACTS[1];
  assert.match(passive.text, /crates are washed by the cleaning arm/);
  assert.match(passive.alternateText!, /cleaning arm washes the crates/);
  const correct = process("crate", ["wash", "paint"]);
  const nearMiss = process("crate", ["paint", "wash"]);
  assert.equal(checkProduct(correct, passive.spec).accepted, true);
  assert.deepEqual(
    checkProduct(correct, passive.spec),
    checkProduct(correct, passive.equivalentSpec!),
  );
  assert.deepEqual(
    checkProduct(nearMiss, passive.spec),
    checkProduct(nearMiss, passive.equivalentSpec!),
  );
  assert.equal(checkProduct(nearMiss, passive.spec).accepted, false);
});

test("the arm being painted differs physically from the arm painting a crate", () => {
  const paintedArm = process("service-arm", ["paint"]);
  const paintedCrate = process("crate", ["paint"]);
  assert.equal(checkProduct(paintedArm, ARM_SPEC).accepted, true);
  assert.equal(checkProduct(paintedCrate, ARM_SPEC).accepted, false);
  assert.equal(checkProduct(paintedCrate, CRATE_PAINT_SPEC).accepted, true);
  assert.equal(checkProduct(paintedArm, CRATE_PAINT_SPEC).accepted, false);
  assert.equal(paintedArm.history[0].agent, "painter");
  assert.equal(paintedArm.history[0].receiver, "service-arm");
});

test("a named agent constraint is consequential, while omission does not invent one", () => {
  const ordinary = applyOperation(
    makeProduct("service-arm"),
    "paint",
    "painter",
  );
  const other = applyOperation(
    makeProduct("service-arm"),
    "paint",
    "spare-painter",
  );
  assert.equal(checkProduct(ordinary, ARM_SPEC).accepted, true);
  assert.equal(checkProduct(other, ARM_SPEC).accepted, false);
  const noNamedWorker: ProductionSpec = {
    receiver: "service-arm",
    final: { painted: true },
    steps: [{ id: "coat", action: "paint", receiver: "service-arm" }],
    before: [],
  };
  assert.equal(checkProduct(ordinary, noNamedWorker).accepted, true);
  assert.equal(checkProduct(other, noNamedWorker).accepted, true);
});

test("washing after labelling actually removes paper and reports the effect", () => {
  const labelled = process("crate", ["label"]);
  const washed = applyOperation(labelled, "wash");
  assert.equal(
    labelled.labelled,
    true,
    "the earlier immutable state stays intact",
  );
  assert.equal(washed.labelled, false);
  assert.equal(washed.labelSurface, null);
  assert.equal(washed.history.at(-1)!.removedLabel, true);
});

test("washing paint away does not leave a magically finished painted crate", () => {
  const result = process("crate", ["wash", "paint", "wash"]);
  assert.equal(result.washed, true);
  assert.equal(result.painted, false);
  assert.equal(result.history.at(-1)!.removedPaint, true);
  assert.equal(checkProduct(result, FOCUS_SPEC).accepted, false);
});

test("the process requires wash before paint: paint on dirty material is not bonded", () => {
  assert.equal(process("crate", ["paint"]).paintBonded, false);
  assert.equal(process("crate", ["wash", "paint"]).paintBonded, true);
  assert.equal(
    checkProduct(
      process("crate", ["paint", "wash", "label", "pack"]),
      SEQUENCE_SPEC,
    ).accepted,
    false,
  );
});

test("paint covers a label so label-before-paint is a real near miss", () => {
  const covered = process("crate", ["wash", "label", "paint", "pack"]);
  assert.equal(covered.labelled, false);
  assert.equal(covered.history[2].removedLabel, true);
  assert.equal(checkProduct(covered, SEQUENCE_SPEC).accepted, false);
});

test("the pronouns in contract four keep the crate as receiver throughout", () => {
  assert.match(CONTRACTS[3].text, /painter coats them/);
  assert.deepEqual(
    [...new Set(SEQUENCE_SPEC.steps.map((step) => step.receiver))],
    ["crate"],
  );
  assert.equal(
    checkProduct(
      process("crate", ["wash", "paint", "label", "pack"]),
      SEQUENCE_SPEC,
    ).accepted,
    true,
  );
  assert.equal(
    checkProduct(
      process("service-arm", ["wash", "paint", "label", "pack"]),
      SEQUENCE_SPEC,
    ).accepted,
    false,
  );
});

test("packing seals the material against later washing and painting", () => {
  const sealed = process("crate", ["pack", "wash", "paint"]);
  assert.equal(sealed.washed, false);
  assert.equal(sealed.painted, false);
  assert.equal(sealed.history[1].effect, "sealed");
  assert.equal(sealed.history[2].effect, "sealed");
  assert.equal(checkProduct(sealed, FOCUS_SPEC).accepted, false);
});

test("transfer changes nouns and dependencies: the label belongs outside the package", () => {
  const correct = process("panel", ["wash", "pack", "label"]);
  const oldOrder = process("panel", ["wash", "label", "pack"]);
  assert.equal(correct.labelSurface, "package");
  assert.equal(oldOrder.labelSurface, "item");
  assert.equal(checkProduct(correct, TRANSFER_SPEC).accepted, true);
  assert.equal(checkProduct(oldOrder, TRANSFER_SPEC).accepted, false);
  assert.equal(
    checkProduct(process("crate", ["wash", "pack", "label"]), TRANSFER_SPEC)
      .accepted,
    false,
  );
  assert.ok(TRANSFER_SPEC.steps.every((step) => step.agent === undefined));
});

test("same final properties do not excuse an explicitly wrong temporal relation", () => {
  const noPaintNeeded: ProductionSpec = {
    receiver: "crate",
    final: { washed: true, packed: true },
    steps: [
      { id: "a", action: "wash", receiver: "crate" },
      { id: "b", action: "pack", receiver: "crate" },
    ],
    before: [["b", "a"]],
  };
  assert.equal(
    checkProduct(process("crate", ["wash", "pack"]), noPaintNeeded).accepted,
    false,
  );
});

test("a repair is allowed to rebuild a valid effective chain after a mistake", () => {
  const repaired = process("crate", [
    "label",
    "paint",
    "wash",
    "paint",
    "label",
    "pack",
  ]);
  assert.equal(checkProduct(repaired, SEQUENCE_SPEC).accepted, true);
});

test("independent operation-sequence enumeration finds solutions for each contract", () => {
  const operations: Operation[] = ["wash", "paint", "label", "pack"];
  const words = (length: number): Operation[][] =>
    length === 0
      ? [[]]
      : words(length - 1).flatMap((prefix) =>
          operations.map((action) => [...prefix, action]),
        );
  const candidates = [...words(1), ...words(2), ...words(3), ...words(4)];
  const expectedShortest: Operation[][] = [
    ["wash"],
    ["wash", "paint"],
    ["paint"],
    ["wash", "paint", "label", "pack"],
    ["wash", "pack", "label"],
  ];
  for (const [index, contract] of CONTRACTS.slice(0, 5).entries()) {
    const solutions = candidates.filter(
      (actions) =>
        checkProduct(process(contract.spec.receiver, actions), contract.spec)
          .accepted,
    );
    assert.ok(solutions.length > 0, contract.id);
    assert.deepEqual(solutions[0], expectedShortest[index], contract.id);
  }
});

test("authored present-passive forms enforce agreement and participles", () => {
  assert.equal(
    validatePassiveForm({
      number: "singular",
      auxiliary: "is",
      action: "paint",
      participle: "painted",
    }),
    true,
  );
  assert.equal(
    validatePassiveForm({
      number: "plural",
      auxiliary: "are",
      action: "wash",
      participle: "washed",
    }),
    true,
  );
  assert.equal(
    validatePassiveForm({
      number: "singular",
      auxiliary: "are",
      action: "paint",
      participle: "painted",
    }),
    false,
  );
  assert.equal(
    validatePassiveForm({
      number: "plural",
      auxiliary: "is",
      action: "wash",
      participle: "washed",
    }),
    false,
  );
  assert.equal(
    validatePassiveForm({
      number: "singular",
      auxiliary: "is",
      action: "paint",
      participle: "paint",
    }),
    false,
  );
});

test("truth graph validation rejects cycles, dangling links, and mixed receiver roles", () => {
  assert.ok(
    validateSpec({ ...FIRST_SPEC, before: [["wash", "wash"]] }).includes(
      "cyclic-order",
    ),
  );
  assert.ok(
    validateSpec({ ...FIRST_SPEC, before: [["wash", "ghost"]] }).includes(
      "unknown-order-step",
    ),
  );
  assert.ok(
    validateSpec({
      ...FIRST_SPEC,
      steps: [{ id: "wash", action: "wash", receiver: "service-arm" }],
    }).includes("receiver-mismatch"),
  );
});


test("drying bare material does not invent paint or a cured coat", () => {
  const p=process('panel',['wash','dry']);
  assert.equal(p.dried,true);assert.equal(p.paintCured,false);assert.equal(p.painted,false);
});
test("dry-before-paint differs from curing the coat after painting", () => {
  const wet=process('crate',['wash','dry','paint']);
  assert.equal(wet.dried,false);assert.equal(wet.paintCured,false);
  const cured=applyOperation(wet,'dry');assert.equal(cured.dried,true);assert.equal(cured.paintCured,true);assert.equal(cured.paintBonded,true);
  const unbonded=process('crate',['paint','dry']);assert.equal(unbonded.paintCured,true);assert.equal(unbonded.paintBonded,false);
});
test("wash and new paint both invalidate a previous dry or cured state", () => {
  const cured=process('crate',['wash','paint','dry']);
  for(const action of ['wash','paint'] as Operation[]){const p=applyOperation(cured,action);assert.equal(p.dried,false);assert.equal(p.paintCured,false);}
  assert.equal(applyOperation(cured,'wash').painted,false);
});
test("the dryer cannot reach sealed contents and a no-op opener is not a witness", () => {
  const p=process('panel',['pack','dry']);assert.equal(p.dried,false);assert.equal(p.history.at(-1)?.effect,'sealed');
  const opened=process('panel',['unpack']);assert.equal(opened.history[0].effect,'sealed');
  const spec:ProductionSpec={receiver:'panel',final:{packed:false},steps:[{id:'open',action:'unpack',receiver:'panel'}],before:[]};
  assert.equal(checkProduct(opened,spec).accepted,false);
  assert.equal(checkProduct(process('panel',['pack','unpack']),spec).accepted,true);
});
test("opening discards an outside tag but keeps an inner identity tag", () => {
  const outsideOnly=process('crate',['pack','label','unpack']);
  assert.equal(outsideOnly.packed,false);assert.equal(outsideOnly.labelled,false);assert.equal(outsideOnly.labelSurface,null);assert.equal(outsideOnly.history.at(-1)?.removedLabel,true);
  const insideOnly=process('crate',['label','pack','unpack']);
  assert.equal(insideOnly.labelled,true);assert.equal(insideOnly.labelSurface,'item');assert.equal(insideOnly.itemLabelled,true);
  const both=process('crate',['label','pack','label','unpack']);
  assert.equal(both.labelled,true);assert.equal(both.labelSurface,'item');assert.equal(both.itemLabelled,true);
  const again=applyOperation(applyOperation(both,'pack'),'label');assert.equal(again.labelSurface,'package');assert.equal(again.itemLabelled,true);
});
test("unpacking preserves a cured coating and does not silently clean the item", () => {
  const p=process('service-arm',['paint','dry','pack','unpack']);
  assert.equal(p.painted,true);assert.equal(p.paintCured,true);assert.equal(p.dried,true);assert.equal(p.washed,false);assert.equal(p.paintBonded,false);
});
test("new present-passive forms are still present descriptions", () => {
  assert.equal(validatePassiveForm({number:'singular',auxiliary:'is',action:'dry',participle:'dried'}),true);
  assert.equal(validatePassiveForm({number:'plural',auxiliary:'are',action:'unpack',participle:'unpacked'}),true);
  assert.equal(validatePassiveForm({number:'singular',auxiliary:'is',action:'dry',participle:'dry'}),false);
});
