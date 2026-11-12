import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'server/src/index.ts' },
  outDir: 'server/dist',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  splitting: false,
  // Native/optional modules are resolved at runtime from node_modules.
  external: ['pg-mem', 'pdf-parse', 'mammoth'],
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
});
