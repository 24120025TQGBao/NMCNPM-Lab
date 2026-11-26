const {chromium,firefox}=require(process.env.QA_PLAYWRIGHT)
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const oracle=JSON.parse(fs.readFileSync(process.env.QA_ORACLE_FILE,'utf8'))
const out=process.env.QA_BROWSER_OUTPUT,base='http://127.0.0.1:5175',results=[]
fs.mkdirSync(out,{recursive:true})
const codes=['TROI_MUA','LUOI_NAU','CUOI_THANG','NAU_CHO_4','AN_NHE']
const labels=['Trời mưa','Lười nấu','Cuối tháng','Nấu cho 4 người','Ăn nhẹ']
const tagIds=codes.map((code,i)=>oracle.tags.find(t=>t.slug===code.toLowerCase().replaceAll('_','-'))?.ma_tag??(i===3?oracle.tags.find(t=>t.slug==='nau-cho-4-nguoi')?.ma_tag:undefined))
const eligible=oracle.dishes.filter(d=>d.hinh_anh?.trim()&&d.mo_ta_ngan?.trim()).sort((a,b)=>a.ma_mon-b.ma_mon)
const expected=(indices,region)=>eligible.filter(d=>(!region||d.vung_mien===region)&&indices.every(i=>oracle.links.some(l=>l.ma_mon===d.ma_mon&&l.ma_tag===tagIds[i]))).map(d=>d.ma_mon)
const specs=[['chromium-desktop',chromium,'chromium-1255/chrome-win64/chrome.exe',1440,1000],['firefox-desktop',firefox,'firefox-1572/firefox/firefox.exe',1440,1000],['chromium-mobile',chromium,'chromium-1255/chrome-win64/chrome.exe',390,844]]
;(async()=>{for(const[name,engine,binary,width,height]of specs.filter(s=>!process.env.QA_BROWSER_FILTER||s[0]===process.env.QA_BROWSER_FILTER)){
 const entry={name,checks:[]};results.push(entry)
 const browser=await engine.launch({headless:true,executablePath:path.join(process.env.QA_BROWSER_ROOT,binary)})
 try{
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();page.setDefaultTimeout(60000)
 entry.source=(await(await page.request.get('http://127.0.0.1:3000/__qa_source')).json()).source
 const json=async route=>{const r=await page.request.get(base+'/api'+route);assert.equal(r.status(),200);return r.json()}
 const check=async(ac,title,fn)=>{try{await fn();entry.checks.push({ac,name:title,status:'PASS',mode:'LIVE_WITH_INDEPENDENT_DB_ORACLE'})}catch(e){entry.checks.push({ac,name:title,status:'FAIL',mode:'LIVE_WITH_INDEPENDENT_DB_ORACLE',reason:e.message});await page.screenshot({path:path.join(out,name+'-'+entry.checks.length+'.png'),fullPage:true})}}
 for(let i=0;i<5;i++)await check(['S2-01.4'],'canonical chip '+codes[i]+' matches DB-tagged dishes',async()=>{const want=expected([i]);assert(want.length>0);const response=await json('/suggestions?the='+codes[i]+'&limit=10');assert.deepEqual(response.data.map(x=>x.id),want.slice(0,10))})
 await check(['S2-01.4'],'positive AND and removing one chip use exact intersection',async()=>{
  let pair;for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)if(expected([i,j]).length&&i!==3&&j!==3)pair=[i,j]
  assert(pair);entry.tagPair=pair.map(i=>codes[i]);const want=expected(pair)
  assert.deepEqual((await json('/suggestions?the='+pair.map(i=>codes[i]).join(',')+'&limit=10')).data.map(x=>x.id),want.slice(0,10))
  await page.goto(base+'/goi-y');await page.locator('#panel-goi-y article h2').waitFor()
  for(const i of pair){const wait=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200);await page.getByRole('button',{name:labels[i],exact:true}).click();await wait;await page.locator('#panel-goi-y article h2').waitFor()}
  const link=page.locator('#panel-goi-y a').filter({hasText:'Nấu món này'});assert(want.includes(Number((await link.getAttribute('href')).split('/').pop())))
  await page.locator('#panel-goi-y button[aria-pressed="true"]:not([disabled])').first().waitFor()
  const wait=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200);await page.getByRole('button',{name:labels[pair[1]],exact:true}).click();const r=await wait;assert.equal(new URL(r.url()).searchParams.get('the'),codes[pair[0]])
 })
 await check(['S2-01.12'],'all regions and region/tag AND obey independent DB oracle',async()=>{
  for(const region of ['BAC','TRUNG','NAM']){const want=expected([],region);assert(want.length);assert.deepEqual((await json('/suggestions?vung_mien='+region+'&limit=10')).data.map(x=>x.id),want.slice(0,10))}
  const combo=[0,1,2,4].flatMap(i=>['BAC','TRUNG','NAM'].map(region=>({i,region,ids:expected([i],region)}))).find(x=>x.ids.length);assert(combo)
  assert.deepEqual((await json('/suggestions?the='+codes[combo.i]+'&vung_mien='+combo.region+'&limit=10')).data.map(x=>x.id),combo.ids.slice(0,10))
  await page.evaluate(()=>sessionStorage.clear());await page.goto(base+'/goi-y');await page.locator('#panel-goi-y article h2').waitFor()
  let wait=page.waitForResponse(r=>r.url().includes('vung_mien=')&&r.status()===200);await page.getByRole('button',{name:{BAC:'Miền Bắc',TRUNG:'Miền Trung',NAM:'Miền Nam'}[combo.region],exact:true}).click();await wait;await page.locator('#panel-goi-y article h2').waitFor()
  wait=page.waitForResponse(r=>r.url().includes('/api/suggestions?')&&r.status()===200);await page.getByRole('button',{name:labels[combo.i],exact:true}).click();const response=await wait;assert.deepEqual((await response.json()).data.map(x=>x.id),combo.ids.slice(0,1));await page.locator('#panel-goi-y article h2').waitFor()
 })
 await check(['S2-02.7','S2-02.8'],'pantry true/false changes only known basic ingredients and UI recomputes',async()=>{
  const recipe=(await json('/recipes/25')).data,pantry=new Set(oracle.pantry.map(x=>x.ma_nl)),selected=recipe.ingredients.filter(x=>!pantry.has(x.ingredient_id)),ids=selected.map(x=>x.ingredient_id)
  const missing=recipe.ingredients.filter(x=>pantry.has(x.ingredient_id));assert(missing.length>0)
  const off=(await json('/dishes/match?ingredients='+ids.join(',')+'&pantry=false')).data.find(x=>x.id===33),on=(await json('/dishes/match?ingredients='+ids.join(',')+'&pantry=true')).data.find(x=>x.id===33)
  assert.equal(on.match_ratio,1);assert.equal(on.missing.length,0);assert.equal(on.have_count,recipe.ingredients.length)
  assert.deepEqual(off.missing.map(x=>x.id).sort((a,b)=>a-b),missing.map(x=>x.ingredient_id).sort((a,b)=>a-b));assert.equal(off.have_count,ids.length)
  const weight=x=>x.role==='PRIMARY'?2:1;assert(Math.abs(off.match_ratio-selected.reduce((s,x)=>s+weight(x),0)/recipe.ingredients.reduce((s,x)=>s+weight(x),0))<.0001)
  entry.pantryOracle={selected:ids,missingWhenOff:missing.map(x=>x.ingredient_id),offRatio:off.match_ratio,onRatio:on.match_ratio}
  await page.goto(base+'/goi-y?tab=nguyen-lieu');const input=page.getByRole('combobox')
  for(const x of selected){await input.fill(x.name);await page.locator('#ingredient-option-'+x.ingredient_id).click()}
  const checkbox=page.locator('#panel-nguyen-lieu input[type="checkbox"]').first();assert(await checkbox.isChecked())
  let wait=page.waitForResponse(r=>r.url().includes('/api/dishes/match?')&&r.status()===200);await page.getByRole('button',{name:'Tìm món',exact:true}).click();await wait
  const card=page.locator('#panel-nguyen-lieu a[href="/dishes/33"]');await card.waitFor();assert((await card.textContent()).includes('100%'))
  wait=page.waitForResponse(r=>r.url().includes('/api/dishes/match?')&&r.status()===200);await checkbox.locator('..').click();const r=await wait;assert.equal(new URL(r.url()).searchParams.get('pantry'),'false');await page.getByText('Đang tìm món…',{exact:true}).waitFor({state:'hidden'}).catch(()=>{});await card.waitFor();await page.waitForTimeout(300);assert((await card.textContent()).includes(Math.round(off.match_ratio*100)+'%'))
 })
 }finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),source:'PR36 4549d4e',results},null,2)+'\n')}
 console.log(name+': '+entry.checks.map(x=>x.status+' '+x.name+(x.reason?' '+x.reason:'')).join('\n'))
}if(results.some(r=>r.checks.some(c=>c.status==='FAIL')))process.exitCode=1})()
