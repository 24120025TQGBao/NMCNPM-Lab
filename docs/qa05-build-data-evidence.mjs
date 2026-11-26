import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
const root=import.meta.dirname
const read=name=>JSON.parse(readFileSync(resolve(root,name),'utf8'))
const report=read('qa05-data-evidence-2026-11-27/results.json')
const firefox=read('qa05-data-firefox-retest-2026-11-27/results.json').results[0]
report.results=report.results.map(run=>run.name==='firefox-desktop'?firefox:run)
report.notes=['Expected from read-only independent DB metadata; NAU_CHO_4 mapped to intended seeded tag for diagnosis, and canonical contract slug checked separately in handoff.', 'Firefox AND/removal step timed out twice; retained FAIL, not classified as a second confirmed product bug. Other Firefox checks completed.']
writeFileSync(resolve(root,'qa05-data-evidence-2026-11-27/final-results.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report.results.map(run=>({name:run.name,pass:run.checks.filter(c=>c.status==='PASS').length,fail:run.checks.filter(c=>c.status==='FAIL').length}))))
