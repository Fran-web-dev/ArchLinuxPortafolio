import { apps, projects, skills, profile, aboutText, interests } from '../data/portfolio.js';
import { renderAppContent } from './window-content.js';

const desktopIcons = document.querySelector('#desktopIcons');
const windowLayer = document.querySelector('#windowLayer');
const taskItems = document.querySelector('#taskItems');
const mobileNav = document.querySelector('#mobileNav');
const wallpaper = document.querySelector('.wallpaper');
const startupOverlay = document.querySelector('#startupOverlay');
const windowState = new Map();
const windowElements = new Map();
const terminalHistory = [];
const terminalCommandHistory = [];
let terminalHistoryIndex = 0;
let completionMatches = [];
let completionIndex = -1;
let browserUrl = '';
const defaultSpotifyUrl = 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn';
let spotifyUrl = normalizeSpotifyUrl(localStorage.getItem('portfolio-spotify-url')) || defaultSpotifyUrl;
let githubDataCache = null;
let githubDataFetchedAt = 0;
let githubRequest = null;
const editorFiles = new Map([
  ['about.txt', aboutText],
  ['projects.txt', projects.map((project) => `${project.name}\n${project.description}\nStack: ${project.technologies.join(', ')}`).join('\n\n')],
  ['skills.txt', skills.join(', ')],
  ['profile.txt', `${profile.name}\n${profile.role}\n${profile.website}`],
]);
let editorState = null;
let activeWorkspace = 1;
let zIndex = 10;
let focusedBeforeLauncher = null;
let drag = null;
let resize = null;
let desktopIconsRendered = false;
const containsHtmlMarkup = (value) => /<\/?[a-z][^>]*>/i.test(value);
const languageSelects = document.querySelectorAll('.language-select');
const translations = {
  es: { systemStart: 'Inicio de Arch Linux', startingSession: 'Iniciando sesión gráfica', welcome: 'Bienvenido', signInDesktop: 'Inicia sesión en tu escritorio', username: 'Usuario', password: 'Contraseña', passwordPlaceholder: 'Escribe cualquier contraseña', signIn: 'Iniciar sesión', systemName: 'Arch Linux · Hyprland', appLauncher: 'Lanzador de aplicaciones', searchApps: 'Buscar aplicaciones...', changeLanguage: 'Cambiar idioma', desktopStatus: 'Estado del escritorio', workspaceNav: 'Espacios de trabajo', workspace1: 'Espacio 1', workspace2: 'Espacio 2', workspace3: 'Espacio 3', workspace4: 'Espacio 4', workspaceNames: { 1: 'Espacio personal', 2: 'Proyectos', 3: 'Desarrollo', 4: 'Perfil y contacto' }, dockLabel: 'ESPACIOS', launcherHint: '↑↓ para navegar', launcherOpen: '↵ para abrir' },
  en: { systemStart: 'Arch Linux startup', startingSession: 'Starting graphical session', welcome: 'Welcome', signInDesktop: 'Sign in to your desktop', username: 'Username', password: 'Password', passwordPlaceholder: 'Enter any password', signIn: 'Sign in', systemName: 'Arch Linux · Hyprland', appLauncher: 'Application launcher', searchApps: 'Search apps...', changeLanguage: 'Change language', desktopStatus: 'Desktop status', workspaceNav: 'Workspaces', workspace1: 'Workspace 1', workspace2: 'Workspace 2', workspace3: 'Workspace 3', workspace4: 'Workspace 4', workspaceNames: { 1: 'Personal workspace', 2: 'Projects', 3: 'Development', 4: 'Profile & contact' }, dockLabel: 'WORKSPACES', launcherHint: '↑↓ to navigate', launcherOpen: '↵ to open' },
};
let currentLanguage = localStorage.getItem('portfolio-language') === 'en' ? 'en' : 'es';
function applyLanguage(language) {
  currentLanguage = language === 'en' ? 'en' : 'es';
  localStorage.setItem('portfolio-language', currentLanguage);
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const text = translations[currentLanguage][element.dataset.i18n];
    if (text) element.textContent = text;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const text = translations[currentLanguage][element.dataset.i18nPlaceholder];
    if (text) element.setAttribute('placeholder', text);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    const text = translations[currentLanguage][element.dataset.i18nAriaLabel];
    if (text) element.setAttribute('aria-label', text);
  });
  const workspaceName = document.querySelector('#workspaceName');
  if (workspaceName) workspaceName.textContent = translations[currentLanguage].workspaceNames[activeWorkspace];
  languageSelects.forEach((select) => {
    select.value = currentLanguage;
    select.setAttribute('aria-label', translations[currentLanguage].changeLanguage);
    select.title = translations[currentLanguage].changeLanguage;
  });
}
languageSelects.forEach((select) => select.addEventListener('change', () => applyLanguage(select.value)));
applyLanguage(currentLanguage);

if (startupOverlay) {
  const loginForm = startupOverlay.querySelector('#loginForm');
  const bootScreen = startupOverlay.querySelector('#bootScreen');
  const bootConsole = startupOverlay.querySelector('#bootConsole');
  const loginClock = startupOverlay.querySelector('#loginClock');
  const bootMessages = [
    'Started User Session Services.',
    'Finished Load/Save Screen Backlight Brightness.',
    'Started Refreshing Package Manager Databases.',
    'Reached target User and Group Name Lookups.',
    'Started User Login Management.',
    'Finished Apply Kernel Variables.',
    'Reached target Local Encrypted Volumes.',
    'Started D-Bus System Message Bus.',
    'Reached target System Initialization.',
    'Started Network Time Synchronization.',
    'Started Create Volatile Files and Directories.',
    'Reached target Basic System.',
    'Started Portfolio Desktop Services.',
    'Reached target Graphical Interface.',
  ];
  const initialBootLines = [...bootConsole.querySelectorAll('.boot-log-line')];
  const lineHeight = Number.parseFloat(getComputedStyle(initialBootLines[0]).lineHeight) || 22;
  const linesToFillScreen = Math.max(initialBootLines.length, Math.ceil((innerHeight - 136) / lineHeight));
  for (let index = initialBootLines.length; index < linesToFillScreen; index += 1) {
    const line = initialBootLines[index % initialBootLines.length].cloneNode(true);
    line.querySelector('time').textContent = `[  ${(4.4 + index * 0.37).toFixed(6)} ]`;
    line.querySelector('span').textContent = bootMessages[(index - initialBootLines.length) % bootMessages.length];
    bootConsole.insertBefore(line, bootConsole.querySelector('.boot-console-ready'));
  }
  const bootLines = [...bootConsole.querySelectorAll('.boot-log-line')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  bootLines.forEach((line, index) => {
    line.style.animationDelay = reducedMotion ? '0ms' : `${(index * 1700) / Math.max(bootLines.length - 1, 1)}ms`;
  });
  const updateLoginClock = () => {
    if (loginClock) loginClock.textContent = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  };
  window.setTimeout(() => {
    bootScreen.classList.add('boot-screen-exit');
    window.setTimeout(() => {
      bootScreen.hidden = true;
      loginForm.hidden = false;
      updateLoginClock();
      startupOverlay.classList.add('login-ready');
      loginForm.querySelector('#loginPassword').focus({ preventScroll: true });
    }, 420);
  }, 2000);
  const loginClockInterval = window.setInterval(updateLoginClock, 15000);
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    window.clearInterval(loginClockInterval);
    startupOverlay.classList.add('startup-exit');
    window.setTimeout(() => startupOverlay.remove(), 380);
  });
}

const iconPaths = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  folder: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><path d="M3.5 9h17"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m5 0h5"/>',
  browser: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  spotify: '<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/><path d="M7 9c3.6-1 7.8-.6 10.5 1.1M7.8 12c3-.8 6.7-.4 9 1M8.6 15c2.4-.6 5.3-.3 7.2.8"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14"/>',
  github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.7c3-.3 6.2-1.5 6.2-6.8a5.3 5.3 0 0 0-1.4-3.7 4.9 4.9 0 0 0-.1-3.7S17.6 1.9 15 3.8a13.4 13.4 0 0 0-7 0C5.4 1.9 4.2 2.2 4.2 2.2a4.9 4.9 0 0 0-.1 3.7 5.3 5.3 0 0 0-1.4 3.7c0 5.3 3.2 6.5 6.2 6.8A3.4 3.4 0 0 0 8 19v3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  file: '<path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h6M8 13h8m-8 4h8"/>',
};
const iconSvg = (name, extraClass = '') => `<svg class="app-icon ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.file}</svg>`;

const wallpapers = ['sakura', 'koi', 'ukiyo-e', 'tokyo'];
const savedWallpaper = localStorage.getItem('portfolio-wallpaper');
if (wallpapers.includes(savedWallpaper) && savedWallpaper !== 'sakura') wallpaper.dataset.wallpaper = savedWallpaper;
function setWallpaper(name) {
  if (!wallpapers.includes(name)) return `Fondo no disponible: ${name || '(vacío)'}. Opciones: ${wallpapers.join(', ')}`;
  if (name === 'sakura') delete wallpaper.dataset.wallpaper;
  else wallpaper.dataset.wallpaper = name;
  localStorage.setItem('portfolio-wallpaper', name);
  return `Fondo cambiado a: ${name}`;
}
document.querySelector('#wallpaperToggle').addEventListener('click', () => {
  const current = wallpaper.dataset.wallpaper || 'sakura';
  const next = wallpapers[(wallpapers.indexOf(current) + 1) % wallpapers.length];
  setWallpaper(next);
});

function openApp(id) {
  const app = apps.find((item) => item.id === id);
  if (!app) return;
  if (app.external) {
    if (profile.github) window.open(profile.github, '_blank', 'noopener,noreferrer');
    else openWindow('github');
    return;
  }
  if (id === 'spotify' && windowState.has(id)) {
    const element = windowElements.get(id);
    const address = element?.querySelector('#spotifyAddress');
    const frame = element?.querySelector('#spotifyFrame');
    const source = spotifyUrl.replace('https://open.spotify.com/', 'https://open.spotify.com/embed/').replace('/embed/embed/', '/embed/');
    if (address) address.value = spotifyUrl;
    if (frame && frame.src !== new URL(source, location.href).href) frame.src = source;
    localStorage.setItem('portfolio-spotify-url', spotifyUrl);
  }
  if (windowState.has(id)) {
    const current = windowState.get(id);
    current.minimized = false;
    current.workspace = activeWorkspace;
    render();
    focusWindow(id);
    return;
  }
  if (app.workspace) switchWorkspace(app.workspace);
  openWindow(id);
}

function openWindow(id) {
  if (windowState.has(id)) {
    windowState.get(id).minimized = false;
    render();
    focusWindow(id);
    return;
  }
  const app = apps.find((item) => item.id === id);
  if (!app) return;
  const offset = Math.min(windowState.size * 22, 140);
  const width = id === 'terminal' ? 820 : id === 'browser' ? 900 : id === 'spotify' ? 620 : id === 'about' ? 520 : id === 'projects' ? 680 : 540;
  const height = id === 'terminal' ? 500 : id === 'browser' ? 620 : id === 'spotify' ? 520 : id === 'about' ? 360 : id === 'projects' ? 440 : 400;
  windowState.set(id, {
    id,
    workspace: app.workspace || activeWorkspace,
    x: Math.max(84, Math.min(innerWidth - width - 36, id === 'terminal' ? innerWidth * 0.37 : 260 + offset)),
    y: Math.max(48, Math.min(innerHeight - height - 88, id === 'terminal' ? 92 : 98 + offset)),
    w: width,
    h: height,
    minimized: false,
    maximized: false,
    previous: null,
    z: ++zIndex,
  });
  render();
  focusWindow(id);
}

function render() {
  if (!desktopIconsRendered) {
    desktopIcons.innerHTML = apps.filter((app) => !app.terminalOnly).map((app) => `<button class="desktop-icon" data-open="${app.id}" aria-label="Abrir ${app.name}"><span class="app-glyph glyph-${app.id}">${iconSvg(app.icon)}</span><span>${app.name}</span></button>`).join('');
    mobileNav.innerHTML = apps.filter((app) => !app.external && !app.terminalOnly).map((app) => `<button data-open="${app.id}">${iconSvg(app.icon)}${app.name}</button>`).join('');
    desktopIconsRendered = true;
  }
  taskItems.replaceChildren();
  for (const [id, element] of windowElements) {
    if (!windowState.has(id)) {
      element.remove();
      windowElements.delete(id);
    }
  }

  for (const [id, current] of windowState) {
    const app = apps.find((item) => item.id === id);
    const task = document.createElement('button');
    task.className = `task-item${current.workspace === activeWorkspace && !current.minimized ? ' selected' : ''}`;
    task.innerHTML = `${iconSvg(app.icon, 'task-icon')} ${app.name}`;
    task.onclick = () => {
      current.workspace = activeWorkspace;
      current.minimized = false;
      render();
      focusWindow(id);
    };
    taskItems.append(task);
    let element = windowElements.get(id);
    if (!element) {
      element = document.createElement('article');
      element.className = 'app-window';
      element.dataset.window = id;
      element.innerHTML = `<header class="window-titlebar" data-drag="${id}"><div class="window-controls"><button class="win-close" aria-label="Cerrar" data-action="close" data-id="${id}"></button><button class="win-min" aria-label="Minimizar" data-action="min" data-id="${id}"></button><button class="win-max" aria-label="Maximizar o restaurar" data-action="max" data-id="${id}"></button></div><span class="window-name">${iconSvg(app.icon, 'title-icon')} ${app.name}</span><span class="window-menu">•••</span></header><div class="window-content">${renderAppContent(id, { profile, aboutText, interests, projects, skills, terminalHistory, browserUrl, spotifyUrl })}</div><div class="resize-handle" data-resize="${id}"></div>`;
      windowLayer.append(element);
      windowElements.set(id, element);
      if (id === 'terminal') populateMatrix(element.querySelector('.matrix-field'));
      if (id === 'browser') initializeBrowser(element);
      if (id === 'spotify') initializeSpotify(element);
      if (id === 'github') initializeGithub(element);
      element.addEventListener('pointerdown', () => focusWindow(id));
    }
    element.hidden = current.workspace !== activeWorkspace || current.minimized;
    if (element.hidden) continue;
    element.classList.toggle('maximized', current.maximized);
    const resizeHandle = element.querySelector('.resize-handle');
    if (resizeHandle) resizeHandle.hidden = current.maximized;
    element.style.left = `${current.maximized ? 0 : current.x}px`;
    element.style.top = `${current.maximized ? 0 : current.y}px`;
    element.style.width = current.maximized ? '' : `${current.w}px`;
    element.style.height = current.maximized ? '' : `${current.h}px`;
    element.style.zIndex = current.z;
  }
}

function focusWindow(id) {
  const current = windowState.get(id);
  if (!current) return;
  current.z = ++zIndex;
  const element = windowElements.get(id);
  if (element) element.style.zIndex = current.z;
  if (id === 'terminal') {
    focusTerminalPrompt();
  }
}

function focusTerminalPrompt() {
  requestAnimationFrame(() => {
    const input = windowLayer.querySelector('[data-window="terminal"] #terminalInput');
    if (input && !input.disabled) input.focus({ preventScroll: true });
  });
}

function normalizeBrowserUrl(value) {
  if (!value.trim()) return 'about:blank';
  try {
    const url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function initializeBrowser(element) {
  const form = element.querySelector('#browserForm');
  const address = element.querySelector('#browserAddress');
  const frame = element.querySelector('#browserFrame');
  const hint = element.querySelector('#browserHint');
  const external = element.querySelector('#browserExternal');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (containsHtmlMarkup(address.value)) {
      hint.textContent = 'No se permite introducir etiquetas HTML.';
      return;
    }
    const url = normalizeBrowserUrl(address.value);
    if (!url) {
      hint.textContent = 'Dirección no válida. Usa una URL http o https.';
      return;
    }
    browserUrl = url === 'about:blank' ? '' : url;
    address.value = browserUrl;
    frame.src = url;
    external.href = url;
    hint.textContent = 'Navegador integrado. Algunos sitios bloquean su visualización dentro de otros sitios.';
  });
  element.querySelector('[data-browser-action="reload"]').addEventListener('click', () => { frame.src = frame.src; });
  element.querySelector('[data-browser-action="back"]').addEventListener('click', () => {
    try { frame.contentWindow.history.back(); } catch { /* Cross-origin history may be restricted. */ }
  });
}

function normalizeSpotifyUrl(value) {
  if (!value) return null;
  try {
    const mediaUrl = new URL(value.trim());
    if (mediaUrl.protocol === 'https:' && ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be'].includes(mediaUrl.hostname)) {
      const videoId = mediaUrl.hostname.includes('youtu.be') || mediaUrl.pathname.startsWith('/embed/')
        ? mediaUrl.pathname.split('/').filter(Boolean).at(-1)
        : mediaUrl.searchParams.get('v');
      if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
      const time = mediaUrl.searchParams.get('t') || mediaUrl.searchParams.get('start') || '0';
      const start = Number.parseInt(time, 10) || 0;
      return `https://www.youtube.com/embed/${videoId}${start ? `?start=${start}` : ''}`;
    }
  } catch { /* Continue with Spotify URI and URL validation. */ }
  const spotifyUri = value.trim().match(/^spotify:(track|album|playlist|artist|show|episode):([A-Za-z0-9]+)$/i);
  if (spotifyUri) return `https://open.spotify.com/${spotifyUri[1].toLowerCase()}/${spotifyUri[2]}`;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'embed') parts.shift();
    if (parts.length !== 2 || !['track', 'album', 'playlist', 'artist', 'show', 'episode'].includes(parts[0]) || !/^[A-Za-z0-9]+$/.test(parts[1])) return null;
    return `https://open.spotify.com/${parts[0]}/${parts[1]}`;
  } catch {
    return null;
  }
}

function initializeSpotify(element) {
  const form = element.querySelector('#spotifyForm');
  const address = element.querySelector('#spotifyAddress');
  const frame = element.querySelector('#spotifyFrame');
  const hint = element.querySelector('#spotifyHint');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (containsHtmlMarkup(address.value)) {
      hint.textContent = 'No se permite introducir etiquetas HTML.';
      return;
    }
    const normalized = normalizeSpotifyUrl(address.value);
    if (!normalized) {
      hint.textContent = 'Enlace no válido. Pega un enlace de Spotify o YouTube.';
      return;
    }
    spotifyUrl = normalized;
    address.value = normalized;
    frame.src = normalized.replace('https://open.spotify.com/', 'https://open.spotify.com/embed/');
    localStorage.setItem('portfolio-spotify-url', normalized);
    hint.textContent = 'Reproducción integrada en el portfolio. Pulsa ▶ dentro del reproductor para escuchar.';
  });
  element.querySelectorAll('[data-spotify-uri]').forEach((button) => {
    button.addEventListener('click', () => {
      address.value = button.dataset.spotifyUri;
      form.requestSubmit();
    });
  });
}

function initializeGithub(element) {
  const refresh = element.querySelector('#githubRefresh');
  refresh.addEventListener('click', () => loadGithubData(element, true));
  if (githubDataCache && Date.now() - githubDataFetchedAt < 10 * 60 * 1000) {
    renderGithubData(element, githubDataCache);
    return;
  }
  loadGithubData(element);
}

async function loadGithubData(element, force = false) {
  const status = element.querySelector('#githubUpdated');
  const refresh = element.querySelector('#githubRefresh');
  refresh.disabled = true;
  status.textContent = 'Actualizando información pública…';
  if (!force && githubRequest) {
    try { renderGithubData(element, await githubRequest); } catch (error) { renderGithubError(element, error); }
    finally { refresh.disabled = false; }
    return;
  }
  githubRequest = (async () => {
    const username = 'Fran-web-dev';
    const headers = { Accept: 'application/vnd.github+json' };
    const [profileResponse, reposResponse, eventsResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(`https://api.github.com/users/${username}/repos?type=owner&sort=updated&per_page=100`, { headers }),
      fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, { headers }).catch(() => null),
    ]);
    if (!profileResponse.ok) throw new Error(profileResponse.status === 403 ? 'GitHub limitó temporalmente las consultas públicas. Espera un momento y vuelve a actualizar.' : `GitHub respondió con el error ${profileResponse.status}.`);
    if (!reposResponse.ok) throw new Error(`No se pudieron cargar los repositorios (HTTP ${reposResponse.status}).`);
    const [user, repos, events] = await Promise.all([
      profileResponse.json(),
      reposResponse.json(),
      eventsResponse?.ok ? eventsResponse.json() : Promise.resolve(null),
    ]);
    return { user, repos, events };
  })();
  try {
    githubDataCache = await githubRequest;
    githubDataFetchedAt = Date.now();
    renderGithubData(element, githubDataCache);
  } catch (error) {
    renderGithubError(element, error);
  } finally {
    githubRequest = null;
    refresh.disabled = false;
  }
}

function renderGithubError(element, error) {
  element.querySelector('#githubUpdated').textContent = error?.message || 'No se pudieron cargar los datos de GitHub.';
  element.querySelector('#githubRepositories').innerHTML = '<p class="github-loading">Revisa tu conexión y pulsa ↻ para volver a intentar.</p>';
  element.querySelector('#githubActivitySummary').textContent = 'Actividad no disponible';
}

function renderGithubData(element, data) {
  const { user, repos, events } = data;
  const number = new Intl.NumberFormat('es');
  const name = element.querySelector('#githubName');
  const handle = element.querySelector('#githubHandle');
  const bio = element.querySelector('#githubBio');
  const avatar = element.querySelector('#githubAvatar');
  name.textContent = user.name || user.login;
  handle.textContent = `@${user.login}`;
  bio.textContent = [user.bio, user.location].filter(Boolean).join(' · ') || 'Perfil público de GitHub';
  const avatarUrl = new URL(user.avatar_url);
  if (avatarUrl.protocol === 'https:' && avatarUrl.hostname === 'avatars.githubusercontent.com') avatar.src = avatarUrl.href;
  const publicCommits = (events || []).filter((event) => event.type === 'PushEvent').reduce((sum, event) => sum + Number(event.payload?.size || event.payload?.commits?.length || 0), 0);
  element.querySelector('#githubStats').innerHTML = [
    ['Seguidores', user.followers], ['Siguiendo', user.following], ['Repositorios', user.public_repos], ['Commits públicos recientes', publicCommits],
  ].map(([label, value]) => `<div class="github-stat"><strong>${number.format(value ?? 0)}</strong><span>${label}</span></div>`).join('');

  const repositoryList = element.querySelector('#githubRepositories');
  repositoryList.replaceChildren();
  const visibleRepos = [...repos].sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at)).slice(0, 12);
  element.querySelector('#githubRepoSummary').textContent = `${number.format(user.public_repos)} públicos · mostrando ${visibleRepos.length} recientes`;
  if (!visibleRepos.length) repositoryList.innerHTML = '<p class="github-loading">No hay repositorios públicos para mostrar.</p>';
  for (const repo of visibleRepos) {
    const card = document.createElement('article');
    card.className = 'github-repo';
    const repoLink = document.createElement('a');
    repoLink.className = 'github-repo-link';
    repoLink.textContent = repo.name;
    const repoUrl = new URL(repo.html_url);
    if (repoUrl.protocol === 'https:' && repoUrl.hostname === 'github.com') {
      repoLink.href = repoUrl.href;
      repoLink.target = '_blank';
      repoLink.rel = 'noopener noreferrer';
    }
    const description = document.createElement('p');
    description.textContent = repo.description || 'Sin descripción';
    const meta = document.createElement('small');
    meta.textContent = [repo.language, `★ ${number.format(repo.stargazers_count)}`, `⑂ ${number.format(repo.forks_count)}`].filter(Boolean).join(' · ');
    card.append(repoLink, description, meta);
    repositoryList.append(card);
  }

  const calendar = element.querySelector('#githubCalendar');
  calendar.replaceChildren();
  const eventCounts = new Map();
  for (const event of events || []) {
    const day = event.created_at?.slice(0, 10);
    if (day) eventCounts.set(day, (eventCounts.get(day) || 0) + 1);
  }
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let activeDays = 0;
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const count = eventCounts.get(key) || 0;
    if (count) activeDays += 1;
    const cell = document.createElement('span');
    const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
    cell.className = `github-day level-${level}`;
    cell.title = `${key}: ${count} eventos públicos`;
    cell.setAttribute('aria-label', cell.title);
    calendar.append(cell);
  }
  const publicEvents = events?.length;
  element.querySelector('#githubActivitySummary').textContent = publicEvents === undefined || publicEvents === null
    ? 'Actividad pública no disponible'
    : `${number.format(publicEvents)} eventos · ${activeDays} días activos · últimos 30 días`;
  element.querySelector('#githubUpdated').textContent = `Datos públicos de GitHub · actualizado ${new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`;
}

function cycleWindow(reverse = false) {
  const windows = [...windowState.values()];
  if (!windows.length) return;
  const focused = windows.filter((item) => item.workspace === activeWorkspace && !item.minimized).sort((a, b) => b.z - a.z)[0];
  const currentIndex = focused ? windows.findIndex((item) => item.id === focused.id) : -1;
  const nextIndex = currentIndex < 0
    ? 0
    : (currentIndex + (reverse ? -1 : 1) + windows.length) % windows.length;
  const next = windows[nextIndex];
  next.minimized = false;
  if (next.workspace !== activeWorkspace) switchWorkspace(next.workspace);
  else render();
  focusWindow(next.id);
}

function switchWorkspace(workspace) {
  activeWorkspace = workspace;
  document.querySelectorAll('.workspace').forEach((button) => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.workspace) === workspace));
  });
  document.querySelector('#workspaceName').textContent = translations[currentLanguage].workspaceNames[workspace];
  render();
}

desktopIcons.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open]');
  if (button) openApp(button.dataset.open);
});
mobileNav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open]');
  if (button) openApp(button.dataset.open);
});
document.querySelector('.workspaces').addEventListener('click', (event) => {
  const button = event.target.closest('[data-workspace]');
  if (button) switchWorkspace(Number(button.dataset.workspace));
});

windowLayer.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button) {
    const current = windowState.get(button.dataset.id);
    if (!current) return;
    if (button.dataset.action === 'close') windowState.delete(current.id);
    if (button.dataset.action === 'min') current.minimized = true;
    if (button.dataset.action === 'max') {
      if (!current.maximized) {
        current.previous = { x: current.x, y: current.y, w: current.w, h: current.h };
        current.maximized = true;
      } else {
        Object.assign(current, current.previous);
        current.maximized = false;
      }
    }
    render();
    return;
  }
  if (event.target.id === 'clearTerminal') {
    const output = document.querySelector('#terminalOutput');
    if (output) output.innerHTML = '';
  }
});

windowLayer.addEventListener('pointerdown', (event) => {
  const titlebar = event.target.closest('[data-drag]');
  if (titlebar && !event.target.closest('button') && !matchMedia('(max-width: 760px)').matches) {
    const current = windowState.get(titlebar.dataset.drag);
    if (current && !current.maximized) {
      drag = { id: current.id, dx: event.clientX - current.x, dy: event.clientY - current.y };
      titlebar.setPointerCapture(event.pointerId);
    }
  }
  const handle = event.target.closest('[data-resize]');
  if (handle && !matchMedia('(max-width: 760px)').matches) {
    const current = windowState.get(handle.dataset.resize);
    if (current) {
      resize = { id: current.id, x: event.clientX, y: event.clientY, w: current.w, h: current.h };
      handle.setPointerCapture(event.pointerId);
    }
  }
});
windowLayer.addEventListener('pointermove', (event) => {
  if (drag) {
    const current = windowState.get(drag.id);
    if (!current) return;
    current.x = Math.max(0, Math.min(innerWidth - current.w, event.clientX - drag.dx));
    current.y = Math.max(42, Math.min(innerHeight - 90, event.clientY - drag.dy));
    const element = windowElements.get(drag.id);
    if (element) {
      element.style.left = `${current.x}px`;
      element.style.top = `${current.y}px`;
    }
  }
  if (resize) {
    const current = windowState.get(resize.id);
    if (!current) return;
    current.w = Math.max(340, Math.min(innerWidth - current.x, resize.w + event.clientX - resize.x));
    current.h = Math.max(250, Math.min(innerHeight - current.y - 75, resize.h + event.clientY - resize.y));
    const element = windowElements.get(resize.id);
    if (element) {
      element.style.width = `${current.w}px`;
      element.style.height = `${current.h}px`;
    }
  }
});
windowLayer.addEventListener('pointerup', () => { drag = null; resize = null; });
windowLayer.addEventListener('pointercancel', () => { drag = null; resize = null; });

const launcherBackdrop = document.querySelector('#launcherBackdrop');
const appSearch = document.querySelector('#appSearch');
const appResults = document.querySelector('#appResults');
let selectedResult = 0;
function drawResults() {
  const matches = apps.filter((app) => !app.terminalOnly && `${app.name} ${app.desc}`.toLowerCase().includes(appSearch.value.toLowerCase()));
  selectedResult = Math.min(selectedResult, Math.max(0, matches.length - 1));
  appResults.innerHTML = matches.map((app, index) => `<button class="launcher-result ${index === selectedResult ? 'active' : ''}" data-result="${app.id}"><span class="result-icon">${iconSvg(app.icon)}</span><span><b>${app.name}</b><small>${app.desc}</small></span><kbd>↵</kbd></button>`).join('') || '<p class="no-results">No applications found</p>';
}
function showLauncher() {
  focusedBeforeLauncher = document.activeElement;
  launcherBackdrop.hidden = false;
  appSearch.value = '';
  selectedResult = 0;
  drawResults();
  appSearch.focus();
}
function hideLauncher() {
  launcherBackdrop.hidden = true;
  if (focusedBeforeLauncher?.focus) focusedBeforeLauncher.focus();
}
document.querySelector('#launcherTrigger').addEventListener('click', showLauncher);
launcherBackdrop.addEventListener('click', (event) => {
  if (event.target === launcherBackdrop) hideLauncher();
  const button = event.target.closest('[data-result]');
  if (button) {
    hideLauncher();
    openApp(button.dataset.result);
  }
});
appSearch.addEventListener('input', () => { selectedResult = 0; drawResults(); });
appSearch.addEventListener('keydown', (event) => {
  const count = appResults.querySelectorAll('.launcher-result').length;
  if (event.key === 'ArrowDown' && count) { event.preventDefault(); selectedResult = (selectedResult + 1) % count; drawResults(); }
  if (event.key === 'ArrowUp' && count) { event.preventDefault(); selectedResult = (selectedResult - 1 + count) % count; drawResults(); }
  if (event.key === 'Enter') {
    const button = appResults.querySelectorAll('.launcher-result')[selectedResult];
    if (button) { hideLauncher(); openApp(button.dataset.result); }
  }
  if (event.key === 'Escape') hideLauncher();
});
document.addEventListener('keydown', (event) => {
  if (!editorState && event.ctrlKey && event.altKey && event.key === 'Tab') {
    event.preventDefault();
    cycleWindow(event.shiftKey);
    return;
  }
  if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 't' && !editorState) {
    event.preventDefault();
    openApp('terminal');
    return;
  }
  const terminalInput = document.querySelector('#terminalInput');
  if (terminalInput && document.activeElement === terminalInput) {
    if (completionMatches.length && event.ctrlKey && event.altKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      completionIndex = (completionIndex + (event.key === 'ArrowRight' ? 1 : completionMatches.length - 1)) % completionMatches.length;
      terminalInput.value = completionMatches[completionIndex];
      updateTerminalSuggestion();
      return;
    }
    if (event.key === 'ArrowUp' && terminalCommandHistory.length) {
      event.preventDefault();
      terminalHistoryIndex = Math.max(0, terminalHistoryIndex - 1);
      terminalInput.value = terminalCommandHistory[terminalHistoryIndex];
    }
    if (event.key === 'ArrowDown' && terminalCommandHistory.length) {
      event.preventDefault();
      terminalHistoryIndex = Math.min(terminalCommandHistory.length, terminalHistoryIndex + 1);
      terminalInput.value = terminalCommandHistory[terminalHistoryIndex] || '';
    }
  }
  if (editorState) {
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveEditorFile();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      editorState.mode = 'normal';
      updateEditorMode();
      return;
    }
    if (event.key.toLowerCase() === 'i' && editorState.mode === 'normal') {
      event.preventDefault();
      editorState.mode = 'insert';
      updateEditorMode();
      document.querySelector('#editorText')?.focus();
      return;
    }
    if (event.key === ':' && editorState.mode === 'normal') {
      event.preventDefault();
      editorState.mode = 'command';
      updateEditorMode();
      const command = document.querySelector('#editorCommand');
      if (command) { command.hidden = false; command.focus(); }
      return;
    }
  }
  if (!editorState && event.ctrlKey && event.key.toLowerCase() === 'l') {
    const terminalInput = document.querySelector('#terminalInput');
    if (terminalInput) {
      event.preventDefault();
      terminalHistory.length = 0;
      const output = document.querySelector('#terminalOutput');
      const form = document.querySelector('#terminalForm');
      output.innerHTML = '';
      output.append(form);
      terminalInput.value = '';
      terminalInput.focus();
      return;
    }
  }
  if (event.key === 'Escape' && !launcherBackdrop.hidden) hideLauncher();
  if (event.key.toLowerCase() === 'k' && event.metaKey && !event.repeat) {
    event.preventDefault();
    launcherBackdrop.hidden ? showLauncher() : hideLauncher();
  }
});

function populateMatrix(field) {
  if (!field) return;
  const alphabet = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789+-<>*';
  const columns = matchMedia('(max-width: 760px)').matches ? 24 : 40;
  for (let index = 0; index < columns; index += 1) {
    const column = document.createElement('span');
    column.className = 'matrix-column';
    column.textContent = Array.from({ length: 25 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('\n');
    column.style.setProperty('--alpha', String(.22 + Math.random() * .55));
    column.style.setProperty('--offset', `${Math.floor(Math.random() * -180)}px`);
    column.style.setProperty('--speed', `${10 + Math.random() * 12}s`);
    column.style.setProperty('--delay', `${Math.random() * -18}s`);
    field.append(column);
  }
}
function updateClock() {
  document.querySelector('#clock').textContent = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
}
function updateEditorMode(message = '') {
  const mode = document.querySelector('#editorMode');
  const status = document.querySelector('#editorStatus');
  if (mode) mode.textContent = `-- ${editorState?.mode === 'insert' ? 'INSERT' : editorState?.mode === 'command' ? 'COMMAND' : 'NORMAL'} --`;
  if (status) status.textContent = message;
  const textarea = document.querySelector('#editorText');
  if (textarea) textarea.readOnly = editorState?.mode !== 'insert';
}
function saveEditorFile() {
  if (!editorState) return;
  const draft = document.querySelector('#editorText')?.value ?? editorState.content;
  if (containsHtmlMarkup(draft)) {
    updateEditorMode('No se guardó: no se permiten etiquetas HTML.');
    return false;
  }
  editorState.content = draft;
  editorFiles.set(editorState.filename, editorState.content);
  editorState.mode = 'normal';
  updateEditorMode(`"${editorState.filename}" written`);
  return true;
}
function openEditor(filename) {
  const validFiles = [...editorFiles.keys()];
  if (!filename) return `Usage: nvim <file> · available: ${validFiles.join(', ')}`;
  if (!editorFiles.has(filename)) return `File not found: ${filename}\nAvailable: ${validFiles.join(', ')}`;
  editorState = { filename, content: editorFiles.get(filename), mode: 'normal' };
  document.querySelector('#terminalInput').disabled = true;
  document.querySelector('#terminalForm').hidden = true;
  const output = document.querySelector('#terminalOutput');
  output.innerHTML = `<section class="vim-editor"><header class="vim-title">"${filename}" · portfolio buffer</header><textarea id="editorText" aria-label="Contenido del archivo" spellcheck="false" readonly>${editorState.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea><footer class="vim-status"><span id="editorMode">-- NORMAL --</span><span id="editorStatus">i: editar · Esc: modo normal · :wq: guardar y salir · Ctrl+S: guardar</span></footer><form class="vim-command" id="editorCommandForm"><span>:</span><input id="editorCommand" aria-label="Comando de Neovim" autocomplete="off" hidden/></form></section>`;
  const textarea = document.querySelector('#editorText');
  textarea.addEventListener('input', () => { editorState.content = textarea.value; });
  document.querySelector('#editorCommandForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const command = document.querySelector('#editorCommand').value.trim();
    if ((command === 'w' || command === 'wq' || command === 'x') && !saveEditorFile()) return;
    if (command === 'q!' || command === 'q') closeEditor(false);
    if (command === 'wq' || command === 'x') closeEditor(true);
    const field = document.querySelector('#editorCommand');
    if (field) { field.value = ''; field.hidden = true; }
    if (editorState) { editorState.mode = 'normal'; updateEditorMode(); }
  });
  updateEditorMode();
  return `Opening ${filename} in Neovim…`;
}
function closeEditor(save = false) {
  if (!editorState) return;
  if (save) saveEditorFile();
  editorState = null;
  const input = document.querySelector('#terminalInput');
  const form = document.querySelector('#terminalForm');
  if (input) input.disabled = false;
  if (form) form.hidden = false;
  render();
}
updateClock();
setInterval(updateClock, 15000);

const commands = {
  help: () => 'Available: help · ls · apps · workspaces · workspace <1-4> · windows · open <app> · browser [url] · spotify [--help|búsqueda] · wallpaper [sakura|koi|ukiyo-e|tokyo] · about · projects · skills · github · contact · neofetch · nvim <file> · clear · date · whoami · exit',
  spotify: (args) => {
    if (args[0] === '--help' || args[0] === '-h') return `Uso: spotify [opción]\n\nAbre Spotify dentro del portfolio.\n\nOpciones:\n  --help, -h       Muestra esta ayuda\n  sanctuary ship   Carga Nujabes · Sanctuary Ship\n  lofi girl        Carga la playlist Hip Hop de Lofi Girl\n\nEjemplos:\n  spotify\n  spotify sanctuary ship\n  spotify lofi girl`;
    const query = args.join(' ').trim();
    const target = query.toLowerCase();
    const uri = target === 'sanctuary ship' || target === 'nujabes sanctuary ship'
      ? 'https://www.youtube.com/watch?v=f6jBSMP7uc8&t=1233s'
      : target === 'lofi girl' || target === 'lofi girl hip hop'
        ? 'spotify:playlist:0vvXsWCC9xrXsKd4FyS8kM'
        : '';
    if (uri) spotifyUrl = normalizeSpotifyUrl(uri);
    else if (query) return `Opción no reconocida: ${query}. Usa 'spotify --help' para ver los accesos disponibles.`;
    return { message: `Abriendo Spotify${query ? `: ${query}` : ' en el portfolio'}…`, action: () => openApp('spotify') };
  },
  browser: (args) => {
    const url = normalizeBrowserUrl(args.join(' '));
    if (url === null) return 'Dirección no válida. Uso: browser [https://example.com]';
    browserUrl = url === 'about:blank' ? '' : url;
    return { message: `Abriendo el navegador${browserUrl ? ` en ${browserUrl}` : ''}…`, action: () => openApp('browser') };
  },
  wallpaper: (args) => {
    if (args[0] === '--help' || args[0] === '-h') return `Uso: wallpaper [opción]\n\nCambia o consulta el fondo del escritorio.\n\nOpciones disponibles:\n  sakura    Fondo japonés claro\n  koi       Pez koi y sol rojo\n  ukiyo-e   Ilustración japonesa tradicional\n  tokyo     Calle de Tokio\n  --help    Muestra esta ayuda\n\nSin opción, muestra el fondo actual.\nEjemplo: wallpaper tokyo`;
    return args[0] ? setWallpaper(args[0].toLowerCase()) : `Fondo actual: ${wallpaper.dataset.wallpaper || 'sakura'}\nOpciones: ${wallpapers.join(', ')}\nUso: wallpaper <nombre>`;
  },
  nvim: (args) => ({ message: openEditor(args[0]) }),
  ls: () => apps.map((app) => `${app.id}/`).join('    '),
  apps: () => apps.map((app) => `  ${app.id.padEnd(12)} ${app.name} — ${app.desc}`).join('\n'),
  workspaces: () => [1, 2, 3, 4].map((workspace) => {
    const visible = [...windowState.values()].filter((item) => item.workspace === workspace).map((item) => {
      const name = apps.find((app) => app.id === item.id)?.name;
      return `${name}${item.minimized ? ' (minimized)' : ''}`;
    });
    const label = workspace === activeWorkspace ? ' (active)' : '';
    return `${workspace}${label}: ${visible.length ? visible.join(', ') : 'empty'}`;
  }).join('\n'),
  workspace: (args) => {
    const workspace = Number(args[0]);
    if (![1, 2, 3, 4].includes(workspace)) return 'Usage: workspace <1-4>';
    return { message: `Switching to workspace ${workspace}…`, action: () => switchWorkspace(workspace) };
  },
  windows: () => {
    const opened = [...windowState.values()].map((item) => `${apps.find((app) => app.id === item.id)?.name} · workspace ${item.workspace}${item.minimized ? ' · minimized' : ''}`);
    return opened.length ? opened.join('\n') : 'No open windows.';
  },
  open: (args) => {
    const query = args.join(' ').toLowerCase();
    const target = apps.find((app) => app.id === query || app.name.toLowerCase() === query);
    if (!target) return { message: `Application not found: ${query || '(empty)'}. Use 'apps' to list available applications.` };
    if (target.external) return { message: `${target.name}: ${profile.github}\nOpen the GitHub app from the desktop to visit the profile.` };
    return { message: `Opening ${target.name}…`, action: () => openApp(target.id) };
  },
  about: () => aboutText,
  projects: () => projects.length ? projects.map((project) => `• ${project.name}`).join('\n') : 'No verified projects found.',
  skills: () => skills.length ? skills.join(' · ') : 'No verified skills list found.',
  github: () => ({ message: 'Abriendo el perfil de GitHub dentro del portfolio…', action: () => openApp('github') }),
  contact: () => 'No verified contact details found in the source.',
  neofetch: () => `      /\\         ${profile.name}\n     /  \\        ${profile.role}\n    /\\   \\       OS: Arch Linux (simulated)\n   /      \\      Shell: web-terminal\n  /   ,,   \\     WM: Hyprland-inspired\n /   |  |   \\    Browser: ${navigator.userAgent.split(' ').slice(-1)[0]}`,
  date: () => new Date().toLocaleString(),
  whoami: () => `${profile.name} · ${profile.role}`,
  clear: () => null,
  exit: () => null,
};

function terminalCompletions(input) {
  const trimmed = input.trimStart();
  const trailingSpace = /\s$/.test(input);
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (!tokens.length) return Object.keys(commands);
  if (tokens.length === 1 && !trailingSpace) return Object.keys(commands).filter((name) => name.startsWith(tokens[0].toLowerCase()));
  const command = tokens[0].toLowerCase();
  const query = trailingSpace ? '' : (tokens.at(-1) || '').toLowerCase();
  if (command === 'open') return apps.filter((app) => !app.terminalOnly && !app.external).map((app) => `open ${app.id}`).filter((value) => value.endsWith(' ' + query) || !query);
  if (command === 'wallpaper') return wallpapers.filter((name) => name.startsWith(query)).map((name) => `wallpaper ${name}`);
  if (command === 'nvim') return [...editorFiles.keys()].filter((name) => name.startsWith(query)).map((name) => `nvim ${name}`);
  return [];
}

function updateTerminalSuggestion() {
  const suggestion = document.querySelector('#terminalSuggestion');
  if (!suggestion) return;
  const input = document.querySelector('#terminalInput');
  const candidate = completionMatches[completionIndex];
  const typed = input?.value || '';
  const suffix = candidate && candidate.toLowerCase().startsWith(typed.toLowerCase())
    ? candidate.slice(typed.length)
    : candidate ? `  → ${candidate}` : '';
  suggestion.textContent = suffix;
  suggestion.title = candidate ? `Sugerencia ${completionIndex + 1}/${completionMatches.length}: ${candidate}` : '';
}

function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= right.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[right.length];
}

function suggestCommand(commandName) {
  const closest = Object.keys(commands).map((name) => ({ name, distance: editDistance(commandName.toLowerCase(), name) })).sort((a, b) => a.distance - b.distance)[0];
  return closest && closest.distance <= Math.max(1, Math.floor(commandName.length * 0.34)) ? closest.name : '';
}

windowLayer.addEventListener('keydown', (event) => {
  const input = event.target;
  if (input?.id !== 'terminalInput') return;
  if (event.key === 'Escape') {
    completionMatches = [];
    completionIndex = -1;
    updateTerminalSuggestion();
    return;
  }
  if (event.ctrlKey && event.altKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
    if (!completionMatches.length) completionMatches = terminalCompletions(input.value);
    if (!completionMatches.length) return;
    event.preventDefault();
    completionIndex = (completionIndex + (event.key === 'ArrowRight' ? 1 : completionMatches.length - 1)) % completionMatches.length;
    input.value = completionMatches[completionIndex];
    updateTerminalSuggestion();
    return;
  }
  if (event.key !== 'Tab') return;
  const matches = terminalCompletions(input.value);
  if (!matches.length) return;
  event.preventDefault();
  completionMatches = matches;
  completionIndex = -1;
  const current = input.value.trim();
  if (matches.length === 1) {
    const suggestion = matches[0];
    input.value = `${suggestion} `;
    completionIndex = 0;
  } else {
    const prefix = matches.reduce((common, item) => {
      let index = 0;
      while (index < common.length && index < item.length && common[index] === item[index]) index++;
      return common.slice(0, index);
    });
    if (prefix.length > current.length) input.value = prefix;
    else {
      const output = document.querySelector('#terminalOutput');
      const response = document.createElement('pre');
      response.className = 'command-response';
      response.textContent = matches.join('    ');
      output.append(response);
      output.scrollTop = output.scrollHeight;
    }
  }
  if (completionIndex >= 0) updateTerminalSuggestion();
  else {
    completionIndex = 0;
    updateTerminalSuggestion();
  }
});

windowLayer.addEventListener('input', (event) => {
  if (event.target?.id !== 'terminalInput') return;
  completionMatches = terminalCompletions(event.target.value);
  completionIndex = completionMatches.length ? 0 : -1;
  updateTerminalSuggestion();
});

windowLayer.addEventListener('submit', (event) => {
  if (event.target.id !== 'terminalForm') return;
  event.preventDefault();
  const input = event.target.querySelector('input');
  const output = document.querySelector('#terminalOutput');
  const command = input.value.trim();
  if (!command) return;
  completionMatches = [];
  completionIndex = -1;
  updateTerminalSuggestion();
  if (containsHtmlMarkup(command)) {
    input.value = '';
    const response = document.createElement('pre');
    response.className = 'command-response error';
    response.textContent = 'Entrada bloqueada: no se permite escribir etiquetas HTML en la terminal.';
    output.append(response, event.target);
    output.scrollTop = output.scrollHeight;
    focusTerminalPrompt();
    return;
  }
  terminalCommandHistory.push(command);
  terminalHistoryIndex = terminalCommandHistory.length;
  const [commandName, ...args] = command.split(/\s+/);
  const key = commandName.toLowerCase();
  const run = commands[key];

  if (key === 'clear') {
    terminalHistory.length = 0;
    output.innerHTML = '';
    output.append(event.target);
    input.value = '';
    focusTerminalPrompt();
    return;
  }
  if (key === 'exit') {
    windowState.delete('terminal');
    render();
    return;
  }

  const entry = document.createElement('div');
  entry.className = 'terminal-entry';
  const line = document.createElement('div');
  line.className = 'command-line';
  line.innerHTML = `<span class="history-prompt-line"><span class="prompt-tree">╭─</span><span class="prompt-user"> franklin@arch</span> <span class="prompt-path">~</span></span><br/><span class="history-prompt-line"><span class="prompt-tree">╰─</span><span class="prompt-path"> $</span></span> `;
  const commandWord = document.createElement('span');
  commandWord.className = run ? 'command-keyword' : 'command-unknown';
  commandWord.textContent = commandName;
  line.append(commandWord);
  if (command.slice(commandName.length)) {
    const argumentsText = document.createElement('span');
    argumentsText.className = 'command-arguments';
    argumentsText.textContent = command.slice(commandName.length);
    line.append(argumentsText);
  }
  entry.append(line);
  output.append(entry);
  input.value = '';

  const suggestion = run ? '' : suggestCommand(commandName);
  let result = run ? run(args) : `command not found: ${commandName}.${suggestion ? `\nDid you mean '${suggestion}${args.length ? ` ${args.join(' ')}` : ''}'?` : " Type 'help' for available commands."}`;
  const action = result && typeof result === 'object' ? result.action : null;
  const responseText = result && typeof result === 'object' ? result.message : result;
  const isError = !run || (typeof responseText === 'string' && responseText.startsWith('Application not found:'));
  if (responseText) {
    const response = document.createElement('pre');
    response.className = `command-response${isError ? ' error' : ''}`;
    response.textContent = responseText;
    entry.append(response);
  }
  terminalHistory.push({ command, response: responseText || '', error: isError, known: Boolean(run) });
  output.append(event.target);
  output.scrollTop = output.scrollHeight;

  if (action) {
    action();
  }
  if (!editorState) focusTerminalPrompt();
});

render();
openWindow('about');
