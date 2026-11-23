// QA_PLAYWRIGHT=<playwright-core package> QA_BROWSER_ROOT=<ms-playwright cache>
// QA_BASE_URL=http://127.0.0.1:5175 QA_BROWSER_OUTPUT=<artifact directory> node docs/qa05-browser-smoke.cjs
const { chromium, firefox } = require(process.env.QA_PLAYWRIGHT)
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5175'
const output = process.env.QA_BROWSER_OUTPUT || path.join(__dirname,'qa05-browser-evidence')
fs.mkdirSync(output,{recursive:true})
const results=[]
const specs=[
 {name:'chromium-desktop',engine:chromium,folder:'chromium-1255/chrome-win64/chrome.exe',viewport:{width:1440,height:1000}},
 {name:'firefox-desktop',engine:firefox,folder:'firefox-1572/firefox/firefox.exe',viewport:{width:1440,height:1000}},
 {name:'chromium-mobile',engine:chromium,folder:'chromium-1255/chrome-win64/chrome.exe',viewport:{width:390,height:844}},
]
async function run(spec) {
 let browser
 const entry={name:spec.name,viewport:spec.viewport,checks:[],apiRequests:0}
 results.push(entry)
 try {
  browser=await spec.engine.launch({headless:true,executablePath:path.join(process.env.QA_BROWSER_ROOT,spec.folder)})
  entry.browserVersion=browser.version()
  const context=await browser.newContext({viewport:spec.viewport})
  const page=await context.newPage()
  page.setDefaultTimeout(20000)
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))entry.apiRequests++})
  async function step(name,fn) {
   try {await fn();entry.checks.push({name,status:'PASS'});return true}
   catch {entry.checks.push({name,status:'FAIL'});return false}
  }
  await page.goto(base+'/goi-y',{waitUntil:'domcontentloaded'})
  const title=page.locator('#panel-goi-y article h2')
  if (!await step('guest suggestion from live API',async()=>{await title.waitFor();assert((await title.textContent()).trim());assert(entry.apiRequests>0)}))return
  const first=(await title.textContent()).trim()
  await step('next dish does not repeat',async()=>{
   await page.getByRole('button',{name:'Xem gợi ý khác',exact:true}).click()
   await page.waitForFunction(value=>document.querySelector('#panel-goi-y article h2')?.textContent.trim()!==value,first)
   await title.waitFor();assert.notEqual((await title.textContent()).trim(),first)
  })
  await step('history previous card',async()=>{
   await page.getByRole('button',{name:'Xem lại món trước đó',exact:true}).click()
   assert.equal((await title.textContent()).trim(),first)
  })
  await step('dish navigation reaches FE10 placeholder and back preserves suggestion',async()=>{
   await page.getByRole('link',{name:/Nấu món này/}).click()
   await page.waitForURL(/\/dishes\//)
   assert((await page.locator('body').textContent()).includes('FE10'))
   await page.goBack();await title.waitFor();assert.equal((await title.textContent()).trim(),first)
  })
  await page.getByRole('tab',{name:'Nguyên liệu',exact:true}).click()
  const find=page.getByRole('button',{name:'Tìm món',exact:true})
  await step('zero ingredients prevents search',async()=>assert(await find.isDisabled()))
  const input=page.getByRole('combobox')
  await step('unselected free text cannot become ingredient chip',async()=>{
   await input.fill('qa04zzznomatch20261123')
   await page.getByText('Không tìm thấy nguyên liệu này',{exact:false}).waitFor()
   await input.press('Enter');assert(await find.isDisabled());await input.fill('')
  })
  async function add(id,query){await input.fill(query);await page.locator('#ingredient-option-'+id).click();await input.fill('')}
  if (!await step('canonical autocomplete and alias selects seven ingredients',async()=>{
   for(const [id,q] of [[5,'dau an'],[6,'gia vi thong dung'],[8,'gung'],[11,'ruou trang'],[28,'hanh xanh'],[55,'kho qua'],[57,'ngo ri']])await add(id,q)
  }))return
  const dish=page.locator('#panel-nguyen-lieu a[href="/dishes/33"]')
  if (!await step('seven ingredients: dish33 87% and 7/8 with missing pork',async()=>{
   await find.click();await dish.waitFor();const text=await dish.textContent();assert(text.includes('87%'));assert(text.includes('7/8'));assert(text.includes('Sườn heo'))
  }))return
  await page.screenshot({path:path.join(output,spec.name+'-seven.png'),fullPage:true})
  await step('eight ingredients: dish33 100% and 8/8',async()=>{
   await add(56,'suon heo');await find.click();await page.waitForFunction(()=>document.querySelector('#panel-nguyen-lieu a[href="/dishes/33"]')?.textContent.includes('8/8'))
   assert((await dish.textContent()).includes('100%'))
  })
  await step('switching tabs preserves ingredient results',async()=>{
   await page.getByRole('tab',{name:'Khám phá',exact:true}).click();await title.waitFor()
   await page.getByRole('tab',{name:'Nguyên liệu',exact:true}).click();await dish.waitFor();assert((await dish.textContent()).includes('8/8'))
  })
  await step('match detail placeholder and back preserves results',async()=>{
   await dish.click();await page.waitForURL(/\/dishes\/33/);assert((await page.locator('body').textContent()).includes('FE10'))
   await page.goBack();await dish.waitFor();assert((await dish.textContent()).includes('8/8'))
  })
  await step('viewport has no horizontal overflow',async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)))
  await page.screenshot({path:path.join(output,spec.name+'-eight.png'),fullPage:true})
  entry.remaining='FE10 complete flow, full QA04 matrix, controlled four groups, PO/Jira acceptance remain pending'
 } catch (error) {entry.error=String(error.message).slice(0,500);entry.checks.push({name:'browser setup or navigation',status:'FAIL'})}
 finally {if(browser)await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),environment:'FE09 786605d + explicit-router live Supabase preview; not INT02 acceptance',results},null,2)+String.fromCharCode(10))}
}
;(async()=>{for(const spec of specs.filter(x=>!process.env.QA_BROWSER_FILTER || x.name===process.env.QA_BROWSER_FILTER)){await run(spec);console.log(spec.name+': '+JSON.stringify(results.at(-1).checks))}if(results.some(x=>x.checks.some(y=>y.status==='FAIL')))process.exitCode=1})()
