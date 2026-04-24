import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    sdk: 'src/sdk.ts',
  },
  format: ['esm'],
  dts: {
    entry: { sdk: 'src/sdk.ts' },
  },
  clean: true,
  shims: true,
  target: 'node18',
  splitting: false,
  banner: ({ format }) => {
    // Only the CLI file gets a shebang; tsup post-processes in writeEntry.
    return {};
  },
  outExtension: () => ({ js: '.js' }),
});
