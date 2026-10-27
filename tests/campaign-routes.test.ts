import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CONTRACTS } from '../src/content';
import { Foundry } from '../src/simulation';
import { traceRoute } from '../src/grid';
import { CAMPAIGN_RECIPES } from './campaign-fixtures';
import { planRoute } from './campaign-route-planner';

test('all 45 authored contracts have a built, simulated solution on their actual boards',()=>{
 const plans=[];
 assert.equal(CONTRACTS.length,45);
 for(let index=0;index<CONTRACTS.length;index++){
  const contract=CONTRACTS[index], recipe=CAMPAIGN_RECIPES.find(r=>r.id===contract.id);
  assert.ok(recipe,`independent recipe for ${contract.id}`);
  const game=new Foundry();game.load(index);
  const tiles=planRoute(game.board,contract.spec.receiver,recipe.actions,contract.maxPieces??31);
  game.tiles=[];
  for(const tile of tiles)assert.equal(game.place(tile,tile.kind,tile.rotation),true,`${contract.id} ${tile.x},${tile.z}`);
  const source=game.board.sources.find(s=>s.receiver===contract.spec.receiver)!;
  assert.equal(traceRoute(game.board,game.tiles,source).error,null);
  game.run();
  for(let i=0;i<90*60&&game.mode==='running';i++)game.step(1/60);
  assert.equal(game.mode,'success',`${index+1}:${contract.id} ${game.jam} ${JSON.stringify(game.deliveries)}`);
  assert.equal(game.accepted,contract.count);
  plans.push({id:contract.id,tiles,receiver:contract.spec.receiver,actions:recipe.actions});
 }
 fs.mkdirSync('work',{recursive:true});
 fs.writeFileSync('work/campaign-plans.json',JSON.stringify(plans,null,2));
});
