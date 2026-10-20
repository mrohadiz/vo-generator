// Builds dist/styles.css = generated design tokens + global base styles.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'package.json'));
const tokensCss = readFileSync(require.resolve('@fieldnote-ui/tokens/css'), 'utf8');
const base = readFileSync(resolve(root, 'src/base.css'), 'utf8');

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(
  resolve(root, 'dist/styles.css'),
  `/* @fieldnote-ui/theme — tokens + base styles */\n${tokensCss}\n${base}`,
);
console.log('[theme] wrote dist/styles.css');
