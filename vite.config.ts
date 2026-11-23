import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const publicDir = fileURLToPath(new URL('./public', import.meta.url));
const swTemplatePath = fileURLToPath(new URL('./pwa/sw-template.js', import.meta.url));

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

function serviceWorker(): Plugin {
  return {
    name: 'ai-patrol-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const hash = createHash('sha256');
      const builtUrls = Object.values(bundle)
        .filter((file) => !file.fileName.endsWith('.map'))
        .map((file) => {
          hash.update(file.fileName);
          hash.update(file.type === 'chunk' ? file.code : file.source);
          return `/${file.fileName}`;
        });

      const publicUrls = listFiles(publicDir).map((full) => {
        hash.update(readFileSync(full));
        return `/${relative(publicDir, full).split(sep).join('/')}`;
      });

      const template = readFileSync(swTemplatePath, 'utf8');
      hash.update(template);

      const urls = [...new Set(['/', ...builtUrls, ...publicUrls])];
      const source = template
        .replace('__CACHE_VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__PRECACHE_URLS__', JSON.stringify(urls, null, 2));

      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorker()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
