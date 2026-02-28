import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;

async function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // --- VITE MIDDLEWARE (DEV) OR STATIC FILES (PROD) ---
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.log("AVISO: Pasta 'dist' não encontrada. Execute 'npm run build'.");
      app.get('*', (req, res) => res.send('Aguardando build...'));
    }
  }

  app.listen(PORT, () => {
    console.log(`📡 Servidor Web Ordem Files rodando na porta ${PORT}`);
    if (!isProduction) {
        console.log(`🔧 Modo Desenvolvimento Ativo`);
    }
  });
}

createServer();