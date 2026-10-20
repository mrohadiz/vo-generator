// Emits dist/variables.css and dist/tokens.json from the compiled token module.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mod = await import(pathToFileURL(resolve(root, 'dist/index.js')).href);

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/variables.css'), mod.createCssVariables());
writeFileSync(
  resolve(root, 'dist/tokens.json'),
  `${JSON.stringify(mod.tokens, null, 2)}\n`,
);
console.log('[tokens] wrote dist/variables.css and dist/tokens.json');
