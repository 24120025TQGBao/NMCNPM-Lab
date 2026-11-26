import {createRequire} from 'node:module'
import {writeFileSync} from 'node:fs'
const require=createRequire(process.env.QA_REPO_ROOT+'/backend/package.json')
require('dotenv').config({path:process.env.QA_ENV_FILE,quiet:true})
const {createClient}=require('@supabase/supabase-js')
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const tables={dishes:['mon_an','ma_mon,vung_mien,hinh_anh,mo_ta_ngan'],tags:['tag','ma_tag,slug'],links:['mon_an_tag','ma_mon,ma_tag'],pantry:['nguyen_lieu','ma_nl,ten_nl,la_gia_vi_co_ban']}
const out={checkedAt:new Date().toISOString(),readOnly:true}
for(const [key,[table,columns]] of Object.entries(tables)){
 let q=db.from(table).select(columns)
 if(key==='dishes')q=q.eq('trang_thai','ACTIVE')
 if(key==='pantry')q=q.eq('la_gia_vi_co_ban',true)
 const {data,error}=await q
 if(error)throw Error(table+': '+error.code)
 out[key]=data
}
writeFileSync(process.env.QA_ORACLE_FILE,JSON.stringify(out,null,2)+'\n')
console.log('Public dataset oracle written; no DB writes')
