// Actual candidate GET-only E2E; HTTP fixtures are labelled explicitly in the result.
const {chromium,firefox}=require(process.env.QA_PLAYWRIGHT)
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const base=process.env.QA_BASE_URL||'http://127.0.0.1:5175'
const output=process.env.QA_BROWSER_OUTPUT||path.join(__dirname,'qa05-full-flow-evidence')
const audit=JSON.parse(fs.readFileSync(process.env.QA_DATASET_AUDIT,'utf8'))
fs.mkdirSync(output,{recursive:true})
const results=[]
const specs=[
 {name:'chromium-desktop',engine:chromium,folder:'chromium-1255/chrome-win64/chrome.exe',viewport:{width:1440,height:1000}},
 {name:'firefox-desktop',engine:firefox,folder:'firefox-1572/firefox/firefox.exe',viewport:{width:1440,height:1000}},
 {name:'chromium-mobile',engine:chromium,folder:'chromium-1255/chrome-win64/chrome.exe',viewport:{width:390,height:844}},
]
async function run(spec){
 let browser
 const entry={name:spec.name,viewport:spec.viewport,checks:[]};results.push(entry)
 try{
  browser=await spec.engine.launch({headless:true,executablePath:path.join(process.env.QA_BROWSER_ROOT,spec.folder)})
  entry.browserVersion=browser.version()
  const context=await browser.newContext({viewport:spec.viewport})
  const page=await context.newPage();page.setDefaultTimeout(20000)
  const source=await(await page.request.get((process.env.QA_API_BASE||'http://127.0.0.1:3102')+'/__qa_source')).json();entry.source=source.source
  const check=async(ac,name,fn,mode='LIVE')=>{
   try{await fn();entry.checks.push({ac,name,status:'PASS',mode});return true}
   catch(e){const screenshot=spec.name+'-finding-'+entry.checks.length+'.png';await page.screenshot({path:path.join(output,screenshot),fullPage:true}).catch(()=>{});entry.checks.push({ac,name,status:'FAIL',mode,reason:String(e.message).slice(0,220),screenshot});return false}
  }
  const failHttp=async route=>{await new Promise(done=>setTimeout(done,1000));await route.fulfill({status:500,json:{error:{code:'INTERNAL_ERROR',message:'QA injected'}}}).catch(()=>{})}
  const blocked=(ac,name,reason)=>entry.checks.push({ac,name,status:'BLOCKED',mode:'LIVE_DATA_PRECONDITION',reason})
  const json=async(route)=>{const r=await page.request.get(base+'/api'+route);assert.equal(r.status(),200);return r.json()}
  const title=()=>page.locator('#panel-goi-y article h2')

  if(process.env.QA_CASE_FILTER==='exhaustion'){
   await page.goto(base+'/goi-y');await title().waitFor()
   await check(['S2-01.4','S2-01.5'],'chip request keeps AND criteria and never silently relaxes them',async()=>{
    let pending=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200)
    await page.getByRole('button',{name:'Trời mưa',exact:true}).click();let batch=(await(await pending).json()).data
    const seen=new Set()
    while(batch.length){assert(!seen.has(batch[0].id));seen.add(batch[0].id);assert(seen.size<=100);await title().waitFor();pending=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200);await page.getByRole('button',{name:'Xem gợi ý khác',exact:true}).click();batch=(await(await pending).json()).data}
    await page.getByRole('heading',{name:/^(Chưa có món phù hợp|Đã xem hết gợi ý)$/}).waitFor()
    const wait=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200);await page.getByRole('button',{name:'Ăn nhẹ',exact:true}).click();const response=await wait
    assert.deepEqual(new URL(response.url()).searchParams.get('the').split(',').sort(),['AN_NHE','TROI_MUA'])
    for(const name of ['Trời mưa','Ăn nhẹ'])assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true')
    entry.exhaustedDishIds=[...seen]
   })
   return
  }

  if(process.env.QA_CASE_FILTER==='recipe-facts'){
   const recipe=await json('/recipes/25')
   await page.goto(base+'/recipes/25',{waitUntil:'domcontentloaded'})
   await check(['S2-04.4','S2-04.5','S2-04.9'],'guest recipe has facts, quantities, to-taste and ordered steps',async()=>{
    await page.getByRole('heading',{level:1,name:recipe.data.name,exact:true}).waitFor()
    for(const ingredient of recipe.data.ingredients){
     const text=ingredient.quantity===null?'Tùy khẩu vị':new Intl.NumberFormat('vi-VN').format(ingredient.quantity)+(ingredient.unit?' '+ingredient.unit:' (chưa có đơn vị)')
     assert(await page.getByText(text,{exact:true}).count()>0,'missing quantity/unit: '+text)
    }
    assert(await page.getByText('60 phút',{exact:true}).isVisible())
    assert.deepEqual(await page.getByRole('heading',{name:/^Bước /}).allTextContents(),recipe.data.steps.map(x=>'Bước '+x.order))
    assert((await page.locator('body').textContent()).includes('Khẩu phần'));assert((await page.locator('body').textContent()).includes('Chưa cập nhật'))
   })
   return
  }
  if(process.env.QA_CASE_FILTER==='pantry'){
   const ids=[5,6,8,11,28,55,56,57],body=await json('/dishes/match?ingredients='+ids.join(',')+'&pantry=true')
   const names=['Dầu ăn','Gia vị thông dụng','Gừng','Rượu trắng','Hành lá','Khổ qua','Sườn heo','Ngò rí']
   const state={suggest:{chips:[],region:null,history:[],index:-1,skippedIds:[]},match:{
    ingredients:ids.map((id,i)=>({id,name:names[i]})),pantry:true,queryKey:ids.join(',')+'|true',pinnedIds:[],shoppingDishIds:[],
    results:body.data.map(x=>({id:x.id,name:x.name,imageUrl:x.image_url,matchRatio:x.match_ratio,haveCount:x.have_count,totalCount:x.total_count,missing:x.missing,readiness:x.readiness,isIncomplete:x.is_incomplete})),
   }}
   await context.addInitScript(state=>sessionStorage.setItem('hnag:suggest-session:v1',JSON.stringify(state)),state)
   await page.goto(base+'/goi-y?tab=nguyen-lieu',{waitUntil:'domcontentloaded'})
   await page.locator('#panel-nguyen-lieu a[href="/dishes/33"]').waitFor()
   await check(['S2-02.8','S2-02.16'],'matching loading/error/retry preserves chips and sends pantry=false',async()=>{
    const match=url=>url.pathname==='/api/dishes/match';await page.route(match,failHttp)
    try{
     await Promise.all([
      page.locator('#panel-nguyen-lieu .animate-pulse').waitFor(),
      page.locator('#panel-nguyen-lieu input[type="checkbox"]').first().locator('..').click(),
     ])
     assert(await page.getByRole('button',{name:'Tìm món',exact:true}).isDisabled())
     await page.getByRole('button',{name:'Thử lại',exact:true}).waitFor()
     assert(await page.getByRole('button',{name:'Bỏ Sườn heo',exact:true}).isVisible())
    }finally{await page.unroute(match)}
    const wait=page.waitForResponse(r=>r.url().includes('/api/dishes/match?')&&r.status()===200)
    await page.getByRole('button',{name:'Thử lại',exact:true}).click();const response=await wait
    assert.equal(new URL(response.url()).searchParams.get('pantry'),'false')
    await page.locator('#panel-nguyen-lieu a[href="/dishes/33"]').waitFor()
   },'LIVE_API_STATE_WITH_HTTP_FAULT_INJECTION')
   return
  }
  await page.goto(base+'/goi-y',{waitUntil:'domcontentloaded'})
  if(!await check(['S2-01.1'],'guest suggestion has required actions',async()=>{
   await title().waitFor();await page.getByRole('link',{name:'Nấu món này',exact:true}).waitFor()
   assert(await page.getByRole('button',{name:'Xem gợi ý khác',exact:true}).isVisible())
   assert(await page.getByRole('button',{name:'Bỏ qua món này',exact:true}).isVisible())
  }))return
  const first=await title().textContent()
  await check(['S2-01.2'],'next dish excludes viewed ID',async()=>{
   const wait=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200)
   await page.getByRole('button',{name:'Xem gợi ý khác',exact:true}).click();const response=await wait
   assert(new URL(response.url()).searchParams.get('exclude'));const payload=await response.json();await page.waitForFunction(name=>document.querySelector('#panel-goi-y article h2')?.textContent.trim()===name,payload.data[0].name);assert.notEqual(await title().textContent(),first)
  })
  await check(['S2-01.3'],'review previous card',async()=>{await page.getByRole('button',{name:'Xem lại món trước đó',exact:true}).click();assert.equal(await title().textContent(),first)})
  await check(['S2-01.6'],'guest random keeps exclusions',async()=>{
   const wait=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200)
   await page.getByRole('button',{name:'Hôm nay ăn gì ngẫu nhiên',exact:true}).click();const response=await wait
   assert.equal(new URL(response.url()).searchParams.get('random'),'true');assert(new URL(response.url()).searchParams.get('exclude'));const payload=await response.json();await page.waitForFunction(name=>document.querySelector('#panel-goi-y article h2')?.textContent.trim()===name,payload.data[0].name)
  })
  const beforeDetail=await title().textContent()
  await page.getByRole('link',{name:'Nấu món này',exact:true}).click();await page.waitForURL(url=>url.pathname.startsWith('/dishes/'))
  await check(['S2-01.7','S2-04.10'],'app return link preserves suggestion origin',async()=>{
   const href=await page.getByRole('link',{name:'Quay lại tìm món',exact:true}).getAttribute('href')
   assert(href.startsWith('/goi-y'),'app return is '+href+'; expected previous /goi-y tab')
  })
  await check(['S2-01.7'],'native Browser Back preserves suggestion card',async()=>{await page.goBack();await title().waitFor();assert.equal(await title().textContent(),beforeDetail)})
  await check(['S2-01.8'],'switching tabs preserves suggestion state',async()=>{
   await page.getByRole('tab',{name:'Nguyên liệu',exact:true}).click();await page.getByRole('tab',{name:'Khám phá',exact:true}).click();assert.equal(await title().textContent(),beforeDetail)
  })
  await check(['S2-01.9'],'suggestion loading prevents duplicate actions',async()=>{
   const match=url=>url.pathname==='/api/suggestions'
   await page.route(match,async route=>{await new Promise(done=>setTimeout(done,1200));await route.continue().catch(()=>{})})
   const wait=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200)
   await page.getByRole('button',{name:'Xem gợi ý khác',exact:true}).click()
   await page.locator('#panel-goi-y .animate-pulse').waitFor()
   assert.equal(await page.getByRole('button',{name:'Xem gợi ý khác',exact:true}).count(),0)
   await wait;await page.unroute(match);await title().waitFor()
  },'LIVE_WITH_NETWORK_DELAY')
  await check(['S2-01.10'],'suggestion failure preserves history and retry recovers',async()=>{
   const before=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hnag:suggest-session:v1')).suggest.history.length)
   const match=url=>url.pathname==='/api/suggestions'
   await page.route(match,failHttp)
   await page.getByRole('button',{name:'Xem gợi ý khác',exact:true}).click();await page.getByRole('button',{name:'Thử lại',exact:true}).waitFor()
   assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hnag:suggest-session:v1')).suggest.history.length),before)
   await page.unroute(match);await page.getByRole('button',{name:'Thử lại',exact:true}).click();await title().waitFor()
  },'HTTP_FAULT_INJECTION')
  await check(['S2-01.4','S2-01.5'],'chip request keeps AND criteria and never silently relaxes them',async()=>{
   let pending=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200)
   await page.getByRole('button',{name:'Trời mưa',exact:true}).click();let batch=(await(await pending).json()).data
   // Exhaust actual matching dishes; tag seeding means the first response is no longer empty.
   const seen=new Set()
   while(batch.length){
    assert(!seen.has(batch[0].id));seen.add(batch[0].id);assert(seen.size<=100)
    await title().waitFor();pending=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200)
    await page.getByRole('button',{name:'Xem gợi ý khác',exact:true}).click();batch=(await(await pending).json()).data
   }
   await page.getByRole('heading',{name:/^(Chưa có món phù hợp|Đã xem hết gợi ý)$/}).waitFor()
   const wait=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200)
   await page.getByRole('button',{name:'Ăn nhẹ',exact:true}).click();const response=await wait
   const tags=new URL(response.url()).searchParams.get('the').split(',').sort()
   assert.deepEqual(tags,['AN_NHE','TROI_MUA'])
   assert.equal(await page.getByRole('button',{name:'Trời mưa',exact:true}).getAttribute('aria-pressed'),'true')
   assert.equal(await page.getByRole('button',{name:'Ăn nhẹ',exact:true}).getAttribute('aria-pressed'),'true')
  })
  if(!audit.taggedRows||!audit.dishTagRows)blocked(['S2-01.4'],'positive tag AND dataset','tag/mon_an_tag contain0 rows; UI AND/exhaustion observed but positive live filter cannot be accepted')
  if(!audit.knownRegionDishes)blocked(['S2-01.12'],'positive region dataset','all dishes have null region')
  await page.getByRole('tab',{name:'Nguyên liệu',exact:true}).click()
  const input=page.getByRole('combobox'),find=page.getByRole('button',{name:'Tìm món',exact:true})
  await check(['S2-02.1'],'zero ingredient selection blocks search',async()=>{assert(await find.isDisabled());await input.press('Enter');await page.getByText('Hãy chọn ít nhất 1 nguyên liệu',{exact:true}).waitFor()})
  await check(['S2-02.2'],'autocomplete accent and case variants',async()=>{for(const q of['ca chua','Cà Chua','cà chua']){await input.fill(q);await page.locator('#ingredient-option-46').waitFor()}})
  await check(['S2-02.3'],'ingredient synonym resolves canonical ID',async()=>{await input.fill('hanh xanh');await page.locator('#ingredient-option-28').waitFor()})
  await check(['S2-02.4','S2-02.6'],'unknown/free text does not become a chip',async()=>{await input.fill('qa04zzznomatch20261124');await page.getByText('Không tìm thấy nguyên liệu này',{exact:false}).waitFor();await input.press('Enter');assert(await find.isDisabled());await input.fill('')})
  const add=async(id,q)=>{await input.fill(q);await page.locator('#ingredient-option-'+id).click();await input.fill('')}
  await check(['S2-02.5'],'canonical chips deduplicate and can be removed',async()=>{
   await add(46,'ca chua');await add(46,'ca chua');assert.equal(await page.getByRole('button',{name:'Bỏ Cà chua',exact:true}).count(),1)
   await page.getByRole('button',{name:'Bỏ Cà chua',exact:true}).click();assert(await find.isDisabled())
  })
  if(!audit.pantryFlagged)blocked(['S2-02.7','S2-02.8'],'pantry-dependent live matching','0 canonical ingredients have pantry flag; UI default/toggle/request can pass but live availability difference cannot be checked')
  await check(['S2-02.7'],'pantry UI is enabled by default',async()=>assert(await page.getByRole('checkbox').isChecked()))
  for(const[id,q]of[[5,'dau an'],[6,'gia vi thong dung'],[8,'gung'],[11,'ruou trang'],[28,'hanh xanh'],[55,'kho qua'],[57,'ngo ri'],[56,'suon heo']])await add(id,q)
  let matches
  await check(['S2-02.9','S2-02.10','S2-02.11','S2-02.12','S2-02.15'],'four groups, API order, weighted ratio and counts',async()=>{
   const wait=page.waitForResponse(r=>r.url().includes('/api/dishes/match?')&&r.status()===200);await find.click();matches=(await(await wait).json()).data
   await page.locator('#panel-nguyen-lieu a[href="/dishes/33"]').waitFor()
   const types=[['READY','Nấu ngay'],['MISSING_1_2','Thiếu 1–2 thứ'],['NEED_SHOPPING','Cần đi chợ'],['INCOMPLETE','Chưa đủ dữ liệu để kết luận']]
   for(const[type,name]of types){
    const items=matches.filter(x=>type==='INCOMPLETE'?x.is_incomplete:!x.is_incomplete&&x.readiness===type)
    if(!items.length)continue
    const section=page.locator('section').filter({has:page.getByRole('heading',{name,exact:true})});await section.waitFor()
    assert.deepEqual(await section.locator('a').evaluateAll(nodes=>nodes.map(a=>Number(a.getAttribute('href').split('/').at(-1)))),items.slice(0,6).map(x=>x.id))
   }
   const card=page.locator('#panel-nguyen-lieu a[href="/dishes/33"]');assert((await card.textContent()).includes('100%'));assert((await card.textContent()).includes('8/8'))
   const weighted=matches.find(x=>!x.is_incomplete&&x.total_count>0&&Math.abs(x.match_ratio-x.have_count/x.total_count)>.02)
   assert(weighted)
   const weightedCard=page.locator('#panel-nguyen-lieu a[href="/dishes/'+weighted.id+'"]')
   assert.equal(await weightedCard.getByRole('progressbar').getAttribute('aria-valuenow'),String(Math.round(weighted.match_ratio*100)))
   assert((await weightedCard.textContent()).includes(weighted.have_count+'/'+weighted.total_count))
   entry.weightedExample={id:weighted.id,ratio:weighted.match_ratio,have:weighted.have_count,total:weighted.total_count}
  })
  const dish=await json('/dishes/33'),recipe=await json('/recipes/25')
  await page.locator('#panel-nguyen-lieu a[href="/dishes/33"]').click();await page.getByRole('heading',{level:1,name:dish.data.name,exact:true}).waitFor()
  await check(['S2-04.1'],'dish details show API cooking time',async()=>{assert.equal(dish.data.cook_time_minutes,60);assert(await page.getByText('60 phút',{exact:true}).count()>0,'API cook_time_minutes=60 but dish detail renders no cooking time')})
  await check(['S2-02.14','S2-04.10'],'app return link preserves ingredient-tab origin',async()=>{const href=await page.getByRole('link',{name:'Quay lại tìm món',exact:true}).getAttribute('href');assert(href.startsWith('/goi-y'),'app return is '+href+'; expected /goi-y?tab=nguyen-lieu')})
  await check(['S2-04.3'],'one recipe still opens recipe list after Tự nấu',async()=>{assert.equal(dish.data.recipes.length,1);await page.getByRole('link',{name:'Tự nấu',exact:true}).click();await page.waitForURL(url=>url.pathname==='/dishes/33/recipes');await page.getByRole('link',{name:'Xem công thức',exact:true}).waitFor()})
  await check(['S2-04.4','S2-04.5','S2-04.9'],'guest recipe has facts, quantities, to-taste and ordered steps',async()=>{
   await page.getByRole('link',{name:'Xem công thức',exact:true}).click();await page.getByRole('heading',{level:1,name:recipe.data.name,exact:true}).waitFor()
   assert(await page.getByText('60 phút',{exact:true}).isVisible());assert(await page.getByText('Tùy khẩu vị',{exact:true}).count()>0)
   assert.deepEqual(await page.getByRole('heading',{name:/^Bước /}).allTextContents(),recipe.data.steps.map(x=>'Bước '+x.order))
   assert((await page.locator('body').textContent()).includes('Khẩu phần'));assert((await page.locator('body').textContent()).includes('Chưa cập nhật'))
  })
  await page.screenshot({path:path.join(output,spec.name+'-recipe.png'),fullPage:true})
  await check(['S2-02.14','S2-04.10'],'native back from recipe restores original ingredient state',async()=>{await page.goBack();await page.goBack();await page.goBack();await page.waitForURL(url=>url.pathname==='/goi-y');await page.locator('#panel-nguyen-lieu a[href="/dishes/33"]').waitFor();assert((await page.locator('#panel-nguyen-lieu a[href="/dishes/33"]').textContent()).includes('8/8'));assert(await page.getByRole('button',{name:'Bỏ Sườn heo',exact:true}).isVisible())})
  await check(['S2-02.8','S2-02.16'],'matching loading/error/retry preserves chips and sends pantry=false',async()=>{
   const match=url=>url.pathname==='/api/dishes/match'
   await page.route(match,failHttp)
   try{
    await page.locator('#panel-nguyen-lieu input[type="checkbox"]').first().locator('..').click()
    await page.locator('#panel-nguyen-lieu .animate-pulse').waitFor();assert(await find.isDisabled())
    await page.getByRole('button',{name:'Thử lại',exact:true}).waitFor()
    assert(await page.getByRole('button',{name:'Bỏ Sườn heo',exact:true}).isVisible())
   }finally{await page.unroute(match)}
   const wait=page.waitForResponse(r=>r.url().includes('/api/dishes/match?')&&r.status()===200)
   await page.getByRole('button',{name:'Thử lại',exact:true}).click();const response=await wait
   assert.equal(new URL(response.url()).searchParams.get('pantry'),'false')
   await page.locator('#panel-nguyen-lieu a[href="/dishes/33"]').waitFor()
  },'HTTP_FAULT_INJECTION_WITH_DELAY')
  if(audit.unusedIngredient) await check(['S2-02.13'],'canonical unused ingredient gives empty API and UI',async()=>{
   await page.getByRole('button',{name:'Xóa tất cả',exact:true}).click()
   await add(audit.unusedIngredient.id,audit.unusedIngredient.name)
   await find.click();await page.getByText('Chưa có món nào khớp với các nguyên liệu này. Thử thêm nguyên liệu khác.',{exact:true}).waitFor()
  })
  await check(['S2-02.10'],'live INCOMPLETE at100% remains in group4',async()=>{
   const detail=await json('/dishes/17');let verified
   for(const summary of detail.data.recipes){
    const full=await json('/recipes/'+summary.id),ids=full.data.ingredients.map(x=>x.ingredient_id)
    if(!ids.length||ids.length>20)continue
    const response=await json('/dishes/match?ingredients='+ids.join(',')+'&pantry=false')
    if(response.data.some(x=>x.id===17&&x.is_incomplete&&x.match_ratio===1)){verified={full:full.data,ids,data:response.data};break}
   }
   assert(verified,'No public recipe provided an INCOMPLETE100% data case')
   await page.evaluate(verified=>{
    const state=JSON.parse(sessionStorage.getItem('hnag:suggest-session:v1'))
    state.match={ingredients:verified.full.ingredients.map(x=>({id:x.ingredient_id,name:x.name})),pantry:false,
     queryKey:verified.ids.slice().sort((a,b)=>a-b).join(',')+'|false',pinnedIds:[],shoppingDishIds:[],
     results:verified.data.map(x=>({id:x.id,name:x.name,imageUrl:x.image_url,matchRatio:x.match_ratio,haveCount:x.have_count,totalCount:x.total_count,missing:x.missing,readiness:x.readiness,isIncomplete:x.is_incomplete}))}
    sessionStorage.setItem('hnag:suggest-session:v1',JSON.stringify(state))
   },verified)
   await page.reload({waitUntil:'domcontentloaded'})
   const group=page.locator('section').filter({has:page.getByRole('heading',{name:'Chưa đủ dữ liệu để kết luận',exact:true})})
   await group.locator('a[href="/dishes/17"]').waitFor();assert((await group.locator('a[href="/dishes/17"]').textContent()).includes('100%'))
  },'LIVE_API_WITH_RESTORED_SESSION')
  await check(['S2-03.1','S2-03.7'],'guest name search supports accents and case',async()=>{
   await page.goto(base+'/search',{waitUntil:'domcontentloaded'})
   for(const q of['pho bo','PHỞ BÒ']){await page.getByRole('searchbox').fill(q);await page.getByRole('link',{name:/Phở bò.*Xem món/}).first().waitFor()}
  })
  await check(['S2-03.2'],'time filter is sent with search criteria',async()=>{
   const wait=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/dishes'&&new URL(r.url()).searchParams.get('max_cook_time')==='30'&&r.status()===200)
   await page.getByRole('combobox',{name:'Thời gian chế biến',exact:true}).selectOption('30');await wait
   assert.equal(await page.getByRole('searchbox').inputValue(),'PHỞ BÒ')
  })
  await check(['S2-03.3'],'empty search is a distinct non-error state',async()=>{await page.getByRole('searchbox').fill('qa04zzznomatch20261124');await page.getByRole('heading',{name:'Không tìm thấy món phù hợp',exact:true}).waitFor()})
  await check(['S2-03.4','S2-03.6'],'server pagination and back keep URL criteria/page',async()=>{
   await page.goto(base+'/search?search=a&max_cook_time=60&page=2',{waitUntil:'domcontentloaded'});await page.getByRole('link',{name:/Xem món và công thức/}).first().waitFor()
   const url=page.url();assert((await page.locator('body').textContent()).includes('Trang 2 /'))
   await page.getByRole('link',{name:/Xem món và công thức/}).first().click();await page.getByRole('link',{name:'Tự nấu',exact:true}).waitFor()
   await page.getByRole('link',{name:'Quay lại tìm món',exact:true}).click();await page.getByRole('link',{name:/Xem món và công thức/}).first().waitFor();assert.equal(page.url(),url)
   assert.equal(await page.getByRole('searchbox').inputValue(),'a');assert.equal(await page.getByRole('combobox',{name:'Thời gian chế biến',exact:true}).inputValue(),'60')
  })
  await check(['S2-03.8'],'search failure retries without dropping query',async()=>{
   const match=url=>url.pathname==='/api/dishes';await page.route(match,failHttp)
   await page.getByRole('searchbox').fill('pho');await page.getByText('Đang tìm món ăn…',{exact:true}).waitFor();await page.getByRole('button',{name:'Thử lại',exact:true}).last().waitFor();await page.unroute(match)
   await page.getByRole('button',{name:'Thử lại',exact:true}).last().click();await page.getByRole('link',{name:/Xem món và công thức/}).first().waitFor();assert.equal(await page.getByRole('searchbox').inputValue(),'pho')
  },'HTTP_FAULT_INJECTION')
  await check(['S2-04.7'],'unknown dish and recipe show not-found UI',async()=>{
   await page.goto(base+'/dishes/999999999',{waitUntil:'domcontentloaded'});await page.getByRole('alert').filter({hasText:'Món ăn không còn tồn tại'}).waitFor()
   await page.goto(base+'/recipes/999999999',{waitUntil:'domcontentloaded'});await page.getByRole('alert').filter({hasText:'Công thức không còn tồn tại'}).waitFor()
  })
  await check(['S2-04.11'],'recipe failure retries and keeps a return route',async()=>{
   const match=url=>url.pathname==='/api/recipes/25';await page.route(match,failHttp)
   await page.goto(base+'/recipes/25',{waitUntil:'domcontentloaded'});await page.getByText('Đang tải công thức…',{exact:true}).waitFor();await page.getByRole('button',{name:'Thử lại',exact:true}).waitFor();await page.unroute(match)
   await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByRole('heading',{name:recipe.data.name,level:1,exact:true}).waitFor()
  },'HTTP_FAULT_INJECTION')
  const fixture=url=>url.pathname==='/api/dishes/900001'||url.pathname==='/api/dishes/900001/recipes'
  await page.route(fixture,route=>route.fulfill({status:200,json:new URL(route.request().url()).pathname.endsWith('/recipes')?{data:[],meta:{page:1,limit:12,total:0}}:{data:{id:900001,name:'Món QA không công thức',description:'QA fixture',image_url:null,recipes:[]}}}))
  await check(['S2-04.2'],'dish without recipes is reported on dish-detail entry',async()=>{await page.goto(base+'/dishes/900001',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Món QA không công thức',level:1,exact:true}).waitFor();assert(await page.getByText(/chưa có công thức/i).count()>0,'dish detail does not tell the guest that recipes=[]')},'VALID_HTTP_FIXTURE')
  await check(['S2-04.2'],'empty recipe list itself is explained',async()=>{await page.getByRole('link',{name:'Tự nấu',exact:true}).click();await page.getByRole('heading',{name:'Món này chưa có công thức',exact:true}).waitFor()},'VALID_HTTP_FIXTURE')
  await page.unroute(fixture)
  await check(['S2-04.6'],'incomplete public recipe explains missing data',async()=>{
   const d=await json('/dishes/17'),summary=d.data.recipes.find(x=>x.incomplete);assert(summary)
   await page.goto(base+'/recipes/'+summary.id,{waitUntil:'domcontentloaded'});await page.getByRole('status').filter({hasText:'Công thức chưa đầy đủ thông tin'}).waitFor()
  })
  await check(['QA04-MOBILE'],'candidate layout has no horizontal overflow',async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)))
  await page.screenshot({path:path.join(output,spec.name+'-incomplete.png'),fullPage:true})
 }catch(e){entry.checks.push({ac:[],name:'runner prerequisites',status:'FAIL',reason:String(e.message).slice(0,220)})}
 finally{if(browser)await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),candidate:process.env.QA_SOURCE_LABEL||'main413a7b6 + FE10 587171e + FE11 e8de078 (detached e47c5f6)',mainRevertNotApplied:true,results},null,2)+String.fromCharCode(10))}
}
;(async()=>{for(const spec of specs.filter(x=>!process.env.QA_BROWSER_FILTER||x.name===process.env.QA_BROWSER_FILTER)){await run(spec);console.log(spec.name+': '+JSON.stringify(results.at(-1).checks.map(x=>({name:x.name,status:x.status,...(x.status==='FAIL'?{reason:x.reason}:{})}))))}if(results.some(x=>x.checks.some(c=>c.status==='FAIL')))process.exitCode=1})()
