import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', '@fieldnote-ui/tokens'],
  banner: { js: '"use client";' },
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.js' : '.cjs' }),
});
