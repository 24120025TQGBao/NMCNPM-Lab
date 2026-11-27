// Guest GET-only E2E: FE11 UI + actual INT02 backend, plus isolated HTTP fault injection.
const {chromium,firefox}=require(process.env.QA_PLAYWRIGHT)
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const base=process.env.QA_BASE_URL||'http://127.0.0.1:5175'
const output=process.env.QA_BROWSER_OUTPUT||path.join(__dirname,'fe11-browser-evidence')
fs.mkdirSync(output,{recursive:true})
const results=[]
const specs=[
 {name:'chromium-desktop',engine:chromium,folder:'chromium-1255/chrome-win64/chrome.exe',viewport:{width:1440,height:1000}},
 {name:'firefox-desktop',engine:firefox,folder:'firefox-1572/firefox/firefox.exe',viewport:{width:1440,height:1000}},
 {name:'chromium-mobile',engine:chromium,folder:'chromium-1255/chrome-win64/chrome.exe',viewport:{width:390,height:844}},
]
async function run(spec){
 const entry={name:spec.name,viewport:spec.viewport,checks:[]};results.push(entry)
 let browser
 try{
  browser=await spec.engine.launch({headless:true,executablePath:path.join(process.env.QA_BROWSER_ROOT,spec.folder)})
  entry.browserVersion=browser.version()
  const context=await browser.newContext({viewport:spec.viewport})
  if(spec.engine===chromium){await context.grantPermissions(['clipboard-read','clipboard-write']);entry.clipboard='native Chromium Clipboard API'}
  else{await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__qaClipboard=text}}}));entry.clipboard='controlled clipboard implementation for Firefox'}
  const page=await context.newPage();page.setDefaultTimeout(30000)
  async function step(name,fn){try{await fn();entry.checks.push({name,status:'PASS'});return true}catch(e){entry.checks.push({name,status:'FAIL',reason:String(e.message).slice(0,160)});return false}}
  await page.goto(base+'/goi-y?tab=nguyen-lieu',{waitUntil:'domcontentloaded'})
  const input=page.getByRole('combobox'),find=page.getByRole('button',{name:'Tìm món',exact:true})
  const add=async(id,q)=>{await input.fill(q);await page.locator('#ingredient-option-'+id).click();await input.fill('')}
  if(!await step('select seven canonical demo ingredients through autocomplete',async()=>{
   for(const[id,q]of[[5,'dau an'],[6,'gia vi thong dung'],[8,'gung'],[11,'ruou trang'],[28,'hanh xanh'],[55,'kho qua'],[57,'ngo ri']])await add(id,q)
  }))return
  let matches
  if(!await step('BE12 live: pork unlocks dish33 in FE09 extension slot',async()=>{
   const pending=page.waitForResponse(r=>r.url().includes('/api/dishes/match?')&&r.status()===200)
   await find.click();matches=(await(await pending).json()).data
   const section=page.getByRole('region',{name:'Gợi ý mua thêm'})
   await section.waitFor();assert((await section.textContent()).includes('Mua thêm 1 thứ mở khóa 1 món'));assert((await section.textContent()).includes('Sườn heo'))
  }))return
  const dish33=matches.find(x=>x.id===33),missingGroup=matches.filter(x=>!x.is_incomplete&&x.readiness==='NEED_SHOPPING')
  let memberIds=[],pinId,pinName
  const names={55:'Khổ qua',8:'Gừng',11:'Rượu trắng',57:'Ngò rí',28:'Hành lá',6:'Gia vị thông dụng',5:'Dầu ăn'}
  for(const id of[55,8,11,57,28,6,5]){
   const response=await page.request.get(base+`/api/dishes?ingredients=${id}&page=1&limit=50`)
   assert.equal(response.status(),200)
   const body=await response.json();const ids=body.data.map(x=>x.id)
   if(!ids.includes(missingGroup[0]?.id)&&missingGroup.some(x=>ids.includes(x.id))){pinId=id;pinName=names[id];memberIds=ids;break}
  }
  const originalFirst=missingGroup[0]?.id,expectedFirst=missingGroup.find(x=>memberIds.includes(x.id))?.id
  const needSection=page.locator('section').filter({has:page.getByRole('heading',{name:'Cần đi chợ',exact:true})})
  if(!await step('pin verified ingredient changes order within group, keeping score and completeness',async()=>{
   assert(pinId,'Need a demo ingredient that changes group order')
   await page.getByRole('button',{name:'Ghim '+pinName,exact:true}).click()
   await page.waitForFunction(expected=>[...document.querySelectorAll('section')].find(s=>[...s.querySelectorAll('h3')].some(h=>h.textContent.trim()==='Cần đi chợ'))?.querySelector('a')?.getAttribute('href')==='/dishes/'+expected,expectedFirst)
   assert.notEqual(expectedFirst,originalFirst)
   const target=matches.find(x=>x.id===expectedFirst)
   assert((await needSection.locator('a').first().textContent()).includes(Math.round(target.match_ratio*100)+'%'))
   assert((await page.locator('#panel-nguyen-lieu').textContent()).includes('Chưa đủ dữ liệu để kết luận'))
   entry.pinExample={ingredientId:pinId,before:originalFirst,after:expectedFirst}
  }))return
  await step('unpin restores API order',async()=>{
   await page.getByRole('button',{name:'Bỏ ghim '+pinName,exact:true}).click()
   assert.equal(await needSection.locator('a').first().getAttribute('href'),'/dishes/'+originalFirst)
  })
  await step('selected dish copies only its known missing pork ingredient',async()=>{
   await page.getByRole('checkbox',{name:`Thêm nguyên liệu thiếu của ${dish33.name} vào danh sách đi chợ`,exact:true}).check()
   await page.getByRole('button',{name:'Sao chép danh sách đi chợ',exact:true}).click()
   await page.getByText('Đã sao chép danh sách đi chợ.',{exact:true}).waitFor()
   const text=await page.evaluate(async()=>window.__qaClipboard??await navigator.clipboard.readText())
   assert.equal(text,'- Sườn heo')
  })
  await page.screenshot({path:path.join(output,spec.name+'-shopping.png'),fullPage:true})
  await step('clipboard denial shows error and clears success',async()=>{
   await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:async()=>{throw new DOMException('Denied','NotAllowedError')}}))
   await page.getByRole('button',{name:'Sao chép danh sách đi chợ',exact:true}).click()
   await page.getByText('Không sao chép được danh sách. Vui lòng cho phép sao chép hoặc thử lại.',{exact:true}).waitFor()
   assert.equal(await page.getByText('Đã sao chép danh sách đi chợ.',{exact:true}).count(),0)
  })
  await step('pin and shopping selection persist on reload',async()=>{
   await page.getByRole('button',{name:'Ghim '+pinName,exact:true}).click()
   await page.reload({waitUntil:'domcontentloaded'})
   await page.getByRole('button',{name:'Bỏ ghim '+pinName,exact:true}).waitFor()
   assert(await page.getByRole('checkbox',{name:`Thêm nguyên liệu thiếu của ${dish33.name} vào danh sách đi chợ`,exact:true}).isChecked())
  })
  await step('mark purchased ingredient as available and search again',async()=>{
   await page.getByRole('button',{name:'Thêm Sườn heo vào nguyên liệu đang có',exact:true}).click()
   assert.equal(await page.getByRole('region',{name:'Gợi ý mua thêm'}).count(),0)
   const pending=page.waitForResponse(r=>r.url().includes('/api/dishes/match?')&&r.status()===200)
   await find.click();await pending
   await page.waitForFunction(()=>document.querySelector('#panel-nguyen-lieu a[href="/dishes/33"]')?.textContent.includes('8/8'))
   assert((await page.locator('#panel-nguyen-lieu a[href="/dishes/33"]').textContent()).includes('100%'))
   assert(await page.getByRole('button',{name:'Sao chép danh sách đi chợ',exact:true}).isDisabled())
  })
  await step('BE12 error leaves matches usable and retry to [] hides purchase section',async()=>{
   const pattern='**/api/ingredients/suggest-next?**'
   await page.route(pattern,route=>route.fulfill({status:500,json:{error:{code:'INTERNAL_ERROR',message:'QA fault injection'}}}))
   await page.reload({waitUntil:'domcontentloaded'})
   await page.getByRole('button',{name:'Thử lại gợi ý mua thêm',exact:true}).waitFor()
   assert(await page.locator('#panel-nguyen-lieu a[href="/dishes/33"]').isVisible())
   await page.unroute(pattern)
   await page.route(pattern,route=>route.fulfill({status:200,json:{data:[]}}))
   const pending=page.waitForResponse(r=>r.url().includes('/api/ingredients/suggest-next?')&&r.status()===200)
   await page.getByRole('button',{name:'Thử lại gợi ý mua thêm',exact:true}).click();await pending
   await page.waitForFunction(()=>!document.querySelector('[aria-label="Gợi ý mua thêm"]')&&!document.body.textContent.includes('Thử lại gợi ý mua thêm'))
   await page.unroute(pattern)
  })
  await step('pin lookup failure preserves API order and retry recovers',async()=>{
   const pattern='**/api/dishes?ingredients='+pinId+'&**'
   await page.route(pattern,route=>route.fulfill({status:500,json:{error:{code:'INTERNAL_ERROR',message:'QA fault injection'}}}))
   await page.reload({waitUntil:'domcontentloaded'})
   await page.getByRole('button',{name:'Thử lại ưu tiên nguyên liệu ghim',exact:true}).waitFor()
   const group=page.locator('section').filter({has:page.getByRole('heading',{name:'Cần đi chợ',exact:true})})
   assert.equal(await group.locator('a').first().getAttribute('href'),'/dishes/'+originalFirst)
   await page.unroute(pattern)
   await page.getByRole('button',{name:'Thử lại ưu tiên nguyên liệu ghim',exact:true}).click()
   await page.waitForFunction(expected=>[...document.querySelectorAll('section')].find(s=>[...s.querySelectorAll('h3')].some(h=>h.textContent.trim()==='Cần đi chợ'))?.querySelector('a')?.getAttribute('href')==='/dishes/'+expected,expectedFirst)
  })
  await step('responsive layout has no horizontal overflow',async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)))
  await page.screenshot({path:path.join(output,spec.name+'-complete.png'),fullPage:true})
 }catch(error){entry.checks.push({name:'browser setup or prerequisites',status:'FAIL',reason:String(error.message).slice(0,160)})}
 finally{if(browser)await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),source:{backend:'INT02 449d189',frontend:'FE11 on FE09 786605d'},results},null,2)+String.fromCharCode(10))}
}
;(async()=>{for(const spec of specs.filter(x=>!process.env.QA_BROWSER_FILTER||x.name===process.env.QA_BROWSER_FILTER)){await run(spec);console.log(spec.name+': '+JSON.stringify(results.at(-1).checks))}if(results.some(x=>x.checks.some(y=>y.status==='FAIL')))process.exitCode=1})()
