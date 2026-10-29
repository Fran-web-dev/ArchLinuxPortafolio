export const apps = [
  { id: 'about', name: 'About Me', icon: 'user', desc: 'Identity & profile', workspace: 1 },
  { id: 'contact', name: 'Contact Me', icon: 'mail', desc: 'Get in touch', workspace: 4 },
  { id: 'github', name: 'GitHub', icon: 'github', desc: 'Profile & repositories', workspace: 3 },
  { id: 'projects', name: 'Projects', icon: 'folder', desc: 'Selected work', workspace: 2 },
  { id: 'resume', name: 'CV', icon: 'file', desc: 'Curriculum vitae', workspace: 4 },
  { id: 'skills', name: 'Skills', icon: 'code', desc: 'Tools & technologies', workspace: 4 },
  { id: 'terminal', name: 'Terminal', icon: 'terminal', desc: 'Kitty shell simulator', workspace: 1 },
  { id: 'assistant', name: 'Portfolio AI', icon: 'sparkles', desc: 'Ask about the portfolio', workspace: 1 },
  { id: 'browser', name: 'Browser', icon: 'browser', desc: 'Web browsing', workspace: 3 },
  { id: 'vscode', name: 'VS Code', icon: 'vscode', desc: 'Code editor & projects', workspace: 3 },
  { id: 'spotify', name: 'Spotify', icon: 'spotify', desc: 'Music player', workspace: 3, terminalOnly: true },
];

// Verified from the portfolio project at D:/Escritorio/Proyects/portfolio/cv.json.
export const projects = [
  { name: 'JobTracker', description: 'Aplicación para gestionar procesos de selección, candidatos y vacantes.', status: 'En desarrollo', technologies: ['React', 'JavaScript', 'Tailwind CSS', 'MongoDB', 'Prisma'], demo: 'https://talentflowatss.netlify.app/login', repo: 'https://github.com/Fran-web-dev/jobTracker' },
  { name: 'List Of Books', description: 'Explora y organiza libros por género con filtros y contadores dinámicos.', status: 'Publicado', technologies: ['React', 'JavaScript', 'Tailwind CSS', 'Jest'], demo: 'https://listsofbooks.netlify.app/', repo: 'https://github.com/Fran-web-dev/ListOfBooks' },
  { name: 'Blog personal', description: 'Blog con editor Markdown, categorías y funciones para interactuar con publicaciones.', status: 'En desarrollo', technologies: ['React', 'Vite', 'TypeScript'], demo: 'https://bitacorablogpersonal.netlify.app/#/', repo: 'https://github.com/Fran-web-dev/Blog' },
  { name: 'iPhone 15', description: 'Landing page responsiva inspirada en iPhone 15 Pro, diseñada desde cero.', status: 'Publicado', technologies: ['React', 'JavaScript', 'Tailwind CSS'], demo: 'https://iphone15p.netlify.app/', repo: 'https://github.com/Fran-web-dev/Iphone-15-pro' },
];
// Skills listed on the published portfolio, plus tools demonstrated in project stacks.
export const skills = ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Astro', 'Tailwind CSS', 'Node.js', 'Git', 'GitHub', 'Vite', 'MongoDB', 'Prisma ORM', 'Jest JS'];
export const profile = {
  name: 'Franklin Villanueva',
  role: 'Frontend Developer',
  github: 'https://github.com/Fran-web-dev',
  email: 'franklinevillanueva4@gmail.com',
  website: 'https://fran-web-dev.github.io',
  linkedin: 'https://linkedin.com/in/franklin-villanueva',
};
export const aboutText = 'Soy desarrollador frontend enfocado en crear interfaces web modernas, intuitivas y responsivas. Trabajo con React, TypeScript y Tailwind CSS, desarrollando proyectos que combinan una buena experiencia de usuario con código mantenible. Me interesa seguir aprendiendo, colaborar en proyectos de código abierto y construir soluciones que resuelvan problemas reales. Soy de Honduras.';
export const interests = ['Frontend Development', 'React', 'TypeScript', 'UI Engineering', 'Web Development', 'Open Source', 'Honduras'];
export const experience = [
  { organization: 'Hoppscotch', period: 'Ene 2025 – Actual', description: 'Colaboración en un issue relacionado con la sincronización del estado en el frontend, con enfoque en la consistencia del comportamiento de la interfaz y la mantenibilidad del código.', url: 'https://github.com/hoppscotch/hoppscotch/issues/5754' },
];
export const education = [
  { institution: 'ITR', period: '2025 – 2027', program: 'Técnico en Desarrollo de Software' },
];
