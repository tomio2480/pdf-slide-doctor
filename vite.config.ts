import { defineConfig, type Plugin } from 'vite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ServerResponse } from 'node:http';

/** pdfjs-dist の cmaps を提供する Vite プラグイン */
function pdfjsCmaps(): Plugin {
  return {
    name: 'pdfjs-cmaps',
    configureServer(server) {
      // dev サーバーで /cmaps/ リクエストを node_modules から提供する
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/cmaps/')) {
          const fileName = req.url.replace('/cmaps/', '');
          const filePath = path.resolve('node_modules/pdfjs-dist/cmaps', fileName);
          if (fs.existsSync(filePath)) {
            (res as ServerResponse).writeHead(200, { 'Content-Type': 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res as ServerResponse);
            return;
          }
        }
        next();
      });
    },
    writeBundle() {
      // ビルド時に cmaps を dist にコピーする
      const src = path.resolve('node_modules/pdfjs-dist/cmaps');
      const dst = path.resolve('dist/cmaps');
      fs.mkdirSync(dst, { recursive: true });
      for (const file of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, file), path.join(dst, file));
      }
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
  plugins: [pdfjsCmaps()],
});
