# Arch Linux Portfolio

Portfolio personal interactivo con apariencia de escritorio inspirada en Arch Linux. Construido con Astro, combina la presentación de mi experiencia y proyectos con una terminal web y un asistente impulsado por Gemini.

**[Visitar el portfolio](https://archlinux-portafolio.netlify.app/)**

## Funciones

- Escritorio interactivo con ventanas y cuatro espacios de trabajo.
- Perfil profesional, experiencia, educación, proyectos y habilidades.
- Terminal con comandos simulados, historial y consultas a Gemini con `ask <pregunta>`.
- Asistente visual conectado al endpoint `/api/chat`.
- Aplicaciones simuladas como VS Code y un navegador web.
- Interfaz disponible en español e inglés y varios fondos de escritorio.

## Tecnologías

- Astro
- JavaScript y CSS
- Netlify Functions
- Gemini API

## Requisitos

- Node.js `>=22.23.4`
- pnpm `11.25.0`

## Instalación y desarrollo

Instala las dependencias:

```bash
pnpm install
```

Inicia Astro en segundo plano:

```bash
pnpm dev
```

Para crear una compilación de producción y servirla localmente:

```bash
pnpm build
pnpm start
```

El servidor local sirve el sitio en `http://localhost:4321` por defecto. Puedes elegir otro puerto con la variable `PORT`.

## Configurar Gemini

Para habilitar las respuestas de Gemini en el servidor local, crea un archivo `.env` en la raíz del proyecto:

```env
GEMINI_API_KEY=tu_clave_de_gemini
```

El archivo `.env` está excluido de Git. Mantén la clave en el servidor y no la incluyas en el código del navegador ni en el repositorio.

El modelo predeterminado es `gemini-2.5-flash`. La disponibilidad y las cuotas dependen de tu cuenta; consulta la [documentación de precios de Gemini](https://ai.google.dev/gemini-api/docs/pricing).

## Publicar en Netlify

1. Conecta el repositorio a Netlify y publica la rama `master`.
2. En las variables de entorno del sitio, configura `GEMINI_API_KEY` para Functions.
3. Inicia un nuevo despliegue para que la función use la variable.

Netlify sirve `netlify/functions/chat.mjs` en `/api/chat`. La clave se mantiene en el servidor y no se envía al navegador.

## Scripts

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Inicia Astro en segundo plano. |
| `pnpm build` | Genera el sitio en `dist/`. |
| `pnpm preview` | Previsualiza la compilación de Astro. |
| `pnpm start` | Sirve `dist/` y el endpoint local `/api/chat`. |

## Usar la terminal del portfolio

Abre Terminal y ejecuta `help` para ver los comandos disponibles. Para consultar Gemini, escribe:

```text
ask ¿Qué proyectos ha creado Franklin?
```

`ask --help` muestra la ayuda. Si ejecutas `ask` sin pregunta, se abre el asistente visual.
