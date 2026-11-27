import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
const root=import.meta.dirname
const read=name=>JSON.parse(readFileSync(resolve(root,name),'utf8'))
const report=read('qa05-full-after-tagfix-2026-11-27/results.json')
const retest=read('qa05-exhaustion-after-tagfix-2026-11-27/results.json')
for(const run of report.results){
 const retry=retest.results.find(x=>x.name===run.name)
 if(!retry||retry.checks.some(c=>c.status!=='PASS'))throw Error('Exhaustion retest must pass for '+run.name)
 run.checks=run.checks.map(c=>retry.checks.find(x=>x.name===c.name)||c)
 if(run.checks.some(c=>c.status!=='PASS'))throw Error('Unresolved result '+run.name)
}
report.notes=['Full-flow same PR36 SHA after live tag correction. Exhaustion step superseded by targeted retest: seeded tag has actual matching dishes; after viewing them all UI says Đã xem hết gợi ý. Raw results retained.']
writeFileSync(resolve(root,'qa05-full-after-tagfix-2026-11-27/final-results.json'),JSON.stringify(report,null,2)+'\n')
console.log(report.results.map(r=>({name:r.name,pass:r.checks.length})))
