import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // Proxy endpoint to avoid CORS issues when CLI client connects to external OpenList servers
  app.post('/api/proxy', async (req, res) => {
    try {
      const { url, method = 'GET', headers = {}, body } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const fetchOptions: RequestInit = {
        method,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      res.status(response.status).json(data);
    } catch (error: any) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy endpoint for file uploads (base64)
  app.post('/api/proxy-upload', async (req, res) => {
    try {
      const { url, headers = {}, base64Data } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const buffer = Buffer.from(base64Data, 'base64');

      const fetchOptions: RequestInit = {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Length': buffer.length.toString(),
        },
        body: buffer,
      };

      const response = await fetch(url, fetchOptions);
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      res.status(response.status).json(data);
    } catch (error: any) {
      console.error('Upload Proxy error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // use *all for express v5, * for express v4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
