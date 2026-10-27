import assert from "node:assert/strict";
import test from "node:test";
import { CONTRACTS } from "../src/content";
import { emptyCampaign, nextUnfinished, readCampaign } from "../src/campaign";
import { Foundry } from "../src/simulation";

test("campaign save restores construction but cannot restore a forged win", () => {
  const save = emptyCampaign();
  save.current = CONTRACTS[10].id;
  save.draft = { id: save.current, tiles: [{ x:0,z:0,kind:"belt",rotation:0 }], variant:false, activeText:false };
  save.completed[CONTRACTS[0].id] = { seconds:8,pieces:9,attempts:1,supported:false };
  const restored = readCampaign(JSON.stringify({ ...save, mode:"success", accepted:999 }));
  assert.equal(restored.current, save.current);
  assert.deepEqual(restored.draft, save.draft);
  assert.equal(nextUnfinished(restored), 1);
  assert.equal("mode" in restored, false);
  assert.deepEqual(readCampaign("broken"), emptyCampaign());
});

test("stale ids and invalid/duplicate/off-board saved tiles are discarded", () => {
  const base = emptyCampaign();
  for (const tiles of [
    [{x:99,z:3,kind:"belt",rotation:0}],
    [{x:0,z:3,kind:"dry",rotation:0}],
    [{x:0,z:3,kind:"belt",rotation:0},{x:0,z:3,kind:"belt",rotation:0}],
    [{x:0,z:3,kind:"belt",rotation:4}],
  ]) {
    const saved = readCampaign(JSON.stringify({...base,current:"deleted-order",completed:{fake:{seconds:0,pieces:1,attempts:1}},draft:{id:base.current,tiles}}));
    assert.equal(saved.current, CONTRACTS[0].id);
    assert.equal(saved.draft, undefined);
    assert.deepEqual(saved.completed, {});
  }
});

test("finished campaign has no next unfinished contract", () => {
  const save = emptyCampaign();
  for (const contract of CONTRACTS) save.completed[contract.id] = {seconds:1,pieces:9,attempts:1,supported:false};
  assert.equal(nextUnfinished(save), -1);
});

test("moving a part is atomic, respects occupancy, and never deletes destination", () => {
  const game = new Foundry();
  const before = structuredClone(game.tiles);
  assert.equal(game.move({x:0,z:3},{x:1,z:3}),false);
  assert.deepEqual(game.tiles,before);
  assert.equal(game.move({x:2,z:2},{x:2,z:3}),true);
  assert.equal(game.tiles.length,before.length);
  assert.ok(game.tiles.some(t=>t.x===2&&t.z===3));
  assert.ok(!game.tiles.some(t=>t.x===2&&t.z===2));
  game.run();
  assert.equal(game.move({x:2,z:3},{x:2,z:2}),false);
});
