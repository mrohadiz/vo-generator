import { defineConfig } from 'tsup';

const common = {
  format: ['esm', 'cjs'] as ('esm' | 'cjs')[],
  dts: true,
  sourcemap: true,
  external: ['react', 'react-dom', '@fieldnote-ui/tokens'],
  outExtension: ({ format }: { format: string }) => ({ js: format === 'esm' ? '.js' : '.cjs' }),
};

export default defineConfig([
  {
    ...common,
    entry: { index: 'src/index.ts' },
    clean: true,
    // Client entry: hooks and the provider. Marked for the RSC boundary.
    banner: { js: '"use client";' },
  },
  {
    ...common,
    entry: { server: 'src/server.ts' },
    clean: false,
    // Server-safe entry: no directive, so it can be called from server components.
  },
]);
