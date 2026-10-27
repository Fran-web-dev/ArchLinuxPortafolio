# Arch Linux Portfolio

Portfolio interactivo construido con Astro. El chat usa Gemini desde el servidor, por lo que la clave no se envía al navegador.

## Chat con Gemini

1. Genera una clave de Gemini API en [Google AI Studio](https://aistudio.google.com/apikey). Google ofrece una cuota gratuita para modelos seleccionados, con límites que dependen del modelo y la cuenta; revisa los [precios y cuotas vigentes](https://ai.google.dev/gemini-api/docs/pricing).
2. Configura `GEMINI_API_KEY` en el entorno del servidor. Para desarrollo local, copia `.env.example` a `.env`; `.env` está excluido de Git.
3. Ejecuta `npm run build` y luego `npm start`. El servidor escucha en el puerto `4321` de forma predeterminada; `PORT` permite cambiarlo.
4. Despliega en un host que ejecute Node.js y guarda allí `GEMINI_API_KEY` como secreto. GitHub Pages, que solo sirve archivos estáticos, no puede ejecutar el endpoint del chat.

El modelo predeterminado es `gemini-2.5-flash`. Puedes cambiarlo mediante `GEMINI_MODEL` por otro modelo habilitado en tu cuenta. `npm start` usa el almacén de certificados de confianza del sistema para la conexión HTTPS.

## Comandos

- `npm run dev`: inicia Astro en segundo plano.
- `npm run build`: genera el sitio en `dist/`.
- `npm start`: sirve `dist/` y el endpoint `/api/chat`.

Para probar el chat localmente, compila primero y ejecuta el servidor Node con `GEMINI_API_KEY` configurada.
