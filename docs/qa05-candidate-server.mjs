// Read-only local QA of a detached candidate; never merge/revert/deploy main.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const { QA_REPO_ROOT: repo, QA_CANDIDATE_DIR: candidate, QA_ENV_FILE: envFile } = process.env;
if (!repo || !candidate || !envFile) throw new Error('Set QA_REPO_ROOT, QA_CANDIDATE_DIR and QA_ENV_FILE; do not pass keys as arguments');
const require = createRequire(path.resolve(repo,'backend/package.json'));
require('dotenv').config({path:envFile,quiet:true});
const {createClient}=require('@supabase/supabase-js');
const source=execFileSync('git',['-C',candidate,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if (process.argv.includes('--audit-dataset')) {
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const [dishes,ingredients,rows,tags,dishTags]=await Promise.all([
  db.from('mon_an').select('ma_mon,vung_mien').eq('trang_thai','ACTIVE'),
  db.from('nguyen_lieu').select('ma_nl,ten_nl,la_gia_vi_co_ban').order('ma_nl'),
  db.from('ct_nguyen_lieu').select('ma_nl').range(0,999),
  db.from('tag').select('ma_tag',{head:true,count:'exact'}),
  db.from('mon_an_tag').select('ma_mon',{head:true,count:'exact'}),
 ]);
 const errors=[dishes,ingredients,rows,tags,dishTags].filter(x=>x.error).map(x=>x.error.code||'NETWORK_OR_DB');
 if(rows.data?.length===1000) errors.push('INGREDIENT_USAGE_REQUIRES_MORE_PAGES');
 const used=new Set((rows.data??[]).map(x=>x.ma_nl));
 const unused=(ingredients.data??[]).find(x=>!used.has(x.ma_nl));
 const match=ingredients.data?.length ? await db.rpc('match_dishes',{p_ingredient_ids:ingredients.data.map(x=>x.ma_nl),p_include_pantry:false,p_limit:500,p_offset:0}) : null;
 if(match?.error)errors.push(match.error.code||'MATCHING_ERROR');
 const report={checkedAt:new Date().toISOString(),source,readOnly:true,
  activeDishes:dishes.data?.length??null,canonicalIngredients:ingredients.data?.length??null,
  pantryFlagged:(ingredients.data??[]).filter(x=>x.la_gia_vi_co_ban).length,
  taggedRows:tags.count,dishTagRows:dishTags.count,knownRegionDishes:(dishes.data??[]).filter(x=>x.vung_mien!==null).length,
  completeMatchingDishes:match?.data?.filter(x=>!x.is_incomplete).length??null,
  unusedIngredient:unused?{id:unused.ma_nl,name:unused.ten_nl}:null,errors,
 };
 writeFileSync(process.env.QA_AUDIT_FILE||'qa05-dataset-audit.json',JSON.stringify(report,null,2)+String.fromCharCode(10));
 console.log(JSON.stringify(report));
 if(errors.length)process.exitCode=1;
} else {
 const {default:backend}=await import(pathToFileURL(path.resolve(candidate,'backend/src/app.js')));
 const app=require('express')();
 app.use((req,res,next)=>req.method==='GET'?next():res.sendStatus(405));
 app.get('/__qa_source',(_req,res)=>res.json({source,readOnly:true}));
 app.use(backend);
 const server=app.listen(Number(process.env.QA_PREVIEW_PORT||3102),'127.0.0.1',()=>console.log('QA candidate GET-only backend on127.0.0.1:'+server.address().port));
}
