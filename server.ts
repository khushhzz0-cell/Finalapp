import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Ensure data storage directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data', 'workspaces');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePathForPin(rawPin: string): string {
  const cleanPin = rawPin.replace(/\D/g, '').slice(0, 4) || '1234';
  return path.join(DATA_DIR, `pin_${cleanPin}.json`);
}

// SSE client tracking for real-time live sync across devices and tabs
const sseClients = new Map<string, Set<Response>>();

function broadcastToPin(pin: string, payload: any) {
  const clients = sseClients.get(pin);
  if (clients && clients.size > 0) {
    const dataStr = `data: ${JSON.stringify(payload)}\n\n`;
    clients.forEach(res => {
      try {
        res.write(dataStr);
      } catch {
        clients.delete(res);
      }
    });
  }
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE endpoint for real-time live sync
app.get('/api/sync/:pin/events', (req: Request, res: Response) => {
  const pin = req.params.pin.replace(/\D/g, '').slice(0, 4) || '1234';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients.has(pin)) {
    sseClients.set(pin, new Set());
  }
  const clientSet = sseClients.get(pin)!;
  clientSet.add(res);

  // Initial heartbeat
  res.write(`data: ${JSON.stringify({ type: 'connected', pin })}\n\n`);

  // Periodic keep-alive ping
  const pingInterval = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(pingInterval);
      clientSet.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clientSet.delete(res);
  });
});

// Check if a specific 4-digit PIN workspace exists
app.get('/api/sync/:pin/check', (req: Request, res: Response) => {
  const pin = req.params.pin.replace(/\D/g, '').slice(0, 4) || '1234';
  const filePath = getFilePathForPin(pin);
  res.json({ exists: fs.existsSync(filePath), pin });
});

// GET workspace for a specific 4-digit PIN
app.get('/api/sync/:pin', (req: Request, res: Response) => {
  const pin = req.params.pin.replace(/\D/g, '').slice(0, 4) || '1234';
  const filePath = getFilePathForPin(pin);

  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      res.json({ exists: true, pin, data: parsed });
    } catch (err: any) {
      console.error(`Failed to read file for PIN ${pin}:`, err);
      res.status(500).json({ error: 'Failed to read workspace data' });
    }
  } else {
    res.json({ exists: false, pin, data: null });
  }
});

// POST save workspace for a specific 4-digit PIN
app.post('/api/sync/:pin', (req: Request, res: Response) => {
  const pin = req.params.pin.replace(/\D/g, '').slice(0, 4) || '1234';
  const filePath = getFilePathForPin(pin);
  const body = req.body;

  if (!body) {
    res.status(400).json({ error: 'Missing workspace data payload' });
    return;
  }

  const payload = {
    ...body,
    ownerPin: pin,
    serverSyncedAt: new Date().toISOString(),
  };

  const sourceTabId = (body && body.sourceTabId) || (req.headers['x-tab-id'] as string) || '';

  try {
    // Atomic file write using temporary file to prevent corruption
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);

    // Broadcast update to all other connected tabs/devices for this PIN (includes sourceTabId so sender ignores self-echo)
    broadcastToPin(pin, { type: 'update', pin, data: payload, sourceTabId });

    res.json({ success: true, pin, savedAt: payload.serverSyncedAt });
  } catch (err: any) {
    console.error(`Failed to save file for PIN ${pin}:`, err);
    res.status(500).json({ error: 'Failed to write workspace data' });
  }
});

async function startServer() {
  // Mount Vite development middlewares in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FocusDo server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
