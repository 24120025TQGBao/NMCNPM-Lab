// Usage: node docs/qa05-route-regression.mjs <baseline-worktree> <candidate-worktree>
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const [baseline,candidate]=process.argv.slice(2);
if (!baseline || !candidate) throw new Error('Provide baseline and candidate worktree paths');
process.env.NODE_ENV='test';
const request=createRequire(path.resolve(baseline,'backend/package.json'))('supertest');
for (const [label,dir] of [['baseline',baseline],['candidate',candidate]]) {
 const {default:app}=await import(pathToFileURL(path.resolve(dir,'backend/src/app.js')));
 const res=await request(app).get('/api/me');
 console.log(`${label} GET /api/me: ${res.status} ${res.body?.error?.code}`);
 assert.equal(res.status,401,`${label}: unauthenticated /api/me must remain mounted`);
 assert.equal(res.body.error.code,'UNAUTHORIZED');
}
