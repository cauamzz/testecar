// Read-only page inspection: no clicks, form submissions or remote writes.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
(async () => {
  fs.mkdirSync('test-results/screenshots', { recursive: true });
  const browser = await chromium.launch({headless:true});
  const results = [];
  try {
    for (const width of [320,375,390,430,768,1440]) {
      const context = await browser.newContext({viewport:{width,height:900}});
      const page = await context.newPage();
      const optional = [];
      page.on('request', req => { if (/google-analytics|googletagmanager|connect\.facebook|maps\.google/.test(req.url())) optional.push(new URL(req.url()).hostname); });
      await page.goto('http://localhost:3000/', {waitUntil:'networkidle'});
      const layout = await page.evaluate(() => ({overflow:document.documentElement.scrollWidth > innerWidth, banner:!!document.querySelector('.cookie-banner'), choices:[...document.querySelectorAll('.cookie-banner button')].map(b=>({text:b.textContent,height:b.getBoundingClientRect().height}))}));
      if(layout.overflow || !layout.banner || optional.length || layout.choices.some(b=>b.height<44)) throw new Error(JSON.stringify({width,layout,optional}));
      await page.screenshot({path:`test-results/screenshots/readiness-${width}.png`});
      results.push({width,...layout,optionalRequests:optional});
      await context.close();
    }
    for (const path of ['/privacidade','/robots.txt','/sitemap.xml','/icon.svg','/opengraph-image','/pagina-que-nao-existe']) {
      const response = await fetch('http://localhost:3000'+path);
      const body = path==='/opengraph-image'?'':await response.text();
      const expected=path==='/pagina-que-nao-existe'?404:200;
      if(response.status!==expected)throw new Error(path+': '+response.status);
      if(path==='/privacidade'&&!body.includes('id="cookies"'))throw new Error('Missing cookie policy');
      results.push({path,status:response.status,contentType:response.headers.get('content-type')});
    }
    fs.writeFileSync('test-results/readiness-static.json',JSON.stringify(results,null,2));
    console.log('6 viewports and 6 HTTP routes passed; no clicks or optional tracker requests.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
