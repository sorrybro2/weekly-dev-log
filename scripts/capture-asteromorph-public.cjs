const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(path.join(os.tmpdir(),'fullstack-review-tools','node_modules','playwright'));
const root = path.resolve(__dirname,'..');
const dir = path.join(root,'assets','portfolio','asteromorph');
(async()=>{
  fs.mkdirSync(dir,{recursive:true});
  const browser=await chromium.launch({headless:true});
  const sites=[{id:'homepage-v2',url:'https://bslawwin.co.kr'},{id:'legacy-homepage',url:'https://lawwin.co.kr'},{id:'runandjump',url:'https://runandjump-five.vercel.app'}];
  try{
    const results=await Promise.all(sites.map(async site=>{
      const context=await browser.newContext({viewport:{width:1440,height:850},deviceScaleFactor:1,reducedMotion:'reduce'});
      const page=await context.newPage();
      try{
        let response=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:45000});
        await page.waitForLoadState('networkidle',{timeout:12000}).catch(()=>{});
        if(site.id==='legacy-homepage'){
          const target=await page.locator('a').evaluateAll(items=>items.map(a=>({text:(a.innerText||a.textContent||'').trim(),href:a.href})).find(a=>/^서울(?:\s|$)/.test(a.text)&&/^https?:\/\/(?:www\.)?lawwin\.co\.kr\//.test(a.href)));
          if(target){response=await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForLoadState('networkidle',{timeout:12000}).catch(()=>{});}
        }
        const close=page.getByRole('button',{name:'닫기',exact:true});
        for(let i=0;i<await close.count();i++){if(await close.nth(i).isVisible())await close.nth(i).click();}
        await page.evaluate(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3000))]);});
        await page.waitForTimeout(1600);
        const clip=site.id==='runandjump'?undefined:{x:0,y:0,width:1440,height:460};
        await page.screenshot({path:path.join(dir,site.id+'.png'),fullPage:false,...(clip?{clip}:{})});
        return {...site,finalUrl:page.url(),title:await page.title(),status:response?.status(),capturedOn:'2026-10-14',viewport:{width:1440,height:850},screenshotClip:clip,capture:'Public page, unauthenticated browser, no form submission'};
      }catch(e){return {...site,error:e.message};}finally{await context.close();}
    }));
    fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
    if(results.some(x=>x.error||x.status>=400))process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
