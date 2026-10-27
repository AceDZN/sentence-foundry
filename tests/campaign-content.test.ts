import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTRACTS, CHAPTERS, CAMPAIGN_ENDING, validateContracts } from '../src/content';
import { applyOperation, makeProduct, checkProduct, OPERATION_AGENTS, type Operation, type ProductionSpec } from '../src/semantics';
import { CAMPAIGN_RECIPES } from './campaign-fixtures';

/** Independent physical oracle: separate material finish and two actual paper
 * layers, rather than mutating Product or calling its operation implementation. */
function materialOracle(actions:Operation[]){
 let clean=false,finish:'bare'|'fresh'|'cured'='bare',bonded=false,dry=false,closed=false;
 const paper=new Set<'inner'|'outer'>();
 for(const action of actions){
  if(action==='pack'){closed=true;continue;}
  if(action==='unpack'){if(closed){closed=false;paper.delete('outer');}continue;}
  if(action==='label'){paper.add(closed?'outer':'inner');continue;}
  if(closed)continue;
  if(action==='wash'){clean=true;finish='bare';bonded=false;dry=false;paper.clear();}
  if(action==='paint'){finish='fresh';bonded=clean;dry=false;paper.delete('inner');}
  if(action==='dry'){dry=true;if(finish!=='bare')finish='cured';}
 }
 const surface=closed&&paper.has('outer')?'package':paper.has('inner')?'item':null;
 return {washed:clean,painted:finish!=='bare',paintBonded:bonded,dried:dry,paintCured:finish==='cured',packed:closed,labelled:surface!==null,labelSurface:surface,itemLabelled:paper.has('inner')};
}
function produce(receiver:ProductionSpec['receiver'],actions:Operation[]){return actions.reduce((p,a)=>applyOperation(p,a),makeProduct(receiver));}
function topoOrders(spec:ProductionSpec):Operation[][] {
 const all:Operation[][]=[];
 const visit=(ids:string[])=>{
  if(ids.length===spec.steps.length){all.push(ids.map(id=>spec.steps.find(s=>s.id===id)!.action));return;}
  for(const step of spec.steps){if(ids.includes(step.id))continue;if(spec.before.some(([a,b])=>b===step.id&&!ids.includes(a)))continue;visit([...ids,step.id]);}
 };
 visit([]);return all;
}
function oracleMatches(spec:ProductionSpec,actions:Operation[]){const p=materialOracle(actions);return Object.entries(spec.final).every(([key,value])=>p[key as keyof typeof p]===value);}

test('45 authored contracts form nine ordered five-contract chapters',()=>{
 assert.deepEqual(validateContracts(),[]);assert.equal(CONTRACTS.length,45);assert.equal(CHAPTERS.length,9);
 assert.equal(new Set(CONTRACTS.map(c=>c.id)).size,45);assert.equal(new Set(CONTRACTS.map(c=>c.text)).size,45);
 assert.deepEqual(CONTRACTS.slice(0,5).map(c=>c.layout),[0,1,2,3,4]);
 for(let chapter=0;chapter<9;chapter++){assert.equal(CONTRACTS.filter(c=>c.chapter===chapter).length,5);assert.ok(CHAPTERS[chapter].titleHe.length>4);assert.ok(CHAPTERS[chapter].descriptionHe.length>20);}
 assert.match(CAMPAIGN_ENDING.textHe,/45/);assert.match(CAMPAIGN_ENDING.textEn,/inside/);assert.match(CAMPAIGN_ENDING.textEn,/outside/);
});

test('literal independent recipes, physical oracle and game acceptance agree for every contract',()=>{
 assert.equal(CAMPAIGN_RECIPES.length,45);
 for(const [index,c] of CONTRACTS.entries()){
  const f=CAMPAIGN_RECIPES[index];assert.equal(f.id,c.id);assert.ok(f.actions.length<=8&&f.actions.length>0,c.id);
  const expected=materialOracle(f.actions),actual=produce(c.spec.receiver,f.actions);
  for(const [key,value] of Object.entries(expected))assert.equal(actual[key as keyof typeof expected],value,`${c.id}:${key}`);
  assert.ok(oracleMatches(c.spec,f.actions),`${c.id}:independent final truth`);
  assert.equal(checkProduct(actual,c.spec).accepted,true,`${c.id}:game oracle accepts independently authored plan`);
 }
});

test('independent graph solver finds physically possible plans, not only a declared solution',()=>{
 for(const c of CONTRACTS){
  const candidates=topoOrders(c.spec);assert.ok(candidates.length>0,c.id);
  const physical=candidates.filter(actions=>oracleMatches(c.spec,actions));assert.ok(physical.length>0,`${c.id}:all graph orders physically impossible`);
  for(const actions of physical)assert.equal(checkProduct(produce(c.spec.receiver,actions),c.spec).accepted,true,c.id);
 }
});

test('partial-order language permits both drying and tagging orders',()=>{
 for(const id of ['either-after-paint','two-jobs-before-sealing','foundry-exhibition-finale']){
  const c=CONTRACTS.find(c=>c.id===id)!;const options=topoOrders(c.spec).filter(actions=>oracleMatches(c.spec,actions));assert.equal(options.length,2,id);
  assert.ok(options.some(actions=>actions.indexOf('dry')<actions.indexOf('label')));assert.ok(options.some(actions=>actions.indexOf('label')<actions.indexOf('dry')));
 }
});

test('new chapters contain distinct process graphs and genuine rework',()=>{
 const shapes=new Set(CONTRACTS.map(c=>JSON.stringify({receiver:c.spec.receiver,steps:c.spec.steps.map(s=>s.action),before:c.spec.before,final:c.spec.final})));
 assert.ok(shapes.size>=38,`only ${shapes.size} distinct authored process requirements`);
 assert.ok(CONTRACTS.filter(c=>c.spec.steps.some(s=>s.action==='unpack')).length>=19);
 assert.ok(CONTRACTS.slice(30).every(c=>c.spec.steps.length>=6));
 assert.ok(CONTRACTS.filter(c=>c.maxPieces!==undefined).length>=4);
 for(const c of CONTRACTS.filter(c=>c.maxPieces!==undefined)){assert.ok([0,1].includes(c.layout));assert.equal(c.maxPieces,11);}
});

test('machine unlocks, receiver layouts and named agents remain physically available',()=>{
 for(const [i,c] of CONTRACTS.entries()){
  assert.ok(c.count>=1&&c.count<=4);assert.ok(c.layout>=0&&c.layout<=8);
  if(i<10)assert.ok(!c.availableMachines.includes('dry'));
  if(i<25)assert.ok(!c.availableMachines.includes('unpack'));
  for(const step of c.spec.steps){assert.ok(c.availableMachines.includes(step.action));if(step.agent)assert.equal(step.agent,OPERATION_AGENTS[step.action]);}
  if([2,6].includes(c.layout))assert.notEqual(c.spec.receiver,'panel');
 }
});

test('every final batch still rejects a physically finished wrong receiver',()=>{
 for(const [i,c] of CONTRACTS.entries()){
  const wrong=c.spec.receiver==='crate'?'service-arm':'crate';
  assert.equal(checkProduct(produce(wrong,CAMPAIGN_RECIPES[i].actions),c.spec).accepted,false,c.id);
 }
});

test('curing near misses are rejected for independent physical reasons',()=>{
 const c=CONTRACTS.find(c=>c.id==='cured-panels')!;
 assert.equal(checkProduct(produce('panel',['wash','dry','paint']),c.spec).accepted,false,'early drying does not cure later paint');
 assert.equal(checkProduct(produce('panel',['wash','paint','dry','wash']),c.spec).accepted,false,'washing destroys the cured coat');
 const wet=CONTRACTS.find(c=>c.id==='wet-coat-demonstration')!;
 assert.equal(checkProduct(produce('crate',['wash','dry','paint','dry']),wet.spec).accepted,false,'final coat must remain uncured');
});

test('rework is required even when a shortcut produces the same final material',()=>{
 const c=CONTRACTS.find(c=>c.id==='open-before-paint')!;
 const shortcut=produce('panel',['wash','paint']);assert.equal(shortcut.paintBonded,true);assert.equal(shortcut.packed,false);
 assert.equal(checkProduct(shortcut,c.spec).accepted,false,'missing actual pack/open inspection stages');
 const reopened=produce('panel',['wash','pack','unpack','paint']);assert.equal(checkProduct(reopened,c.spec).accepted,true);
 const sealed=produce('panel',['wash','pack','paint']);assert.equal(sealed.painted,false);assert.equal(checkProduct(sealed,c.spec).accepted,false);
});

test('two paper layers survive and disappear according to their actual location',()=>{
 const c=CONTRACTS.find(c=>c.id==='inside-id-outside-dispatch')!;
 const good=produce('panel',['label','pack','label','unpack','pack','label']);assert.equal(good.itemLabelled,true);assert.equal(good.labelSurface,'package');assert.equal(checkProduct(good,c.spec).accepted,true);
 const noInner=produce('panel',['pack','label','unpack','pack','label']);assert.equal(noInner.itemLabelled,false);assert.equal(noInner.labelSurface,'package');assert.equal(checkProduct(noInner,c.spec).accepted,false);
 const noReplacement=produce('panel',['label','pack','label','unpack','pack']);assert.equal(noReplacement.labelSurface,'item');assert.equal(checkProduct(noReplacement,c.spec).accepted,false);
});

test('validation catches duplicated filler, locked tools, impossible layout and missing stages',()=>{
 const copy=()=>structuredClone(CONTRACTS);
 let list=copy();list[7].id=list[6].id;assert.ok(validateContracts(list).some(e=>e.includes('duplicate-or-empty-id')));
 list=copy();list[7].text=list[6].text;assert.ok(validateContracts(list).some(e=>e.includes('duplicate-or-empty-text')));
 list=copy();list[6].availableMachines.push('unpack');assert.ok(validateContracts(list).some(e=>e.includes('locked-machine')));
 list=copy();list[6].layout=2;assert.ok(validateContracts(list).some(e=>e.includes('panel-on-dual-source-layout')));
 list=copy();list[10].availableMachines=['wash'];assert.ok(validateContracts(list).some(e=>e.includes('unavailable-required-operation')));
 list=copy();list[44].chapter=0;assert.ok(validateContracts(list).some(e=>e.includes('invalid-chapter')));
});
