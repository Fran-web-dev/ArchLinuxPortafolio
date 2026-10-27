import { profile, aboutText, interests, experience, education, projects, skills } from './portfolio.js';

const json = (status, payload) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

export async function handleChat(request, env = process.env, rateLimitKey = 'unknown', requests = new Map()) {
  if (request.method !== 'POST') return json(405, { error: 'Usa el método POST.' });
  if (!env.GEMINI_API_KEY) return json(503, { error: 'El servidor no tiene configurada GEMINI_API_KEY.' });
  const now = Date.now();
  const recent = (requests.get(rateLimitKey) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 20) return json(429, { error: 'Límite temporal alcanzado. Espera un minuto e inténtalo de nuevo.' });
  recent.push(now);
  requests.set(rateLimitKey, recent);

  let payload;
  try {
    const body = await request.text();
    if (body.length > 20_000) return json(413, { error: 'La pregunta es demasiado larga.' });
    payload = JSON.parse(body);
  } catch {
    return json(400, { error: 'Solicitud JSON no válida.' });
  }

  const question = typeof payload.question === 'string' ? payload.question.trim().slice(0, 2000) : '';
  if (!question) return json(400, { error: 'Escribe una pregunta.' });
  const history = Array.isArray(payload.history)
    ? payload.history.slice(-10)
      .filter((item) => ['user', 'assistant'].includes(item?.role) && typeof item?.content === 'string')
      .map((item) => ({ role: item.role, content: item.content.slice(0, 2000) }))
    : [];

  const context = JSON.stringify({ profile, aboutText, interests, experience, education, projects, skills });
  let upstream;
  try {
    upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL || 'gemini-2.5-flash')}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `Eres el asistente de IA del portfolio de ${profile.name}. Responde en el idioma de la pregunta, con claridad y brevedad. Ayuda a explorar su perfil y proyectos usando estos datos verificados: ${context}. Si algo no aparece en los datos, dilo y no lo inventes. No afirmes ser Claude ni un agente que controla el equipo.` }] },
        contents: [...history.map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] })), { role: 'user', parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return json(502, { error: 'No se pudo contactar con Gemini. Inténtalo de nuevo.' });
  }

  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const status = upstream.status === 401 || upstream.status === 403 ? 503 : upstream.status === 429 ? 429 : 502;
    const message = status === 503 ? 'La clave de Gemini no es válida o no tiene acceso a este modelo.' : status === 429 ? 'Se alcanzó la cuota gratuita temporal de Gemini. Inténtalo más tarde.' : 'Gemini no pudo completar la respuesta. Inténtalo de nuevo.';
    return json(status, { error: message });
  }
  const answer = result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (typeof answer !== 'string' || !answer) return json(502, { error: 'Gemini devolvió una respuesta vacía.' });
  return json(200, { answer });
}
