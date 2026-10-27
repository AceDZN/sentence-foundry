import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const plans = JSON.parse(await fs.readFile("work/campaign-plans.json","utf8"));
const mobile = process.argv.includes("--mobile");
const browser = await chromium.launch({headless:true,executablePath:process.env.SF_REVIEW_EXECUTABLE || "/Users/acedzn/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell",args:["--use-angle=metal"]});
const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
const page = await context.newPage();
const errors=[], results=[];
page.on("pageerror",e=>errors.push(String(e)));
page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
page.setDefaultTimeout(8000);
const state=async()=>JSON.parse(await page.evaluate(()=>window.render_game_to_text()));
const button=async selector=>{if(mobile)await page.locator(selector).tap();else await page.locator(selector).click();};
async function cell(x,z){const s=await state(),p=s.cellScreen.find(c=>c.x===x&&c.z===z).screen;if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
async function capture(name){await page.waitForTimeout(750);await page.screenshot({path:`docs/review/campaign-${mobile?"mobile-":""}${name}.png`});await fs.writeFile(`docs/review/campaign-${mobile?"mobile-":""}${name}.json`,JSON.stringify(await state(),null,2));}
async function build(plan){
  await button("#erase");
  for(const t of (await state()).tiles)await cell(t.x,t.z);
  for(const t of plan.tiles){
    await button(`[data-tool="${t.kind}"]`);
    for(let i=0;i<t.rotation;i++)await button("#rotate");
    await cell(t.x,t.z);
    const actual=(await state()).tiles.find(c=>c.x===t.x&&c.z===t.z);
    assert.equal(actual?.kind,t.kind,`placed ${t.kind} at ${t.x},${t.z}`);
    assert.equal(actual.rotation,t.rotation);
  }
}
try{
  await page.goto(process.env.SF_REVIEW_URL||"http://localhost:5233",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof window.render_game_to_text==="function"&&JSON.parse(window.render_game_to_text()).assets.arm==="ready");
  await capture("onboarding");
  await button("#dismiss-coach");
  if(!mobile){
    const original=(await state()).tiles;
    await cell(2,2); // Selecting a part must preserve it.
    assert.deepEqual((await state()).tiles,original);
    await button("#rotate");
    assert.equal((await state()).tiles.find(t=>t.x===2&&t.z===2).rotation,3);
    await page.keyboard.press("m");
    await cell(1,3); // Occupied destination must not destroy either part.
    assert.equal((await state()).tiles.length,original.length);
    assert.ok((await state()).controls.moveFrom);
    await cell(2,3);
    assert.ok((await state()).tiles.some(t=>t.x===2&&t.z===3));
    await button("#undo");
    assert.ok((await state()).tiles.some(t=>t.x===2&&t.z===2));
    await page.keyboard.press("Escape");
    assert.equal((await state()).mode,"editing");
    await cell(2,2);
    await page.keyboard.press("Delete");
    assert.equal((await state()).tiles.length,original.length-1);
    await page.keyboard.press("ControlOrMeta+z");
    assert.equal((await state()).tiles.length,original.length);
    await button("#help");
    assert.ok((await page.locator("#dialog-content").innerText()).includes("אין צורך לגרור"));
    await button("#close-dialog");
    await button("#restart");
    for(let index=0;index<plans.length;index++){
      const plan=plans[index];
      assert.equal((await state()).challenge,index+1);
      await build(plan);
      if(index===11){
        const before=(await state()).tiles;
        await page.reload({waitUntil:"domcontentloaded"});
        await page.waitForFunction(()=>typeof window.render_game_to_text==="function");
        assert.equal((await state()).challenge,12);
        assert.deepEqual((await state()).tiles,before,"draft survives reload");
        assert.equal((await state()).campaign.completed,11);
      }
      await button("#run");
      if([10,25,34,44].includes(index)){
        await page.evaluate(()=>window.advanceTime(3500));
        await button("#pause");await capture(`level-${index+1}-machinery`);await button("#pause");
      }
      await page.evaluate(()=>window.advanceTime(65000));
      const s=await state();
      assert.equal(s.mode,"success",`level${index+1}: ${s.jam} ${JSON.stringify(s.deliveries)}`);
      assert.equal(s.campaign.completed,index+1);
      results.push({level:index+1,title:s.title,accepted:s.accepted,layout:s.campaign.layout,pieces:s.tiles.length});
      console.log(`campaign ${index+1}/45 passed`);
      if([4,14,29,44].includes(index))await capture(`level-${index+1}-complete`);
      if(index<44)await button("#next");
    }
    assert.equal((await state()).campaign.finaleVisible,true);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>typeof window.render_game_to_text==="function");
    assert.equal((await state()).campaign.finaleVisible,true,"ending persists after reload");
    assert.equal((await state()).challenge,45,"ending never wraps to first level");
    await button("#finale-map");
    assert.equal(await page.locator("[data-level]").count(),45);
    await capture("all-complete-map");
    await button('[data-level="10"]');
    assert.equal((await state()).challenge,11);
    assert.equal((await state()).campaign.completed,45,"replay preserves completion");
    await page.waitForFunction(()=>{
      const s=JSON.parse(window.render_game_to_text());
      return s.assets.washer==='ready'&&s.assets.arm==='ready'&&s.industryAssets.pump==='ready'&&s.industryAssets.spotlight==='ready';
    });
    await button('[data-tool="wash"]');await cell(3,3);await button("#restart");
    await page.evaluate(()=>window.advanceTime(0));
    const resourceBaseline=(await state()).performance.resources;
    assert.ok(resourceBaseline,"resource counters exposed");
    for(let cycle=0;cycle<6;cycle++){
      await button('[data-tool="wash"]');await cell(3,3);
      await button("#rotate");await button("#rotate");
      await button("#restart");await page.evaluate(()=>window.advanceTime(0));
    }
    const resourceAfter=(await state()).performance.resources;
    assert.ok(resourceAfter.geometries<=resourceBaseline.geometries+5,`geometries bounded ${JSON.stringify({resourceBaseline,resourceAfter})}`);
    assert.ok(resourceAfter.textures<=resourceBaseline.textures+2,`textures bounded ${JSON.stringify({resourceBaseline,resourceAfter})}`);
    results.push({resourceBaseline,resourceAfter});
    assert.equal((await state()).audioState.musicSourceCount,1);
    assert.equal((await state()).audioState.musicStarts,1);
  }else{
    await button("#campaign-open");
    assert.equal(await page.locator("[data-level]").count(),45);
    await capture("level-book");
    await button('[data-level="34"]');
    assert.equal(await page.locator("[data-tool]").count(),8);
    await build(plans[34]);
    await capture("eight-tools");
    await button("#run");
    await page.evaluate(()=>window.advanceTime(65000));
    assert.equal((await state()).mode,"success");
    await capture("advanced-success");
    results.push({mobileTouchAdvancedSuccess:true});
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(`docs/review/campaign-${mobile?"mobile-":""}summary.json`,JSON.stringify({results,errors},null,2));
}catch(e){console.error(e);await capture("FAILED").catch(()=>{});process.exitCode=1;}
finally{await browser.close();}
