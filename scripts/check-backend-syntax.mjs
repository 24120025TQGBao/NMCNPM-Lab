import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await files(full));
    else if (/\.(?:js|mjs|cjs)$/.test(entry.name)) result.push(full);
  }
  return result;
}
const targets = [path.join(root, 'backend/index.js'), path.join(root, 'backend/eslint.config.js'),
  ...await files(path.join(root, 'backend/src')), ...await files(path.join(root, 'backend/tests'))];
for (const target of targets.sort()) {
  const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    console.error(`Syntax check failed: ${path.relative(root, target)}`);
    console.error(result.error?.message || result.stderr);
    process.exit(1);
  }
}
console.log(`Backend syntax: ${targets.length} files passed`);
