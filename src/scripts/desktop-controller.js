import { apps, projects, skills, profile, aboutText, interests, experience, education } from '../data/portfolio.js';
import { getLocale, locales } from '../data/locales.js';
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
const terminalAiHistory = [];
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
const translations = locales;
let currentLanguage = localStorage.getItem('portfolio-language') === 'en' ? 'en' : 'es';
function applyLanguage(language) {
  currentLanguage = language === 'en' ? 'en' : 'es';
  localStorage.setItem('portfolio-language', currentLanguage);
  document.documentElement.lang = currentLanguage;
  document.title = translations[currentLanguage].pageTitle;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.content = translations[currentLanguage].pageDescription;
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
  document.querySelectorAll('[data-i18n-title]').forEach((element) => {
    const text = translations[currentLanguage][element.dataset.i18nTitle];
    if (text) element.title = text;
  });
  document.querySelectorAll('[data-boot-line]').forEach((element) => {
    const text = translations[currentLanguage].bootLines[Number(element.dataset.bootLine)];
    if (text) element.textContent = text;
  });
  document.querySelectorAll('.workspace').forEach((button) => button.classList.toggle('active', Number(button.dataset.workspace) === activeWorkspace));
  document.querySelectorAll('.workspace').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.workspace) === activeWorkspace)));
  const activeApp = [...windowState.values()].find((item) => item.workspace === activeWorkspace && !item.minimized);
  const waybarState = document.querySelector('#waybarWindowState');
  if (waybarState) waybarState.textContent = activeApp ? (localizedApp(apps.find((app) => app.id === activeApp.id) || { id: '', name: 'hyprland' }).name).toLowerCase() : 'hyprland';
  const workspaceName = document.querySelector('#workspaceName');
  if (workspaceName) workspaceName.textContent = translations[currentLanguage].workspaceNames[activeWorkspace];
  languageSelects.forEach((select) => {
    select.value = currentLanguage;
    select.setAttribute('aria-label', translations[currentLanguage].changeLanguage);
    select.title = translations[currentLanguage].changeLanguage;
  });
  const loginStatus = startupOverlay?.querySelector('.login-status');
  if (loginStatus) loginStatus.textContent = translations[currentLanguage].loginStatus;
  const loginClock = startupOverlay?.querySelector('#loginClock');
  if (loginClock) loginClock.textContent = new Intl.DateTimeFormat(currentLanguage === 'en' ? 'en-US' : 'es-GT', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  if (document.querySelector('#clock')) updateClock();
  if (desktopIconsRendered) {
    updateDesktopAppLabels();
    refreshOpenWindowContent();
    if (editorState && windowElements.has('terminal')) openEditor(editorState.filename);
    if (typeof launcherBackdrop !== 'undefined' && !launcherBackdrop.hidden) drawResults();
  }
}
languageSelects.forEach((select) => select.addEventListener('change', () => applyLanguage(select.value)));
applyLanguage(currentLanguage);

if (startupOverlay) {
  const loginForm = startupOverlay.querySelector('#loginForm');
  const bootScreen = startupOverlay.querySelector('#bootScreen');
  const bootConsole = startupOverlay.querySelector('#bootConsole');
  const loginClock = startupOverlay.querySelector('#loginClock');
  const bootMessages = getLocale(currentLanguage).bootLines;
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
    if (loginClock) loginClock.textContent = new Intl.DateTimeFormat(currentLanguage === 'en' ? 'en-US' : 'es-GT', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  };
  window.setTimeout(() => {
    bootScreen.classList.add('boot-screen-exit');
    window.setTimeout(() => {
      bootScreen.hidden = true;
      loginForm.hidden = false;
      updateLoginClock();
      startupOverlay.classList.add('login-ready');
      loginForm.classList.add('login-authenticating');
      window.setTimeout(() => {
        startupOverlay.classList.add('startup-exit');
        window.setTimeout(() => startupOverlay.remove(), 380);
      }, reducedMotion ? 350 : 1700);
    }, 420);
  }, 2000);
  const loginClockInterval = window.setInterval(updateLoginClock, 15000);
  void loginClockInterval;
}

const iconPaths = {
  sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14ZM5 2l.8 2.2L8 5l-2.2.8L5 8l-.8-2.2L2 5l2.2-.8L5 2Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  folder: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><path d="M3.5 9h17"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m5 0h5"/>',
  browser: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  vscode: '<path d="m17.8 2.8-9.5 9.1-5-3.8-2.1 1.1v5.6l2.1 1.1 5-3.8 9.5 9.1 4-2V4.8l-4-2Zm0 5.2v8l-4.2-4 4.2-4Z" fill="currentColor" stroke="none"/>',
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
  const locale = getLocale(currentLanguage);
  if (!wallpapers.includes(name)) return `${locale.wallpaperUnavailable}: ${name || locale.emptyValue}. ${locale.wallpaperOptions}: ${wallpapers.join(', ')}`;
  if (name === 'sakura') delete wallpaper.dataset.wallpaper;
  else wallpaper.dataset.wallpaper = name;
  localStorage.setItem('portfolio-wallpaper', name);
  return `${locale.wallpaperChanged}: ${name}`;
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
  const width = id === 'terminal' ? 820 : id === 'browser' ? 900 : id === 'vscode' ? 760 : id === 'spotify' ? 620 : id === 'about' ? 520 : id === 'projects' ? 680 : id === 'assistant' ? 560 : 540;
  const height = id === 'terminal' ? 500 : id === 'browser' ? 620 : id === 'vscode' ? 500 : id === 'spotify' ? 520 : id === 'about' ? Math.min(600, Math.max(360, innerHeight - 150)) : id === 'projects' ? 440 : id === 'assistant' ? 470 : 400;
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
    updateDesktopAppLabels();
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
    task.innerHTML = `${iconSvg(app.icon, 'task-icon')} ${localizedApp(app).name}`;
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
      const locale = getLocale(currentLanguage);
      element.innerHTML = `<header class="window-titlebar" data-drag="${id}"><div class="window-controls"><button class="win-close" aria-label="${locale.close}" data-action="close" data-id="${id}"></button><button class="win-min" aria-label="${locale.minimize}" data-action="min" data-id="${id}"></button><button class="win-max" aria-label="${locale.maximize}" data-action="max" data-id="${id}"></button></div><span class="window-name">${iconSvg(app.icon, 'title-icon')} ${localizedApp(app).name}</span><span class="window-menu" aria-label="${locale.appTitle}">•••</span></header><div class="window-content">${renderAppContent(id, { profile: localizedProfile(), aboutText, interests, experience, education, projects, skills, terminalHistory, browserUrl, spotifyUrl, language: currentLanguage })}</div><div class="resize-handle" data-resize="${id}"></div>`;
      windowLayer.append(element);
      windowElements.set(id, element);
      if (id === 'terminal') populateMatrix(element.querySelector('.matrix-field'));
      if (id === 'browser') initializeBrowser(element);
      if (id === 'spotify') initializeSpotify(element);
      if (id === 'github') initializeGithub(element);
      if (id === 'assistant') initializeAssistant(element);
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

function localizedApp(app) {
  const locale = getLocale(currentLanguage);
  return { ...app, name: locale.appNames[app.id] || app.name, desc: locale.appDescriptions[app.id] || app.desc };
}
function localizedProfile() {
  return { ...profile, role: getLocale(currentLanguage).frontendRole };
}

function updateDesktopAppLabels() {
  const visibleApps = apps.filter((app) => !app.terminalOnly).map(localizedApp);
  desktopIcons.innerHTML = visibleApps.map((app) => `<button class="desktop-icon" data-open="${app.id}" aria-label="${getLocale(currentLanguage).open} ${app.name}"><span class="app-glyph glyph-${app.id}">${iconSvg(app.icon)}</span><span>${app.name}</span></button>`).join('');
  mobileNav.innerHTML = visibleApps.filter((app) => !app.external).map((app) => `<button data-open="${app.id}" aria-label="${getLocale(currentLanguage).open} ${app.name}">${iconSvg(app.icon)}${app.name}</button>`).join('');
}

function refreshOpenWindowContent() {
  for (const [id, element] of windowElements) {
    const app = apps.find((item) => item.id === id);
    const title = element.querySelector('.window-name');
    if (title && app) title.innerHTML = `${iconSvg(app.icon, 'title-icon')} ${localizedApp(app).name}`;
    const closeButton = element.querySelector('.win-close');
    const minButton = element.querySelector('.win-min');
    const maxButton = element.querySelector('.win-max');
    const locale = getLocale(currentLanguage);
    if (closeButton) closeButton.setAttribute('aria-label', locale.close);
    if (minButton) minButton.setAttribute('aria-label', locale.minimize);
    if (maxButton) maxButton.setAttribute('aria-label', locale.maximize);
    const messages = id === 'assistant' ? [...(element.querySelector('#assistantMessages')?.children || [])].slice(1).map((node) => node.cloneNode(true)) : [];
    const content = element.querySelector('.window-content');
    if (content) content.innerHTML = renderAppContent(id, { profile: localizedProfile(), aboutText, interests, experience, education, projects, skills, terminalHistory, browserUrl, spotifyUrl, language: currentLanguage });
    if (id === 'browser') initializeBrowser(element);
    if (id === 'spotify') initializeSpotify(element);
    if (id === 'github') initializeGithub(element);
    if (id === 'assistant') {
      const messageList = element.querySelector('#assistantMessages');
      messages.forEach((node) => messageList.append(node));
      initializeAssistant(element);
    }
  }
  render();
}

function initializeAssistant(element) {
  const form = element.querySelector('#assistantForm');
  const input = element.querySelector('#assistantInput');
  const messages = element.querySelector('#assistantMessages');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    const user = document.createElement('article');
    user.className = 'assistant-message assistant-user';
    const userText = document.createElement('p');
    userText.textContent = question;
    user.append(userText);
    const history = [...messages.querySelectorAll('.assistant-message')].slice(-10).map((item) => ({ role: item.classList.contains('assistant-user') ? 'user' : 'assistant', content: item.querySelector('p')?.textContent || '' }));
    input.value = '';
    const bot = document.createElement('article');
    bot.className = 'assistant-message assistant-bot';
    const name = document.createElement('b');
    name.textContent = 'Gemini';
    const response = document.createElement('p');
    response.textContent = getLocale(currentLanguage).thinking;
    bot.append(name, response);
    messages.append(user, bot);
    messages.scrollTop = messages.scrollHeight;
    fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, history }) })
      .then(async (result) => {
        const contentType = result.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(getLocale(currentLanguage).chatUnavailable);
        }
        const payload = await result.json();
        if (!result.ok) throw new Error(payload.error || getLocale(currentLanguage).geminiError);
        return payload.answer;
      })
      .then((answer) => { response.textContent = answer; })
      .catch((error) => { response.textContent = error.message || getLocale(currentLanguage).geminiError; bot.classList.add('assistant-error'); })
      .finally(() => { messages.scrollTop = messages.scrollHeight; });
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
      hint.textContent = getLocale(currentLanguage).htmlNotAllowed;
      return;
    }
    const url = normalizeBrowserUrl(address.value);
    if (!url) {
      hint.textContent = getLocale(currentLanguage).invalidAddress;
      return;
    }
    browserUrl = url === 'about:blank' ? '' : url;
    address.value = browserUrl;
    frame.src = url;
    external.href = url;
    hint.textContent = getLocale(currentLanguage).browserEmbedded;
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
      hint.textContent = getLocale(currentLanguage).htmlNotAllowed;
      return;
    }
    const normalized = normalizeSpotifyUrl(address.value);
    if (!normalized) {
      hint.textContent = getLocale(currentLanguage).spotifyInvalid;
      return;
    }
    spotifyUrl = normalized;
    address.value = normalized;
    frame.src = normalized.replace('https://open.spotify.com/', 'https://open.spotify.com/embed/');
    localStorage.setItem('portfolio-spotify-url', normalized);
    hint.textContent = getLocale(currentLanguage).spotifyEmbedded;
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
  status.textContent = getLocale(currentLanguage).githubLoadingStatus;
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
    const locale = getLocale(currentLanguage);
    if (!profileResponse.ok) throw new Error(profileResponse.status === 403 ? locale.githubRateLimit : `${locale.githubRequestError} ${profileResponse.status}.`);
    if (!reposResponse.ok) throw new Error(`${locale.repositoriesError} (HTTP ${reposResponse.status}).`);
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
  const locale = getLocale(currentLanguage);
  element.querySelector('#githubUpdated').textContent = error instanceof TypeError ? locale.checkConnection : error?.message || locale.loadingPublicData;
  element.querySelector('#githubRepositories').innerHTML = `<p class="github-loading">${locale.checkConnection}</p>`;
  element.querySelector('#githubActivitySummary').textContent = locale.activityUnavailable;
}

function renderGithubData(element, data) {
  const { user, repos, events } = data;
  const locale = getLocale(currentLanguage);
  const number = new Intl.NumberFormat(currentLanguage);
  const name = element.querySelector('#githubName');
  const handle = element.querySelector('#githubHandle');
  const bio = element.querySelector('#githubBio');
  const avatar = element.querySelector('#githubAvatar');
  name.textContent = user.name || user.login;
  handle.textContent = `@${user.login}`;
  bio.textContent = [user.bio, user.location].filter(Boolean).join(' · ') || locale.publicProfile;
  const avatarUrl = new URL(user.avatar_url);
  if (avatarUrl.protocol === 'https:' && avatarUrl.hostname === 'avatars.githubusercontent.com') avatar.src = avatarUrl.href;
  const publicCommits = (events || []).filter((event) => event.type === 'PushEvent').reduce((sum, event) => sum + Number(event.payload?.size || event.payload?.commits?.length || 0), 0);
  element.querySelector('#githubStats').innerHTML = [
    [locale.statusFollowers, user.followers], [locale.statusFollowing, user.following], [locale.statusRepos, user.public_repos], [locale.statusRecentCommits, publicCommits],
  ].map(([label, value]) => `<div class="github-stat"><strong>${number.format(value ?? 0)}</strong><span>${label}</span></div>`).join('');

  const repositoryList = element.querySelector('#githubRepositories');
  repositoryList.replaceChildren();
  const visibleRepos = [...repos].sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at)).slice(0, 12);
  element.querySelector('#githubRepoSummary').textContent = `${number.format(user.public_repos)} ${locale.public} · ${locale.showing} ${visibleRepos.length} ${locale.recent}`;
  if (!visibleRepos.length) repositoryList.innerHTML = `<p class="github-loading">${locale.noRepositories}</p>`;
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
    description.textContent = repo.description || locale.noDescription;
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
    cell.title = `${key}: ${count} ${locale.publicEvents}`;
    cell.setAttribute('aria-label', cell.title);
    calendar.append(cell);
  }
  const publicEvents = events?.length;
  element.querySelector('#githubActivitySummary').textContent = publicEvents === undefined || publicEvents === null
    ? locale.publicActivityUnavailable
    : `${number.format(publicEvents)} ${locale.events} · ${activeDays} ${locale.activeDays} · ${locale.last30Days}`;
  element.querySelector('#githubUpdated').textContent = `${locale.publicGitHubData} · ${locale.updated} ${new Intl.DateTimeFormat(currentLanguage, { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`;
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
  const matches = apps.filter((app) => !app.terminalOnly).map(localizedApp).filter((app) => `${app.name} ${app.desc}`.toLowerCase().includes(appSearch.value.toLowerCase()));
  selectedResult = Math.min(selectedResult, Math.max(0, matches.length - 1));
  appResults.innerHTML = matches.map((app, index) => `<button class="launcher-result ${index === selectedResult ? 'active' : ''}" data-result="${app.id}"><span class="result-icon">${iconSvg(app.icon)}</span><span><b>${app.name}</b><small>${app.desc}</small></span><kbd>↵</kbd></button>`).join('') || `<p class="no-results">${getLocale(currentLanguage).noApplications}</p>`;
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
  document.querySelector('#clock').textContent = new Intl.DateTimeFormat(currentLanguage, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
}
function updateEditorMode(message = '') {
  const mode = document.querySelector('#editorMode');
  const status = document.querySelector('#editorStatus');
  const locale = getLocale(currentLanguage);
  if (mode) mode.textContent = `-- ${editorState?.mode === 'insert' ? locale.editorInsert : editorState?.mode === 'command' ? locale.editorCommand : locale.editorNormal} --`;
  if (status) status.textContent = message;
  const textarea = document.querySelector('#editorText');
  if (textarea) textarea.readOnly = editorState?.mode !== 'insert';
}
function saveEditorFile() {
  if (!editorState) return;
  const draft = document.querySelector('#editorText')?.value ?? editorState.content;
  if (containsHtmlMarkup(draft)) {
    updateEditorMode(getLocale(currentLanguage).saveNotAllowed);
    return false;
  }
  editorState.content = draft;
  editorFiles.set(editorState.filename, editorState.content);
  editorState.mode = 'normal';
  updateEditorMode(`"${editorState.filename}" ${getLocale(currentLanguage).editorWritten}`);
  return true;
}
function openEditor(filename) {
  const validFiles = [...editorFiles.keys()];
  const locale = getLocale(currentLanguage);
  if (!filename) return `${locale.editorUsage} ${validFiles.join(', ')}`;
  if (!editorFiles.has(filename)) return `${locale.fileNotFound}: ${filename}\n${locale.available}: ${validFiles.join(', ')}`;
  editorState = { filename, content: editorFiles.get(filename), mode: 'normal' };
  document.querySelector('#terminalInput').disabled = true;
  document.querySelector('#terminalForm').hidden = true;
  const output = document.querySelector('#terminalOutput');
  output.innerHTML = `<section class="vim-editor"><header class="vim-title">"${filename}" · ${locale.editorBuffer}</header><textarea id="editorText" aria-label="${locale.editorContent}" spellcheck="false" readonly>${editorState.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea><footer class="vim-status"><span id="editorMode">-- ${locale.editorNormal} --</span><span id="editorStatus">${locale.editorHelp}</span></footer><form class="vim-command" id="editorCommandForm"><span>:</span><input id="editorCommand" aria-label="${locale.editorCommandInput}" autocomplete="off" hidden/></form></section>`;
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
  return `${locale.openingEditor} ${filename} in Neovim…`;
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
async function askGeminiFromTerminal(question, responseElement, historyEntry) {
  try {
    const result = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history: terminalAiHistory.slice(-10) }),
    });
    const contentType = result.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error(getLocale(currentLanguage).assistantUnavailable);
    const payload = await result.json();
    if (!result.ok) throw new Error(payload.error || getLocale(currentLanguage).geminiError);
    const answer = String(payload.answer || '').trim();
    if (!answer) throw new Error(getLocale(currentLanguage).blankResponse);
    terminalAiHistory.push({ role: 'user', content: question }, { role: 'assistant', content: answer });
    terminalAiHistory.splice(0, terminalAiHistory.length - 10);
    historyEntry.response = answer;
    responseElement.textContent = answer;
  } catch (error) {
    historyEntry.response = error.message || getLocale(currentLanguage).geminiError;
    historyEntry.error = true;
    responseElement.classList.add('error');
    responseElement.textContent = historyEntry.response;
  }
  const output = document.querySelector('#terminalOutput');
  if (output) output.scrollTop = output.scrollHeight;
}
  updateClock();
setInterval(updateClock, 15000);

const commands = {
  help: () => getLocale(currentLanguage).termHelp,
  pwd: () => '/home/franklin/portfolio',
  uname: (args) => args.includes('-a') ? `Linux arch 6.12.8-arch1-1 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux (${getLocale(currentLanguage).simulated})` : 'Linux',
  fastfetch: () => { const t = getLocale(currentLanguage); return ` ${profile.name}\nOS: Arch Linux (${t.simulated})\nHost: ${t.personalPortfolio}\nKernel: 6.12.8-arch1-1\nShell: zsh ${t.shell}\nWM: ${t.desktopEnvironment}`; },
  cal: () => new Intl.DateTimeFormat(getLocale(currentLanguage).calendarLocale, { month: 'long', year: 'numeric' }).format(new Date()),
  history: () => terminalCommandHistory.map((item, index) => ` ${index + 1}  ${item}`).join('\n') || getLocale(currentLanguage).emptyTerminalHistory,
  pacman: (args) => { const t = getLocale(currentLanguage); return args[0] === '-Ss' ? `repository/archlinux-portfolio 1.0-1\n    ${t.personalPortfolio}\n\n${t.packageDemo}` : `pacman (${t.simulated}): pacman -Ss <package> ${t.packageSearchHint}`; },
  yay: (args) => { const t = getLocale(currentLanguage); return args[0] === '-Ss' ? `aur/archlinux-portfolio 1.0-1\n    ${t.personalPortfolio}\n\n yay ${t.packageDemoMode}` : `yay (${t.simulated}): yay -Ss <package> ${t.packageSearchHint}`; },
  systemctl: (args) => { const t = getLocale(currentLanguage); return args[0] === 'status' ? `● portfolio-desktop.service - ${t.appTitle}\n   ${t.activeStatus}: ${t.runningStatus}\n   ${t.mainPid}: ${Math.floor(performance.now())}\n   ${t.cgroup}: /user.slice/portfolio` : `systemctl (${t.simulated}): systemctl status`; },
  ask: (args) => {
    const question = args.join(' ').trim();
    const t = getLocale(currentLanguage);
    if (args[0] === '--help' || args[0] === '-h') return `${t.askUsage}\n\n${t.askHelpText}\n${t.askExample}\n${t.openAssistantNoQuestion}`;
    if (!question) return { message: t.opensAssistant, action: () => openApp('assistant') };
    return {
      message: t.askingGemini,
      action: (responseElement, historyEntry) => askGeminiFromTerminal(question, responseElement, historyEntry),
    };
  },
  spotify: (args) => {
    const t = getLocale(currentLanguage);
    if (args[0] === '--help' || args[0] === '-h') return `${t.spotifyUsage}\n\n${t.openSpotify}\n\n${t.availableOptions}:\n  --help, -h       ${t.showHelp}\n  sanctuary ship   ${t.loadSanctuary}\n  lofi girl        ${t.loadLofi}\n\n${t.examples}:\n  spotify\n  spotify sanctuary ship\n  spotify lofi girl`;
    const query = args.join(' ').trim();
    const target = query.toLowerCase();
    const uri = target === 'sanctuary ship' || target === 'nujabes sanctuary ship'
      ? 'https://www.youtube.com/watch?v=f6jBSMP7uc8&t=1233s'
      : target === 'lofi girl' || target === 'lofi girl hip hop'
        ? 'spotify:playlist:0vvXsWCC9xrXsKd4FyS8kM'
        : '';
    if (uri) spotifyUrl = normalizeSpotifyUrl(uri);
    else if (query) return `${t.unknownOption}: ${query}. ${t.spotifyHelpHint}`;
    return { message: `${t.openingSpotify}${query ? `: ${query}` : ` ${t.inPortfolio}`}…`, action: () => openApp('spotify') };
  },
  browser: (args) => {
    const url = normalizeBrowserUrl(args.join(' '));
    if (url === null) return getLocale(currentLanguage).invalidBrowserCommand;
    browserUrl = url === 'about:blank' ? '' : url;
    return { message: `${getLocale(currentLanguage).openingBrowser}${browserUrl ? ` ${browserUrl}` : ''}…`, action: () => openApp('browser') };
  },
  wallpaper: (args) => {
    const t = getLocale(currentLanguage);
    if (args[0] === '--help' || args[0] === '-h') return `${t.wallpaperUsageText}\n\n${t.wallpaperHelpText}\n\n${t.availableOptions}:\n  sakura    ${t.themeSakura}\n  koi       ${t.themeKoi}\n  ukiyo-e   ${t.themeUkiyo}\n  tokyo     ${t.themeTokyo}\n  --help    ${t.showHelp}\n\n${t.currentWallpaperLabel}\n${t.exampleLabel}: wallpaper tokyo`;
    return args[0] ? setWallpaper(args[0].toLowerCase()) : `${t.currentWallpaperLabel}: ${wallpaper.dataset.wallpaper || 'sakura'}\n${t.wallpaperOptions}: ${wallpapers.join(', ')}\n${t.wallpaperUsage}`;
  },
  nvim: (args) => ({ message: openEditor(args[0]) }),
  ls: () => apps.map((app) => `${app.id}/`).join('    '),
  apps: () => apps.map((app) => { const localized = localizedApp(app); return `  ${app.id.padEnd(12)} ${localized.name} — ${localized.desc}`; }).join('\n'),
  workspaces: () => [1, 2, 3, 4].map((workspace) => {
    const visible = [...windowState.values()].filter((item) => item.workspace === workspace).map((item) => {
      const name = localizedApp(apps.find((app) => app.id === item.id) || { id: '', name: '' }).name;
      return `${name}${item.minimized ? ` (${getLocale(currentLanguage).workspaceMinimized})` : ''}`;
    });
    const label = workspace === activeWorkspace ? ` (${getLocale(currentLanguage).workspaceActive})` : '';
    return `${workspace}${label}: ${visible.length ? visible.join(', ') : getLocale(currentLanguage).workspaceEmpty}`;
  }).join('\n'),
  workspace: (args) => {
    const workspace = Number(args[0]);
    if (![1, 2, 3, 4].includes(workspace)) return getLocale(currentLanguage).usageWorkspace;
    return { message: `${getLocale(currentLanguage).switchingWorkspace} ${workspace}…`, action: () => switchWorkspace(workspace) };
  },
  windows: () => {
    const opened = [...windowState.values()].map((item) => `${localizedApp(apps.find((app) => app.id === item.id) || { id: '', name: '' }).name} · ${getLocale(currentLanguage).workspaceLabel} ${item.workspace}${item.minimized ? ` · ${getLocale(currentLanguage).workspaceMinimized}` : ''}`);
    return opened.length ? opened.join('\n') : getLocale(currentLanguage).noOpenWindows;
  },
  open: (args) => {
    const query = args.join(' ').toLowerCase();
    const target = apps.find((app) => app.id === query || app.name.toLowerCase() === query || localizedApp(app).name.toLowerCase() === query);
    if (!target) return { message: `${getLocale(currentLanguage).appNotFoundFor}: ${query || getLocale(currentLanguage).emptyValue}. ${getLocale(currentLanguage).useApps}` };
    if (target.external) return { message: `${localizedApp(target).name}: ${profile.github}\n${getLocale(currentLanguage).externalOpen}` };
    return { message: `${getLocale(currentLanguage).appOpening} ${localizedApp(target).name}…`, action: () => openApp(target.id) };
  },
  about: () => getLocale(currentLanguage).aboutBio,
  projects: () => projects.length ? projects.map((project) => `• ${project.name}`).join('\n') : getLocale(currentLanguage).noProjects,
  skills: () => skills.length ? skills.join(' · ') : getLocale(currentLanguage).noSkills,
  github: () => ({ message: getLocale(currentLanguage).openingGitHub, action: () => openApp('github') }),
  contact: () => getLocale(currentLanguage).noContactDetails,
  neofetch: () => `      /\\         ${profile.name}\n     /  \\        ${localizedProfile().role}\n    /\\   \\       OS: Arch Linux (${getLocale(currentLanguage).simulated})\n   /      \\      Shell: web-terminal\n  /   ,,   \\     WM: ${getLocale(currentLanguage).desktopEnvironment}\n /   |  |   \\    Browser: ${navigator.userAgent.split(' ').slice(-1)[0]}`,
  date: () => new Date().toLocaleString(currentLanguage),
  whoami: () => `${profile.name} · ${localizedProfile().role}`,
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
  suggestion.title = candidate ? `${getLocale(currentLanguage).suggestionLabel} ${completionIndex + 1}/${completionMatches.length}: ${candidate}` : '';
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
    response.textContent = getLocale(currentLanguage).blockedTerminalInput;
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
  const locale = getLocale(currentLanguage);
  let result = run ? run(args) : `${locale.commandNotFound}: ${commandName}.${suggestion ? `\n${locale.didYouMean} '${suggestion}${args.length ? ` ${args.join(' ')}` : ''}'?` : ` ${locale.typeHelpCommand}`}`;
  const action = result && typeof result === 'object' ? result.action : null;
  const responseText = result && typeof result === 'object' ? result.message : result;
  const isError = !run || (typeof responseText === 'string' && responseText.startsWith('Application not found:'));
  let responseElement = null;
  if (responseText) {
    const response = document.createElement('pre');
    response.className = `command-response${isError ? ' error' : ''}`;
    response.textContent = responseText;
    entry.append(response);
    responseElement = response;
  }
  const historyEntry = { command, response: responseText || '', error: isError, known: Boolean(run) };
  terminalHistory.push(historyEntry);
  output.append(event.target);
  output.scrollTop = output.scrollHeight;

  if (action) action(responseElement, historyEntry);
  if (!editorState) focusTerminalPrompt();
});

render();
openWindow('about');
