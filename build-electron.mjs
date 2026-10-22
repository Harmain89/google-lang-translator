import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
  outdir: 'dist-electron',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['electron'],
  sourcemap: watch ? 'inline' : false,
  minify: false,
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('[electron] watching for changes...');
} else {
  await esbuild.build(config);
  console.log('[electron] built dist-electron/main.js + preload.js');
}
