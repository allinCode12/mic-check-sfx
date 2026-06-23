import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';

// Helper to parse JSON body from incoming request stream
function getRequestBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', (err: any) => {
      reject(err);
    });
  });
}

export default defineConfig(() => {
  return {
    base: '/mic-check-sfx/',
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'local-backend-sync',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/save-history' && req.method === 'POST') {
              try {
                const data = await getRequestBody(req);
                const historyPath = path.resolve(__dirname, 'public/history.json');
                
                // Ensure public directory exists
                const publicDir = path.dirname(historyPath);
                if (!fs.existsSync(publicDir)) {
                  fs.mkdirSync(publicDir, { recursive: true });
                }

                let historyList = [];
                if (fs.existsSync(historyPath)) {
                  try {
                    historyList = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
                  } catch (e) {
                    historyList = [];
                  }
                }

                const lastEntry = historyList[0];
                const isDuplicate = lastEntry &&
                  JSON.stringify(lastEntry.script) === JSON.stringify(data.script) &&
                  JSON.stringify(lastEntry.sounds) === JSON.stringify(data.sounds) &&
                  JSON.stringify(lastEntry.bgmTracks || []) === JSON.stringify(data.bgmTracks || []);

                if (!isDuplicate) {
                  const date = new Date();
                  const formattedDate = date.toLocaleString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                  const newEntry = {
                    id: `hist_${date.getTime()}`,
                    timestamp: date.toISOString(),
                    formattedDate,
                    script: data.script,
                    sounds: data.sounds,
                    bgmTracks: data.bgmTracks || []
                  };
                  historyList.unshift(newEntry);
                  if (historyList.length > 50) {
                    historyList = historyList.slice(0, 50);
                  }
                  fs.writeFileSync(historyPath, JSON.stringify(historyList, null, 2), 'utf-8');
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, history: historyList }));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
              return;
            }

            if (req.url === '/api/upload-file' && req.method === 'POST') {
              try {
                const data = await getRequestBody(req);
                const { filename, base64 } = data;
                const buffer = Buffer.from(base64, 'base64');

                const uploadsDir = path.resolve(__dirname, 'public/uploads');
                if (!fs.existsSync(uploadsDir)) {
                  fs.mkdirSync(uploadsDir, { recursive: true });
                }

                const targetPath = path.join(uploadsDir, filename);
                fs.writeFileSync(targetPath, buffer);

                // Register in public/uploads.json
                const uploadsJsonPath = path.resolve(__dirname, 'public/uploads.json');
                let uploadsList = [];
                if (fs.existsSync(uploadsJsonPath)) {
                  try {
                    uploadsList = JSON.parse(fs.readFileSync(uploadsJsonPath, 'utf-8'));
                  } catch (e) {
                    uploadsList = [];
                  }
                }
                if (!uploadsList.includes(filename)) {
                  uploadsList.push(filename);
                }
                fs.writeFileSync(uploadsJsonPath, JSON.stringify(uploadsList, null, 2), 'utf-8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filename, url: `uploads/${filename}` }));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
              return;
            }

            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
