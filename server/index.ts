// Express + Socket.IO entry point. `npm run play` builds and runs this.
import express from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import type { ClientToServer, ServerToClient } from '../shared/protocol';
import { RoomManager, type RoomOptions } from './rooms';

export interface StartOptions extends RoomOptions {
  port?: number;
  host?: string;
  staticDir?: string;
  quiet?: boolean;
}

export function lanUrls(port: number): string[] {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const n of list ?? []) {
      if (n.family === 'IPv4' && !n.internal) out.push(`http://${n.address}:${port}`);
    }
  }
  return out;
}

export async function startServer(opts: StartOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  const http = createServer(app);
  const io = new Server<ClientToServer, ServerToClient>(http, {
    cors: { origin: false },
    pingInterval: 10_000,
    pingTimeout: 8_000,
    maxHttpBufferSize: 10_000,
  });
  const rooms = new RoomManager(io, opts);

  let port = opts.port ?? Number(process.env.PORT ?? 3000);

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, rooms: rooms.rooms.size });
  });
  app.get('/api/info', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ publicUrl: process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || null, lanUrls: lanUrls(port) });
  });

  const staticDir = opts.staticDir ?? join(dirname(fileURLToPath(import.meta.url)), 'client');
  if (existsSync(staticDir)) {
    app.use(
      express.static(staticDir, {
        index: false,
        setHeaders(res, path) {
          if (/[\\/]assets[\\/]/.test(path)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    // SPA routes: /, /host, /join, /play, /demo
    app.get(/^\/(?!api\/|socket\.io\/|assets\/).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(join(staticDir, 'index.html'));
    });
  }

  await new Promise<void>((resolve, reject) => {
    http.once('error', reject);
    http.listen(port, opts.host ?? '0.0.0.0', resolve);
  });
  const addr = http.address();
  if (addr && typeof addr === 'object') port = addr.port;

  if (!opts.quiet) {
    console.log('\n  🚐  Next Stop: Tel Aviv is running\n');
    console.log(`  On this computer:   http://localhost:${port}`);
    for (const u of lanUrls(port)) console.log(`  Phones on same Wi-Fi: ${u}`);
    if (process.env.PUBLIC_URL) console.log(`  Public URL:         ${process.env.PUBLIC_URL}`);
    console.log('\n  Host screen: /host   ·   Solo: /play   ·   Demo (offline-capable): /demo\n');
  }

  return {
    port,
    io,
    rooms,
    async close() {
      rooms.close();
      io.close();
      await new Promise<void>((r) => http.close(() => r()));
    },
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  // If PORT isn't set and 3000 is busy, try the next few ports.
  const explicit = process.env.PORT !== undefined;
  const first = Number(process.env.PORT ?? 3000);
  const boot = async (port: number): Promise<void> => {
    try {
      await startServer({ port });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e?.code === 'EADDRINUSE' && !explicit && port < first + 10) {
        console.log(`  Port ${port} is busy — trying ${port + 1}…`);
        return boot(port + 1);
      }
      if (e?.code === 'EADDRINUSE') console.error(`\n  Port ${port} is already in use by another program.\n  Try a different port:  PORT=4000 npm run play\n`);
      else console.error(err);
      process.exit(1);
    }
  };
  boot(first);
}
