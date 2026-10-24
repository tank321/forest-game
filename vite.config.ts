import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Writes the service worker (`pwa/sw.js`) into the build with every built file to cache for offline play, and a
 * cache name hashed from their contents so each new build replaces the last one's cache.
 */
function serviceWorker(): Plugin {
  let root = '';
  let outDir = '';
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved(c) {
      root = c.root;
      outDir = resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
      const built = walk(outDir).filter((f) => !f.endsWith('sw.js')).sort();
      const hash = createHash('sha256');
      for (const f of built) hash.update(f).update(readFileSync(f));
      // The page is cached as './', the URL the app starts at.
      const files = built.map((f) => relative(outDir, f).split('\\').join('/')).map((f) => (f === 'index.html' ? './' : f));
      const sw = readFileSync(resolve(root, 'pwa/sw.js'), 'utf8')
        .replace('__CACHE__', JSON.stringify(`forest-${hash.digest('hex').slice(0, 12)}`))
        .replace('__FILES__', JSON.stringify(files));
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

// Relative paths, so the build runs from any folder it is served from (GitHub Pages serves it under /forest-game/).
export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
});
