import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname)
const read = (name) => JSON.parse(readFileSync(resolve(root, name), 'utf8'))
const initial = read('qa05-fe10-fix-evidence/results.json')
const firefox = read('qa05-fe10-firefox-retest/results.json').results[0]
if (firefox.name !== 'firefox-desktop' || firefox.checks.some((check) => check.status === 'FAIL')) throw new Error('Firefox retest has not passed')
initial.results = initial.results.map((run) => run.name === 'firefox-desktop' ? firefox : run)
if (initial.results.some((run) => run.source !== '30b7fc2b2ea42628bb1192aab82ecc081523d540')) throw new Error('Unexpected source SHA')
initial.candidate = 'INT03 9f8a6cb + FE10 QA fix 30b7fc2'
initial.retestNote = 'Firefox browser startup crashed in sandbox; isolated rerun outside sandbox passed. Live DB data read-only; HTTP fixtures/faults labelled in checks.'
writeFileSync(resolve(root, 'qa05-fe10-fix-evidence/final-results.json'), JSON.stringify(initial, null, 2) + '\n')
console.log(initial.results.map((run) => ({ browser: run.name, pass: run.checks.filter((c) => c.status === 'PASS').length, blocked: run.checks.filter((c) => c.status === 'BLOCKED').length })))
