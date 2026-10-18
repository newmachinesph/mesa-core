// Vendors mesa-core/src into each consuming app as src/core.
// One source of truth, copied in, never edited downstream.
//
// Assumes the three repos are cloned as siblings:
//   <parent>/mesa-core  <parent>/mesa-admin  <parent>/mesa-mobile
//
// Usage: node scripts/sync-core.mjs [mesa-admin|mesa-mobile|all]
import { cp, rm, mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const coreRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const parent = dirname(coreRoot);

const arg = process.argv[2];
const targets = arg && arg !== 'all' ? [arg] : ['mesa-admin', 'mesa-mobile'];

const BANNER = `// GENERATED — do not edit. Source: mesa-core/src. Run \`npm run sync:core\` to refresh.\n`;

for (const app of targets) {
  const appRoot = join(parent, app);
  try {
    await access(appRoot);
  } catch {
    console.warn(`skipped ${app} — not found at ${appRoot}`);
    continue;
  }
  const dest = join(appRoot, 'src', 'core');
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp(join(coreRoot, 'src'), dest, { recursive: true });
  await writeFile(join(dest, 'VENDORED.md'), BANNER);
  console.log(`synced core -> ${app}/src/core`);
}
