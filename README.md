<div align="center">

# Arch Linux Portfolio

### Un portfolio personal que convierte el escritorio Linux en una experiencia web interactiva.

[![Astro](https://img.shields.io/badge/Astro-Framework-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=222)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-AI-8E75B2?logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Deploy](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify&logoColor=white)](https://archlinux-portafolio.netlify.app/)

[Explorar portfolio](https://archlinux-portafolio.netlify.app/) · [Reportar un problema](https://github.com/Fran-web-dev/ArchLinuxPortafolio/issues)

<br />

<img src="public/archlinux-portfolio.png" alt="Vista previa del escritorio interactivo del portfolio" width="100%" />

</div>

## Acerca del proyecto

Este portfolio presenta el perfil, la experiencia y los proyectos de **Franklin Villanueva**, desarrollador frontend de Honduras. La interfaz recrea un escritorio inspirado en Arch Linux y Hyprland: las secciones aparecen como aplicaciones en ventanas, distribuidas en cuatro espacios de trabajo.

La experiencia funciona en español e inglés y se adapta a pantallas pequeñas. Está construida con Astro, JavaScript y CSS, e integra Google Gemini en el asistente y la terminal.

## Explora el escritorio

| Aplicación | Qué encontrarás |
| --- | --- |
| **About Me** | Perfil profesional, intereses, experiencia y educación. |
| **Projects** | Proyectos seleccionados, tecnologías y enlaces a demos y repositorios. |
| **Skills** | Tecnologías y herramientas de desarrollo. |
| **GitHub** | Perfil público, repositorios y actividad reciente. |
| **Contact** | Correo electrónico, LinkedIn y sitio personal. |
| **Resume** | Sección preparada para el currículum. |
| **Terminal** | Shell simulada con comandos interactivos y acceso a consultas de Gemini. |
| **Portfolio AI** | Asistente Gemini para preguntar sobre el perfil y los proyectos. |
| **Browser, VS Code y Spotify** | Aplicaciones simuladas para explorar el portfolio desde el escritorio. |

También puedes cambiar de espacio de trabajo, buscar aplicaciones desde el lanzador, cambiar el fondo y alternar el idioma.

## Primeros pasos

### Requisitos

- Node.js `>=22.23.4`
- pnpm `11.25.0`

### Instalar y ejecutar

```bash
pnpm install
pnpm dev
```

Astro inicia el sitio en `http://localhost:4321` por defecto. Para compilar y servir la versión de producción:

```bash
pnpm build
pnpm start
```

## Comandos

| Comando | Acción |
| --- | --- |
| `pnpm dev` | Inicia Astro en segundo plano. |
| `pnpm build` | Genera la compilación de producción en `dist/`. |
| `pnpm preview` | Previsualiza la compilación de Astro. |
| `pnpm start` | Sirve localmente la compilación de producción. |

Prueba el [portfolio desplegado](https://archlinux-portafolio.netlify.app/) para usar el asistente Gemini o explorar la terminal. Allí, ejecuta `help` para ver los comandos y `ask ¿Qué proyectos ha creado Franklin?` para hacer una consulta.

## Publicación

El sitio está publicado en [Netlify](https://archlinux-portafolio.netlify.app/). Puedes abrirlo y probar sus funciones directamente.

## Tecnologías

**Astro · JavaScript · CSS · Google Gemini · Netlify**

---

<div align="center">
  Hecho por <a href="https://github.com/Fran-web-dev">Franklin Villanueva</a> · <a href="mailto:franklinevillanueva4@gmail.com">Contacto</a>
</div>
