// Copies the component stylesheet into dist/ so it ships next to the JS.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(resolve(root, 'dist'), { recursive: true });
copyFileSync(resolve(root, 'src/styles.css'), resolve(root, 'dist/styles.css'));
console.log('[ui] copied dist/styles.css');
