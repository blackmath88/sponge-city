// Builds one Vite app with a relative base so it works under any subpath.
// Runs inside the app folder and uses that app's own Vite version and vite.config.
//   node scripts/lib/vite-build.mjs <outDir> [--no-treeshake]
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [outDir, ...flags] = process.argv.slice(2);
const { build } = await import(pathToFileURL(join(process.cwd(), 'node_modules/vite/dist/node/index.js')).href);
const options = { base: './', outDir, emptyOutDir: true };
// Rollup 4.64 (pinned by the Street Lab lockfile) spends minutes in call-argument tree-shaking on this app.
// Skipping tree-shaking builds in about a second and adds roughly 0.1 % to the bundle.
if (flags.includes('--no-treeshake')) options.rollupOptions = { treeshake: false };
await build({ root: process.cwd(), base: './', logLevel: 'warn', build: options });
