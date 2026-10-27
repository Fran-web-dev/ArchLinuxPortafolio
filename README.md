# Arch Linux Portfolio

Portfolio interactivo construido con Astro. El chat usa Gemini desde el servidor, por lo que la clave no se envía al navegador.

## Capturas del portfolio

### Asistente de IA

## Chat con Gemini

1. Genera una clave de Gemini API en [Google AI Studio](https://aistudio.google.com/apikey). Google ofrece una cuota gratuita para modelos seleccionados, con límites que dependen del modelo y la cuenta; revisa los [precios y cuotas vigentes](https://ai.google.dev/gemini-api/docs/pricing).
2. Configura `GEMINI_API_KEY` en el entorno del servidor. Para desarrollo local, copia `.env.example` a `.env`; `.env` está excluido de Git.
3. Ejecuta `npm run build` y luego `npm start`. El servidor escucha en el puerto `4321` de forma predeterminada; `PORT` permite cambiarlo.
4. En Netlify, agrega `GEMINI_API_KEY` como variable de entorno privada en la configuración del sitio y vuelve a desplegar. `netlify/functions/chat.mjs` publica el endpoint `/api/chat`; no subas la clave al repositorio. Otros hosts deben ejecutar `server.mjs` con Node.js.

El modelo predeterminado es `gemini-2.5-flash`. Puedes cambiarlo mediante `GEMINI_MODEL` por otro modelo habilitado en tu cuenta. `npm start` usa el almacén de certificados de confianza del sistema para la conexión HTTPS.

## Comandos

- `npm run dev`: inicia Astro en segundo plano.
- `npm run build`: genera el sitio en `dist/`.
- `npm start`: sirve `dist/` y el endpoint `/api/chat`.

Para probar el chat localmente, compila primero y ejecuta el servidor Node con `GEMINI_API_KEY` configurada.
