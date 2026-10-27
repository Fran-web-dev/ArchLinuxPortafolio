import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { handleChat as handleSharedChat } from './src/data/chat.js';

try {
  process.loadEnvFile('.env');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const root = resolve('dist');
const port = Number(process.env.PORT) || 4321;
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const requests = new Map();

async function handleChat(request, response) {
  const ip = request.socket.remoteAddress || 'unknown';
  const result = await handleSharedChat(new Request('http://localhost/api/chat', {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request,
    duplex: ['GET', 'HEAD'].includes(request.method) ? undefined : 'half',
  }), process.env, ip, requests);
  response.writeHead(result.status, Object.fromEntries(result.headers));
  response.end(Buffer.from(await result.arrayBuffer()));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/chat') return handleChat(request, response);
  if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'Método no permitido.' });

  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { pathname = '/'; }
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(403); response.end('Forbidden'); return;
  }
  try {
    if ((await stat(filePath)).isDirectory()) filePath = resolve(filePath, 'index.html');
    const contents = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`Portfolio server listening on http://localhost:${port}`);
});
