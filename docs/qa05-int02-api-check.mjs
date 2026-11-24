import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const base = process.env.QA_API_BASE || 'http://127.0.0.1:3102';
const refs = { int02:'449d189', fe09:'786605d' };

  const results = [];
  const oracle = [];
  const savedError = console.error;
  // Controllers may log raw DB diagnostics; retain only assertions/status in the shareable artifact.
  console.error = () => {};
  async function check(name, route, status, verify = () => {}) {
    let observedHttp;
    try {
      const response = await fetch(base + '/api' + route, { signal: AbortSignal.timeout(30000) }).then(async response => ({ status: response.status, body: await response.json() }));
      observedHttp = response.status;
      assert.equal(response.status,status);
      if (status >= 400) assert.equal(response.body.error?.code,status === 401 ? 'UNAUTHORIZED' : status === 400 ? 'VALIDATION_ERROR' : 'NOT_FOUND');
      await verify(response.body);
      results.push({ name, status: 'PASS', http: response.status });
      return response.body;
    } catch {
      results.push({ name, status: 'FAIL', expectedHttp: status, ...(observedHttp ? { observedHttp } : { reason: 'Request did not complete; check network/environment before filing a product bug' }) });
      return null;
    }
  }
  const list = await check('suggestions guest','/suggestions?limit=1',200,b => { assert.equal(b.data.length,1); assert(b.data[0].image_url); assert(b.data[0].short_description); });
  if (list?.data?.[0]) {
    const first = list.data[0].id;
    await check('suggestions random excludes viewed',`/suggestions?random=true&exclude=${first}`,200,b => assert(b.data.every(x => x.id !== first)));
  }
  await check('suggestions tag empty without relaxation','/suggestions?the=TROI_MUA',200,b => assert(b.data.every(x => x.tags.includes('TROI_MUA'))));
  for (const route of ['/suggestions?limit=0','/suggestions?the=UNKNOWN','/ingredients?search=',
    '/dishes/match','/dishes/match?ingredients=abc','/dishes/match?ingredients=46&pantry=bad',
    '/dishes/match?ingredients=999999999','/dishes?page=0','/dishes?flavor=UNKNOWN','/dishes/abc',
    '/recipes/-1','/ingredients/suggest-next','/ingredients/suggest-next?ingredients=999999999',
    '/ingredients/suggest-next?ingredients=46&pantry=bad']) await check('validation '+route,route,400);
  for (const search of ['ca chua','Cà Chua','cà chua']) await check('ingredient '+search,'/ingredients?search='+encodeURIComponent(search),200,b => assert(b.data.some(x=>x.id===46)));
  await check('ingredient synonym','/ingredients?search=hanh%20xanh',200,b=>assert(b.data.some(x=>x.id===28)));
  await check('ingredient prefix excludes infix','/ingredients?search=chua',200,b=>assert(b.data.every(x=>x.id!==46)));
  await check('ingredient empty','/ingredients?search=qa04zzznomatch20261123',200,b=>assert.deepEqual(b.data,[]));
  await check('dish empty','/dishes?search=qa04zzznomatch20261123',200,b=>{assert.deepEqual(b.data,[]);assert.equal(b.meta.total,0);});
  for (const search of ['pho','PHỞ']) await check('dish search '+search,'/dishes?search='+encodeURIComponent(search),200,b=>assert(b.data.length>0));
  await check('dish not found','/dishes/999999999',404);
  await check('recipe not found','/recipes/999999999',404);
  const dish = await check('dish33 detail','/dishes/33',200,b=>{assert.equal(b.data.id,33);assert(b.data.recipes.some(x=>x.id===25));});
  const recipe = await check('recipe25 detail','/recipes/25',200,b=>{assert.equal(b.data.id,25);assert.equal(b.data.servings,null);assert(b.data.ingredients.length>0);assert.deepEqual(b.data.steps.map(x=>x.order),[1,2,3,4]);});
  await check('contract recipe list route','/dishes/33/recipes',200,b=>assert(b.data.some(x=>x.id===25)));
  await check('BUG-S2-001 retest: me route remains mounted','/me',401);
  await check('pin membership from catalog','/dishes?ingredients=55&page=1&limit=50',200,b => {
    assert(b.data.some(x => x.id===33)); assert(Number.isInteger(b.meta.total));
  });
  const all = [5,6,8,11,28,55,57,56];
  if (recipe?.data && dish?.data?.recipes?.length === 1) {
    const ingredients = recipe.data.ingredients;
    assert.deepEqual(ingredients.map(x=>x.ingredient_id).sort((a,b)=>a-b),[...all].sort((a,b)=>a-b));
    assert(ingredients.every(x=>['PRIMARY','SECONDARY'].includes(x.role)));
    const weight = x => x.role === 'PRIMARY' ? 2 : 1;
    const total = ingredients.reduce((n,x)=>n+weight(x),0);
    for (const count of [1,2,4,7,8]) {
      const selected = all.slice(0,count);
      const matched = ingredients.filter(x=>selected.includes(x.ingredient_id)).reduce((n,x)=>n+weight(x),0);
      const missingIds = ingredients.filter(x=>!selected.includes(x.ingredient_id)).map(x=>x.ingredient_id).sort((a,b)=>a-b);
      const expected = { selected, pantry: false, matchedWeight: matched, totalWeight: total,
        ratio: Math.round(10000*matched/total)/10000, have: count, total: all.length, missingIds,
        readiness: missingIds.length===0?'READY':missingIds.length<=2?'MISSING_1_2':'NEED_SHOPPING' };
      oracle.push(expected);
      await check(`independent oracle ${count}/8`,`/dishes/match?ingredients=${selected.join(',')}&pantry=false`,200,b=>{
        const x=b.data.find(x=>x.id===33);assert(x);assert.equal(x.is_incomplete,false);
        assert.equal(x.match_ratio,expected.ratio);assert.equal(x.have_count,count);assert.equal(x.total_count,8);
        assert.deepEqual(x.missing.map(x=>x.id).sort((a,b)=>a-b),missingIds);assert.equal(x.readiness,expected.readiness);
      });
    }
  } else results.push({ name: 'five independent oracle cases', status: 'BLOCKED', reason: 'recipe25 unavailable or dish33 has multiple recipes' });
  await check('BE12 known unlock dish33','/ingredients/suggest-next?ingredients=5,6,8,11,28,55,57&pantry=false',200,b=>{
    const x=b.data.find(x=>x.ingredient.id===56);assert(x);assert(x.dish_ids.includes(33));assert.equal(x.unlock_count,x.dish_ids.length);
    assert(b.data.length<=10);
  });
  await check('BE12 full set cannot unlock dish33','/ingredients/suggest-next?ingredients='+all.join(',')+'&pantry=false',200,b=>assert(b.data.every(x=>!x.dish_ids.includes(33))));
  console.error = savedError;
  const report = { checkedAt: new Date().toISOString(), environment: 'actual INT02 449d189 HTTP routes + live Supabase, GET-only QA wrapper',
    refs, verifiedIntegratedBranchWiring: true, certifiedMainWiring: false, results, oracle,
    summary: Object.fromEntries(['PASS','FAIL','BLOCKED'].map(s=>[s,results.filter(x=>x.status===s).length])) };
  const output = path.resolve(process.env.QA_RESULT_FILE || 'qa05-int02-retest-result.json');
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report.summary));
  for (const x of results.filter(x=>x.status!=='PASS')) console.log(x.name+': '+x.status);
  if (report.summary.FAIL || report.summary.BLOCKED) process.exitCode=1;
