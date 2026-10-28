// Local preview: serves dist/ on :3000 and rebuilds whenever a source file changes.
// Watches the whole folder (not single files, which editors replace on save), skipping the build output.
import { watch } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

const IGNORE = /^(dist|node_modules|\.git)(\/|$)|\.DS_Store$/;
const build = () => spawnSync('node', ['build.mjs'], { stdio: 'inherit' });

build();
spawn('npx', ['serve', 'dist', '-l', '3000'], { stdio: 'inherit' });

let timer;
watch('.', { recursive: true }, (_, file) => {
  if (!file || IGNORE.test(file)) return;
  clearTimeout(timer);
  timer = setTimeout(() => { console.log(`\n${file} changed, rebuilding…`); build(); }, 100);
});
