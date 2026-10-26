import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Foundry } from '../src/simulation';

test('many building edits cannot erase reading support or relabel a first attempt unaided', () => {
  const game = new Foundry();
  game.readingSupport = 1;
  game.log('vocabulary');
  for (let i = 0; i < 150; i++) game.place({ x: 0, z: 3 }, 'belt', i % 4);
  for (let x = 0; x < 9; x++) game.place({ x, z: 3 }, x === 5 ? 'wash' : 'belt', 0);
  game.run();
  assert.equal(game.events.find(e => e.type === 'run')?.aided, true);
  assert.ok(game.events.some(e => e.type === 'vocabulary'));
  for (let i = 0; i < 1200 && game.mode === 'running'; i++) game.step(1 / 60);
  assert.equal(game.mode, 'success');
  game.load(1);
  assert.equal(game.readingSupport, 0);
  assert.equal(game.medals[0].readingSupport, 1);
  assert.equal(game.medals[0].hints, 0);
});
