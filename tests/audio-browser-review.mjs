/** Real UI + public audioState review. No audio API monkeypatching or injected wins. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const knownShell=path.join(homedir(),'Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const browser=await chromium.launch({headless:true,executablePath:process.env.SF_REVIEW_EXECUTABLE||(existsSync(knownShell)?knownShell:undefined),args:[`--use-angle=${process.platform==='darwin'?'metal':'swiftshader'}`,'--enable-webgl','--disable-dev-shm-usage'],timeout:60000});
const url=process.env.SF_REVIEW_URL||'http://localhost:4233';
const results=[],errors=[],requests=[];
const speechOnly=process.argv.includes('--speech-only');
const mobileOnly=process.argv.includes('--mobile-only');
const requireIndustry=process.argv.includes('--require-industry');
let currentPage=null;
const state=async p=>JSON.parse(await p.evaluate(()=>window.render_game_to_text()));
const audio=async p=>{const s=await state(p);assert.ok(s.audioState,'public audioState exists');return s.audioState;};
const button=async(p,selector)=>p.locator(selector).click({force:true});
const wait=async(p,predicate)=>p.waitForFunction(predicate,undefined,{timeout:30000});
async function openMix(p){if(!await p.locator('#audio-panel').isVisible())await button(p,'#music-mix');}
async function context(mobile=false){
 const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});
 const p=await c.newPage();currentPage=p;p.setDefaultTimeout(20000);
 p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 p.on('response',r=>{if(/\/audio\/.*\.(?:mp3|ogg)/.test(r.url()))requests.push({file:r.url().split('/').at(-1),status:r.status()});});
 await p.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await wait(p,()=>{if(typeof window.render_game_to_text!=='function')return false;const s=JSON.parse(window.render_game_to_text());return s.audioState&&s.assets?.washer==='ready'&&s.assets?.arm==='ready'&&s.performance?.drawCalls>0;});if(requireIndustry)await wait(p,()=>{const i=JSON.parse(window.render_game_to_text()).industryAssets;return i?.pump==='ready'&&i?.spotlight==='ready';});
 return {c,p};
}
async function snapshot(p,name,screenshot=false){
 const s=await state(p);if(requireIndustry)assert.deepEqual(s.industryAssets,{pump:'ready',spotlight:'ready'},'both industrial Tripo props loaded');assert.equal(s.audioState.error,'',`audio error at ${name}`);assert.ok(s.audioState.musicSourceCount<=1,`one music source at ${name}`);assert.ok(s.audioState.activeEffects<=12,`bounded SFX at ${name}`);
 await fs.writeFile(path.join(root,'docs/review',`audio-${name}.json`),JSON.stringify({state:s,text:await p.locator('body').innerText()},null,2));
 if(screenshot){const pixels=await p.evaluate(()=>{window.advanceTime(0);return document.querySelector('canvas').toDataURL('image/png').split(',')[1];});await fs.writeFile(path.join(root,'docs/review',`audio-${name}-canvas.png`),Buffer.from(pixels,'base64'));await p.screenshot({path:path.join(root,'docs/review',`audio-${name}.png`),timeout:10000});}
 results.push({name,audio:s.audioState,mode:s.mode,challenge:s.challenge});console.log(name,JSON.stringify(s.audioState));return s;
}
async function start(p){
 await openMix(p);
 await wait(p,()=>{const a=JSON.parse(window.render_game_to_text()).audioState;return a.musicLoaded&&a.loadedCues===12&&a.contextState==='running';});
 const a=await audio(p);assert.equal(a.musicSourceCount,1);assert.equal(a.musicStarts,1);assert.equal(a.activeMusicLoops,1);assert.ok(a.musicSeconds>0);
}
async function setRange(p,id,value){
 await p.locator(id).focus();await p.keyboard.press('Home');for(let i=0;i<value;i++)await p.keyboard.press('ArrowUp');
 assert.equal(Number(await p.locator(id).inputValue()),value);
}
async function tapCell(p,x,z,mobile=false){const s=await state(p),point=s.cellScreen.find(c=>c.x===x&&c.z===z).screen;if(mobile)await p.touchscreen.tap(point.x,point.y);else await p.mouse.click(point.x,point.y);}
async function advance(p,ms){await p.evaluate(ms=>window.advanceTime(ms),ms);}
async function touch(p,selector,fraction=.5){const b=await p.locator(selector).boundingBox();assert.ok(b);await p.touchscreen.tap(b.x+b.width*fraction,b.y+b.height*.5);}
try{
 if(speechOnly){
  const {c,p}=await context();await start(p);await button(p,'#close-audio');
  if(await p.locator('#speak').isVisible()){
   const baseline=(await audio(p)).effectiveMusicGain;await button(p,'#speak');await p.waitForTimeout(100);
   const first=await p.evaluate(()=>({speaking:speechSynthesis.speaking,pending:speechSynthesis.pending}));
   if(first.speaking||first.pending){
    assert.equal((await audio(p)).reading,true);assert.ok((await audio(p)).effectiveMusicGain<baseline*.3);
    await button(p,'#speak');await p.waitForTimeout(300);const replay=await p.evaluate(()=>({speaking:speechSynthesis.speaking,pending:speechSynthesis.pending}));
    assert.ok(replay.speaking||replay.pending,'replacement local speech starts');assert.equal((await audio(p)).reading,true,'stale canceled utterance must not clear replay ducking');assert.ok((await audio(p)).effectiveMusicGain<baseline*.3);await snapshot(p,'speech-replayed');
    await button(p,'#mute');await wait(p,()=>JSON.parse(window.render_game_to_text()).audioState.contextState==='suspended');assert.equal((await audio(p)).reading,false);assert.equal(await p.evaluate(()=>speechSynthesis.speaking),false);assert.equal(await p.locator('#speak').isDisabled(),true);await snapshot(p,'speech-master-muted');
    await button(p,'#mute');await wait(p,()=>JSON.parse(window.render_game_to_text()).audioState.contextState==='running');await button(p,'#speak');await button(p,'#restart');await p.waitForTimeout(200);assert.equal((await audio(p)).reading,false);assert.equal(await p.evaluate(()=>speechSynthesis.speaking),false);assert.equal((await audio(p)).musicSourceCount,1);assert.equal((await audio(p)).musicStarts,1);await snapshot(p,'speech-restart-canceled');results.push({name:'speech-replay-native',exercised:true});
   }else results.push({name:'speech-replay-native',exercised:false,reason:'Native speech did not start'});
  }else results.push({name:'speech-replay-native',exercised:false,reason:'No local English voice exposed'});
  await c.close();
 }else{
 if(!mobileOnly){
 // A first gesture on master mute must not produce an audible cue/loop.
 {
  const {c,p}=await context();const initial=await audio(p);assert.equal(initial.unlocked,false);assert.equal(initial.contextState,'locked');assert.equal(initial.musicSourceCount,0);assert.equal(initial.sfxPlayed,0);await snapshot(p,'before-first-mute');
  await button(p,'#mute');await wait(p,()=>{const a=JSON.parse(window.render_game_to_text()).audioState;return a.muted&&a.contextState==='suspended'&&a.musicLoaded;});
  const a=await audio(p);assert.equal(a.effectiveMusicGain,0);assert.equal(a.activeMusicLoops,0);assert.equal(a.sfxPlayed,0);await snapshot(p,'first-mute');await c.close();
 }
 const {c,p}=await context();
 assert.equal((await audio(p)).unlocked,false);await p.waitForTimeout(150);assert.equal((await audio(p)).musicSourceCount,0);await snapshot(p,'before-gesture');
 await start(p);await snapshot(p,'desktop-mix',true);
 const playhead=(await audio(p)).playhead;await p.waitForTimeout(200);assert.ok((await audio(p)).playhead>playhead,'real audio clock advances');
 // SFX off leaves the single background music source running.
 await p.locator('#effects-enabled').uncheck();let count=(await audio(p)).sfxPlayed;
 await button(p,'[data-tool="wash"]');await p.waitForTimeout(100);assert.equal((await audio(p)).sfxPlayed,count);assert.equal((await audio(p)).activeMusicLoops,1);
 await openMix(p);await p.locator('#effects-enabled').check();await button(p,'#close-audio');await p.waitForTimeout(90);await button(p,'[data-tool="paint"]');assert.ok((await audio(p)).sfxPlayed>count,'SFX nodes resume when enabled');
 // Music off preserves effects and does not allocate another loop when restored.
 await openMix(p);await p.locator('#music-enabled').uncheck();assert.equal((await audio(p)).effectiveMusicGain,0);assert.equal((await audio(p)).activeMusicLoops,0);assert.equal((await audio(p)).effectsEnabled,true);await p.locator('#music-enabled').check();
 await setRange(p,'#music-volume',30);await setRange(p,'#effects-volume',55);let a=await audio(p);assert.equal(a.musicVolume,.3);assert.equal(a.effectsVolume,.55);await button(p,'#close-audio');
 // Master mute preserves both preferences and silences actual context/SFX creation.
 await button(p,'#mute');await wait(p,()=>JSON.parse(window.render_game_to_text()).audioState.contextState==='suspended');a=await audio(p);assert.equal(a.musicEnabled,true);assert.equal(a.effectsEnabled,true);assert.equal(await p.locator('#speak').isDisabled(),true,'master mute disables spoken output');count=a.sfxPlayed;
 await button(p,'[data-tool="label"]');assert.equal((await audio(p)).sfxPlayed,count);await button(p,'#mute');await wait(p,()=>JSON.parse(window.render_game_to_text()).audioState.contextState==='running');assert.equal((await audio(p)).musicStarts,1);
 // Reading and explicit pause suspend the actual context and freeze its playhead.
 await button(p,'#read');await wait(p,()=>JSON.parse(window.render_game_to_text()).audioState.contextState==='suspended');a=await audio(p);const readingTime=(await state(p)).productionSeconds;const frozen=a.playhead;await advance(p,5000);await p.waitForTimeout(150);assert.equal((await state(p)).productionSeconds,readingTime);assert.ok(Math.abs((await audio(p)).playhead-frozen)<.01);await snapshot(p,'dictionary-paused');await button(p,'#close-dialog');await wait(p,()=>JSON.parse(window.render_game_to_text()).audioState.contextState==='running');
 for(let i=0;i<5;i++)await button(p,'#pause');await wait(p,()=>JSON.parse(window.render_game_to_text()).audioState.contextState==='suspended');await button(p,'#pause');await wait(p,()=>JSON.parse(window.render_game_to_text()).audioState.contextState==='running');
 // Only count native speech when an available local voice actually starts.
 const speechVisible=await p.locator('#speak').isVisible();
 if(speechVisible){
  const baseline=(await audio(p)).effectiveMusicGain;await button(p,'#speak');
  const native=await p.evaluate(()=>({speaking:speechSynthesis.speaking,pending:speechSynthesis.pending}));
  if(native.speaking||native.pending){assert.equal((await audio(p)).reading,true);assert.ok((await audio(p)).effectiveMusicGain<baseline*.3);await snapshot(p,'speech-ducked');await button(p,'#restart');await p.waitForTimeout(150);assert.equal((await audio(p)).reading,false);assert.equal(await p.evaluate(()=>speechSynthesis.speaking),false);results.push({name:'native-speech',exercised:true});}
  else{results.push({name:'native-speech',exercised:false,reason:'Local speech did not start in isolated headless browser'});await button(p,'#restart');}
 }else results.push({name:'native-speech',exercised:false,reason:'No local English voice exposed'});
 // A real tab activation is counted only if the browser reports a transition.
 const beforeFocus=await p.evaluate(()=>({hidden:document.hidden,focus:document.hasFocus()}));const other=await c.newPage();await other.bringToFront();await p.waitForTimeout(100);const afterFocus=await p.evaluate(()=>({hidden:document.hidden,focus:document.hasFocus()}));a=await audio(p);
 const nativeTransition=(!beforeFocus.hidden&&afterFocus.hidden)||(beforeFocus.focus&&!afterFocus.focus)||a.background;
 if(nativeTransition)assert.equal(a.contextState,'suspended');results.push({name:'native-background',exercised:nativeTransition,beforeFocus,afterFocus,audio:a});await other.close();await p.bringToFront();if((await state(p)).mode==='paused')await button(p,'#pause');
 await wait(p,()=>JSON.parse(window.render_game_to_text()).audioState.contextState==='running');
 // Five restarts and a real shipment/Next transition keep one source/start.
 for(let i=0;i<5;i++){await button(p,'#restart');assert.equal((await audio(p)).musicSourceCount,1);assert.equal((await audio(p)).musicStarts,1);}
 for(const [x,z,tool] of [[2,3,'belt'],[4,3,'belt'],[5,3,'wash']]){await button(p,`[data-tool="${tool}"]`);await tapCell(p,x,z);}
 await button(p,'#run');for(let i=0;i<20&&(await state(p)).mode==='running';i++)await advance(p,1000);assert.equal((await state(p)).mode,'success');await button(p,'#next');assert.equal((await state(p)).challenge,2);a=await audio(p);assert.equal(a.musicSourceCount,1);assert.equal(a.musicStarts,1);assert.ok(a.activeEffects<=12);await snapshot(p,'next-level-single-loop');
 // Preferences persist, but a reload is not an audio-unlock gesture.
 await openMix(p);await p.locator('#music-enabled').uncheck();await p.reload({waitUntil:'domcontentloaded'});await wait(p,()=>typeof window.render_game_to_text==='function'&&Boolean(JSON.parse(window.render_game_to_text()).audioState));a=await audio(p);assert.equal(a.musicEnabled,false);assert.equal(a.effectsEnabled,true);assert.equal(a.musicVolume,.3);assert.equal(a.effectsVolume,.55);assert.equal(a.unlocked,false);assert.equal(a.musicSourceCount,0);await snapshot(p,'preferences-reloaded');await c.close();
 }
 // The actual popover, checkboxes and sliders fit/tap at mobile width.
 {
  const {c,p}=await context(true);await touch(p,'#music-mix');await wait(p,()=>{const a=JSON.parse(window.render_game_to_text()).audioState;return a.musicLoaded&&a.loadedCues===12&&a.contextState==='running';});
  for(const id of ['#music-mix','#mute','#music-enabled','#effects-enabled','#music-volume','#effects-volume','#close-audio']){const b=await p.locator(id).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=390&&b.y+b.height<=844,`${id} reachable at 390x844`);}
  await touch(p,'#effects-enabled');assert.equal((await audio(p)).effectsEnabled,false);await touch(p,'#music-enabled');assert.equal((await audio(p)).musicEnabled,false);await touch(p,'#music-enabled');await touch(p,'#effects-enabled');await touch(p,'#music-volume',.25);assert.notEqual((await audio(p)).musicVolume,.5,'touch adjusts music level');await snapshot(p,'mobile-mix',true);await touch(p,'#close-audio');if(requireIndustry)await snapshot(p,'mobile-industry-canvas',true);await touch(p,'#mute');await wait(p,()=>JSON.parse(window.render_game_to_text()).audioState.contextState==='suspended');await snapshot(p,'mobile-muted');await c.close();
 }
 }
 assert.deepEqual(errors,[]);assert.ok(requests.length>=12);assert.ok(requests.every(r=>r.status===200));
 await fs.writeFile(path.join(root,'docs/review',speechOnly?'audio-speech-summary.json':mobileOnly?'audio-mobile-summary.json':'audio-summary.json'),JSON.stringify({results,requests,errors},null,2));
}catch(e){let observed=null;if(currentPage&&!currentPage.isClosed()){observed=await state(currentPage).catch(()=>null);await currentPage.screenshot({path:path.join(root,'docs/review/audio-FAILED.png'),timeout:5000}).catch(()=>{});}await fs.writeFile(path.join(root,'docs/review/audio-failure.json'),JSON.stringify({error:String(e.stack),observed,requests,errors,results},null,2));await fs.writeFile(path.join(root,'docs/review/audio-failure.txt'),String(e.stack));console.error(e);process.exitCode=1;}
finally{await browser.close();}
