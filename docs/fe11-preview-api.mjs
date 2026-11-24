// Run the actual INT02 backend behind a GET-only QA wrapper; never mutate remote data.
// QA_REPO_ROOT=<main checkout> QA_ENV_FILE=<local backend .env> node docs/fe11-preview-api.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const repo = process.env.QA_REPO_ROOT;
if (!repo || !process.env.QA_ENV_FILE) throw new Error('Set QA_REPO_ROOT and QA_ENV_FILE; never pass keys as arguments');
const require = createRequire(path.resolve(repo, 'backend/package.json'));
require('dotenv').config({ path: process.env.QA_ENV_FILE, quiet: true });
for (const key of ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}
const ref = '449d189'; // origin/linh/int02 after fetch 24/11
const scratch = mkdtempSync(path.join(os.tmpdir(), 'fe11-int02-readonly-'));
function git(args) { return execFileSync('git',args,{cwd:repo,encoding:'utf8'}); }
for (const file of git(['ls-tree','-r','--name-only',ref,'backend/src','backend/package.json']).trim().split(String.fromCharCode(10))) {
  const target = path.join(scratch,file);
  mkdirSync(path.dirname(target),{recursive:true});
  writeFileSync(target,git(['show',`${ref}:${file}`]));
}
symlinkSync(path.join(repo,'backend/node_modules'),path.join(scratch,'backend/node_modules'),'junction');
const { default: backend } = await import(pathToFileURL(path.join(scratch,'backend/src/app.js')));
const express = require('express');
const app = express();
app.use((req,res,next) => req.method === 'GET' ? next() : res.sendStatus(405));
app.get('/__qa_source',(_req,res) => res.json({ref,mode:'actual INT02 backend with GET-only QA wrapper'}));
app.use(backend);
const server = app.listen(Number(process.env.QA_PREVIEW_PORT || 3102),'127.0.0.1',()=>console.log('INT02 read-only QA backend: 127.0.0.1:'+server.address().port));
