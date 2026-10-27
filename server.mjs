import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { profile, aboutText, interests, experience, education, projects, skills } from './src/data/portfolio.js';

try {
  process.loadEnvFile('.env');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const root = resolve('dist');
const port = Number(process.env.PORT) || 4321;
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const requests = new Map();

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(payload));
}

async function handleChat(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Usa el método POST.' });
  if (!process.env.GEMINI_API_KEY) return sendJson(response, 503, { error: 'El servidor no tiene configurada GEMINI_API_KEY.' });
  const ip = request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 20) return sendJson(response, 429, { error: 'Límite temporal alcanzado. Espera un minuto e inténtalo de nuevo.' });
  recent.push(now);
  requests.set(ip, recent);

  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 20_000) return sendJson(response, 413, { error: 'La pregunta es demasiado larga.' });
  }

  let payload;
  try { payload = JSON.parse(body); } catch { return sendJson(response, 400, { error: 'Solicitud JSON no válida.' }); }
  const question = typeof payload.question === 'string' ? payload.question.trim().slice(0, 2000) : '';
  if (!question) return sendJson(response, 400, { error: 'Escribe una pregunta.' });
  const history = Array.isArray(payload.history)
    ? payload.history.slice(-10).filter((item) => ['user', 'assistant'].includes(item?.role) && typeof item?.content === 'string').map((item) => ({ role: item.role, content: item.content.slice(0, 2000) }))
    : [];

  const context = JSON.stringify({ profile, aboutText, interests, experience, education, projects, skills });
  let upstream;
  try {
        upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-2.5-flash')}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `Eres el asistente de IA del portfolio de ${profile.name}. Responde en el idioma de la pregunta, con claridad y brevedad. Ayuda a explorar su perfil y proyectos usando estos datos verificados: ${context}. Si algo no aparece en los datos, dilo y no lo inventes. No afirmes ser Claude ni un agente que controla el equipo.` }] },
        contents: [...history.map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] })), { role: 'user', parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return sendJson(response, 502, { error: 'No se pudo contactar con Gemini. Inténtalo de nuevo.' });
  }

  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const status = upstream.status === 401 || upstream.status === 403 ? 503 : upstream.status === 429 ? 429 : 502;
    const message = status === 503 ? 'La clave de Gemini no es válida o no tiene acceso a este modelo.' : status === 429 ? 'Se alcanzó la cuota gratuita temporal de Gemini. Inténtalo más tarde.' : 'Gemini no pudo completar la respuesta. Inténtalo de nuevo.';
    return sendJson(response, status, { error: message });
  }
  const answer = result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (typeof answer !== 'string' || !answer.trim()) return sendJson(response, 502, { error: 'Gemini devolvió una respuesta vacía.' });
  return sendJson(response, 200, { answer: answer.trim() });
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
