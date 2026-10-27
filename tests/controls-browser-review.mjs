/** Independent controls review: trusted UI/protocol input and observable game
 * state only. No simulation mutation, stored-progress seeding, or injected wins. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const known=path.join(homedir(),'Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const browser=await chromium.launch({headless:true,executablePath:process.env.SF_REVIEW_EXECUTABLE||(existsSync(known)?known:undefined),args:[`--use-angle=${process.platform==='darwin'?'metal':'swiftshader'}`,'--enable-webgl','--disable-dev-shm-usage'],timeout:60000});
const url=process.env.SF_REVIEW_URL||'http://localhost:4233';
const reports=[],errors=[];
const resumeTail=process.argv.includes('--tail-only');
let live=null;
const state=async p=>JSON.parse(await p.evaluate(()=>window.render_game_to_text()));
const tiles=s=>JSON.stringify([...s.tiles].sort((a,b)=>a.z-b.z||a.x-b.x));
const tile=(s,x,z)=>s.tiles.find(t=>t.x===x&&t.z===z);
const undo=s=>s.controls.undoCount;
const sameCell=(a,b)=>a?.x===b.x&&a?.z===b.z;
async function ready(p){await p.waitForFunction(()=>{if(typeof window.render_game_to_text!=='function')return false;const s=JSON.parse(window.render_game_to_text());return s.assets?.washer==='ready'&&s.assets?.arm==='ready'&&s.performance?.drawCalls>0;},undefined,{timeout:30000});}
async function button(p,id){await p.locator(id).click({force:true});}
async function cell(p,x,z,mobile=false){const s=await state(p),point=s.cellScreen.find(c=>c.x===x&&c.z===z).screen;if(mobile)await p.touchscreen.tap(point.x,point.y);else await p.mouse.click(point.x,point.y);}
async function touch(p,id){const b=await p.locator(id).boundingBox();assert.ok(b,id);await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
async function capture(p,scope,name){const s=await state(p);await fs.writeFile(path.join(root,'docs/review',`controls-review-${scope}-${name}.json`),JSON.stringify({state:s,text:await p.locator('body').innerText()},null,2));await p.screenshot({path:path.join(root,'docs/review',`controls-review-${scope}-${name}.png`),timeout:10000});reports.push({scope,name,challenge:s.challenge,mode:s.mode,controls:s.controls,selected:s.selected,editMode:s.editMode});console.log(scope,name,s.mode);return s;}
async function context(mobile=false){const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});const p=await c.newPage();live=p;p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await ready(p);return{c,p};}
function assertCanceled(s,before,history){assert.equal(s.mode,'editing');assert.equal(s.editMode,'place');assert.equal(s.selected,null);assert.equal(s.controls.moveFrom,null);assert.equal(s.rotation,0);assert.equal(tiles(s),before);assert.equal(undo(s),history);}
function overlap(a,b){return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));}
const footer=['#move','#rotate','#erase','#undo','#camera','#cancel-edit','#run','#restart','#hint'];
const primary=[...footer,'#campaign-open','#help','#pause','#mute','#music-mix','#motion','#fullscreen','#read','#speak','#contract-toggle','#paraphrase','#receiver'];
async function quietButtons(p,mobile=false){
 const boxes=[],bindings=(await state(p)).controls.shortcuts;
 assert.equal(await p.locator('button kbd').count(),0,'buttons contain no visible keyboard badges');
 for(const id of primary){const b=p.locator(id);if(!await b.isVisible())continue;const shortcut=await b.getAttribute('aria-keyshortcuts');assert.ok(shortcut?.trim(),`${id} exposes its shortcut`);const binding=bindings[id.slice(1)];assert.ok(binding,`${id} has a described binding`);assert.ok((await b.getAttribute('title'))?.includes(binding),`${id} title contains its binding`);const box=await b.boundingBox();assert.ok(box);if(mobile)assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=390.5&&box.y+box.height<=844.5,`${id} fits mobile`);if(footer.includes(id))boxes.push({id,...box});}
 for(const [i,b]of (await p.locator('#palette button').all()).entries()){assert.equal(await b.locator('kbd').count(),0);assert.equal(await b.getAttribute('aria-keyshortcuts'),String(i+1));assert.ok((await b.getAttribute('title'))?.includes(String(i+1)),'palette title retains digit binding');}
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(overlap(boxes[i],boxes[j])<1,`${boxes[i].id} overlaps ${boxes[j].id}`);
 if(mobile)for(const box of boxes)for(const selector of ['#palette button','#inspector','#status-text'])for(const target of await p.locator(selector).all()){if(!await target.isVisible())continue;const b=await target.boundingBox();assert.ok(overlap(box,b)<1,`${box.id} overlaps ${selector}`);}
 return boxes;
}
async function physicalHebrew(p,code,key,modifiers=0){const session=await p.context().newCDPSession(p);await session.send('Input.dispatchKeyEvent',{type:'keyDown',code,key,text:key,modifiers,windowsVirtualKeyCode:code.charCodeAt(3),nativeVirtualKeyCode:code.charCodeAt(3)});await session.send('Input.dispatchKeyEvent',{type:'keyUp',code,key,modifiers:0,windowsVirtualKeyCode:code.charCodeAt(3),nativeVirtualKeyCode:code.charCodeAt(3)});await session.detach();}
try{
 const {c,p}=await context();
 await quietButtons(p);await capture(p,'desktop','initial-keycaps');
 const original=tiles(await state(p));
 if(!resumeTail){
 // Selection never overwrites an occupied part; R and the button share rotation.
 await cell(p,2,2);let s=await state(p);assert.ok(sameCell(s.selected,{x:2,z:2}));assert.equal(tile(s,2,2).rotation,2);assert.equal(undo(s),0);
 await p.keyboard.press('r');assert.equal(tile(await state(p),2,2).rotation,3);
 await button(p,'#rotate');assert.equal(tile(await state(p),2,2).rotation,0);
 await physicalHebrew(p,'KeyR','ר');assert.equal(tile(await state(p),2,2).rotation,1,'Hebrew logical key still uses physical KeyR');
 await p.keyboard.down('r');await p.keyboard.down('r');await p.keyboard.up('r');assert.equal(tile(await state(p),2,2).rotation,2,'held key rotates only once');
 // A focused button must not swallow R, while Enter activates that button once.
 await p.locator('#rotate').focus();await p.keyboard.press('r');assert.equal(tile(await state(p),2,2).rotation,3);await p.keyboard.press('Enter');assert.equal(tile(await state(p),2,2).rotation,0,'focused Enter rotates once, without placing another tile');
 await p.keyboard.press('Control+z');assert.equal(tile(await state(p),2,2).rotation,3);await p.keyboard.press('Meta+z');assert.equal(tile(await state(p),2,2).rotation,2);
 // Modifier/repeat guards leave the board and undo stack intact.
 const modified=tiles(await state(p)),history=undo(await state(p));await p.keyboard.press('Control+Shift+z');await p.keyboard.press('Control+Alt+z');assert.equal(tiles(await state(p)),modified);assert.equal(undo(await state(p)),history);
 let navigations=0;p.on('framenavigated',f=>{if(f===p.mainFrame())navigations++;});await p.keyboard.press('Meta+r');await p.waitForTimeout(250);await ready(p);assert.equal(tiles(await state(p)),modified,'browser CmdR must not rotate the selected part');await p.keyboard.press('Control+r');await ready(p);assert.equal(tiles(await state(p)),modified);reports.push({scope:'desktop',name:'modifier-guards',navigations});
 await p.keyboard.press('Shift+r');s=await state(p);assert.equal(tiles(s),original);assert.equal(undo(s),0);assert.equal(s.selected,null);
 await button(p,'[data-tool="corner"]');await p.keyboard.press('r');assert.equal((await state(p)).rotation,1);await p.keyboard.press('Escape');assertCanceled(await state(p),original,0);
 // M primes the selected part, and occupied destinations preserve both parts.
 await cell(p,2,2);await p.keyboard.press('m');s=await state(p);assert.equal(s.editMode,'move');assert.ok(sameCell(s.controls.moveFrom,{x:2,z:2}));const before=tiles(s),beforeUndo=undo(s);await cell(p,0,3);s=await state(p);assert.equal(tiles(s),before);assert.equal(undo(s),beforeUndo);assert.ok(sameCell(s.controls.moveFrom,{x:2,z:2}));assert.match(await p.locator('#status-text').innerText(),/תפוס|חסום/);await p.keyboard.press('Escape');assertCanceled(await state(p),before,beforeUndo);await capture(p,'desktop','occupied-move-canceled');
 // The same pointer buttons cancel identically, including selection and preview.
 await cell(p,2,2);await button(p,'#move');await cell(p,0,3);await button(p,'#cancel-edit');assertCanceled(await state(p),before,beforeUndo);
 await cell(p,2,2);await physicalHebrew(p,'KeyM','צ');await cell(p,2,3);s=await state(p);assert.equal(tile(s,2,2),undefined);assert.equal(tile(s,2,3).rotation,2);await physicalHebrew(p,'KeyZ','ז',2);assert.equal(tiles(await state(p)),original,'Hebrew physical CtrlZ undoes the move');
 // Esc also deselects a selected part without pausing.
 await cell(p,0,3);const selectionUndo=undo(await state(p));await p.keyboard.press('Escape');assertCanceled(await state(p),original,selectionUndo);
 // X is a mode; Delete and Backspace directly remove only a selected part.
 await cell(p,0,3);await p.keyboard.press('x');s=await state(p);assert.equal(s.editMode,'erase');assert.equal(tiles(s),original);await cell(p,1,3);assert.equal(tile(await state(p),1,3),undefined);await p.keyboard.press('x');assert.equal((await state(p)).editMode,'place');await cell(p,0,3);await p.keyboard.press('Delete');assert.equal(tile(await state(p),0,3),undefined);assert.equal((await state(p)).editMode,'place');await p.keyboard.press('Control+z');assert.ok(tile(await state(p),0,3));await cell(p,0,3);await p.keyboard.press('Backspace');assert.equal(tile(await state(p),0,3),undefined);await p.keyboard.press('Control+z');await capture(p,'desktop','erase-delete-undo');
 await p.keyboard.press('Shift+r');
 // V restores the actual camera projection after an actual right drag.
 const baseline=(await state(p)).cellScreen;await p.mouse.move(720,440);await p.mouse.down({button:'right'});await p.mouse.move(845,490,{steps:10});await p.mouse.up({button:'right'});await p.waitForTimeout(300);assert.notDeepEqual((await state(p)).cellScreen,baseline);await p.keyboard.press('v');await p.waitForTimeout(250);const reset=(await state(p)).cellScreen;assert.ok(reset.every((point,i)=>Math.abs(point.screen.x-baseline[i].screen.x)<=2&&Math.abs(point.screen.y-baseline[i].screen.y)<=2),'V restores camera projection');
 // Mixer/input keys are native input, never construction or undo commands.
 await cell(p,0,3);const inputBoard=tiles(await state(p)),inputUndo=undo(await state(p));await p.keyboard.press('b');assert.equal(await p.locator('#audio-panel').isVisible(),true);await p.locator('#music-volume').focus();await p.keyboard.press('r');await p.keyboard.press('m');await p.keyboard.press('x');await p.keyboard.press('Space');await p.keyboard.press('Control+z');s=await state(p);assert.equal(tiles(s),inputBoard);assert.equal(undo(s),inputUndo);assert.equal(s.mode,'editing');assert.equal(s.editMode,'place');await p.keyboard.press('Escape');assert.equal(await p.locator('#audio-panel').isVisible(),false);assert.ok((await state(p)).selected,'mixer Esc closes mixer before canceling edit');await p.keyboard.press('Escape');assert.equal((await state(p)).selected,null);
 // Modal Escape closes; P is the explicit pause/resume binding.
 await p.keyboard.press('h');assert.equal(await p.locator('#dialog').evaluate(d=>d.open),true);assert.equal((await state(p)).mode,'paused');await p.keyboard.press('Escape');assert.equal(await p.locator('#dialog').evaluate(d=>d.open),false);assert.equal((await state(p)).mode,'editing');await p.keyboard.press('p');assert.equal((await state(p)).mode,'paused');await p.keyboard.press('p');assert.equal((await state(p)).mode,'editing');
 const oldMute=(await state(p)).muted;await p.keyboard.press('u');assert.notEqual((await state(p)).muted,oldMute);await p.keyboard.press('u');assert.equal((await state(p)).muted,oldMute);const oldMotion=(await state(p)).reduced;await p.keyboard.press('n');assert.notEqual((await state(p)).reduced,oldMotion);await p.keyboard.press('n');assert.equal((await state(p)).reduced,oldMotion);
 await p.keyboard.press('f');await p.waitForFunction(()=>Boolean(document.fullscreenElement));await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.fullscreenElement);assert.equal((await state(p)).mode,'editing','fullscreen Escape must not pause');
 const hints=(await state(p)).hints;await p.keyboard.press('i');assert.equal(await p.locator('#dialog').evaluate(d=>d.open),true);assert.equal((await state(p)).hints,hints+1);await p.keyboard.press('Escape');if(await p.locator('#speak').isVisible()&&!await p.locator('#speak').isDisabled()){const support=(await state(p)).readingSupport;await p.keyboard.press('y');assert.equal((await state(p)).readingSupport,support+1,'Y invokes the actual listen handler');await p.keyboard.press('Shift+r');}
 await p.keyboard.press('t');assert.equal(await p.locator('#dialog').evaluate(d=>d.open),true);assert.ok(await p.locator('#dialog-content dl dt').count()>0,'T vocabulary dialog contains actual glossary entries');await p.keyboard.press('Escape');await p.keyboard.press('c');assert.equal(await p.locator('#contract-toggle').getAttribute('aria-expanded'),'false');await p.keyboard.press('c');assert.equal(await p.locator('#contract-toggle').getAttribute('aria-expanded'),'true');
 }
 // Real first shipment verifies Space/Enter result handling without a win hook.
 await p.keyboard.press('Shift+r');for(const [x,z,kind]of [[2,3,'belt'],[4,3,'belt'],[5,3,'wash']]){await button(p,`[data-tool="${kind}"]`);await cell(p,x,z);}await p.keyboard.press('Space');assert.equal((await state(p)).mode,'running');for(let i=0;i<15&&(await state(p)).mode==='running';i++)await p.evaluate(()=>window.advanceTime(1000));assert.equal((await state(p)).mode,'success');assert.equal(await p.locator('#next kbd').count(),0);assert.equal(await p.locator('#next').getAttribute('aria-keyshortcuts'),'Enter');assert.ok((await p.locator('#next').getAttribute('title'))?.includes('Enter'));await p.locator('#mute').focus();const previousMute=(await state(p)).muted;await p.keyboard.press('Enter');assert.equal((await state(p)).challenge,1,'focused button Enter must not also choose Next');assert.notEqual((await state(p)).muted,previousMute);await cell(p,4,3);await p.keyboard.press('Enter');assert.equal((await state(p)).challenge,2);await p.keyboard.press('o');assert.match((await state(p)).contract,/cleaning arm washes the crates/);await quietButtons(p);
 await p.keyboard.press('l');assert.equal(await p.locator('#dialog').evaluate(d=>d.open),true);await button(p,'[data-level="2"]');assert.equal((await state(p)).challenge,3);await p.keyboard.press('Shift+o');assert.equal((await state(p)).variant,true);await quietButtons(p);await capture(p,'desktop','reading-campaign-bindings');await c.close();
 // Mobile uses actual touchscreen input and checks quiet buttons and shortcut metadata.
 {
  const {c,p}=await context(true);await quietButtons(p,true);await capture(p,'mobile','keycaps');const original=tiles(await state(p));await cell(p,2,2,true);await touch(p,'#rotate');assert.equal(tile(await state(p),2,2).rotation,3);await touch(p,'#move');await cell(p,0,3,true);assert.equal(tiles(await state(p)),JSON.stringify(JSON.parse(original).map(t=>t.x===2&&t.z===2?{...t,rotation:3}:t)));await touch(p,'#cancel-edit');assert.equal((await state(p)).selected,null);assert.equal((await state(p)).mode,'editing');await cell(p,2,2,true);await touch(p,'#move');await cell(p,2,3,true);assert.equal(tile(await state(p),2,2),undefined);assert.ok(tile(await state(p),2,3));await touch(p,'#undo');assert.ok(tile(await state(p),2,2));await touch(p,'#erase');const count=(await state(p)).tiles.length;await cell(p,1,3,true);assert.equal((await state(p)).tiles.length,count-1);await touch(p,'#cancel-edit');await touch(p,'#restart');assert.equal(tiles(await state(p)),original);await quietButtons(p,true);await capture(p,'mobile','pointer-parity');await touch(p,'#campaign-open');await p.locator('[data-level="44"]').click();assert.equal((await state(p)).challenge,45);assert.equal(await p.locator('#palette button').count(),8);await quietButtons(p,true);for(const b of await p.locator('#palette button').all()){assert.equal(await b.locator('kbd').count(),0);const r=await b.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=390&&r.y+r.height<=844);}await capture(p,'mobile','expanded-eight-tools');await c.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'docs/review/controls-review-summary.json'),JSON.stringify({phase:resumeTail?'tail-recheck':'full',reports,errors},null,2));
}catch(e){let observed=null;if(live&&!live.isClosed()){observed=await state(live).catch(()=>null);await live.screenshot({path:path.join(root,'docs/review/controls-review-FAILED.png'),timeout:5000}).catch(()=>{});}await fs.writeFile(path.join(root,'docs/review/controls-review-failure.json'),JSON.stringify({error:String(e.stack),observed,reports,errors},null,2));console.error(e);process.exitCode=1;}
finally{await browser.close();}
