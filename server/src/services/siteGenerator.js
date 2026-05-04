import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const presets = {
  Minimalist: { mode: 'light', bg: '#f5f7fb', surface: '#ffffff', muted: '#edf3ff', line: '#d8deea', ink: '#111827' },
  Tech: { mode: 'dark', bg: '#171a21', surface: '#252832', muted: '#12345c', line: '#3a3f4d', ink: '#f8fafc' },
  Creative: { mode: 'editorial', bg: '#eef2f8', surface: '#ffffff', muted: '#f1f4ff', line: '#dbe3f0', ink: '#101214' },
  Studio: { mode: 'studio', bg: '#f8f1eb', surface: '#ffffff', muted: '#f2e9e3', line: '#d7c6bd', ink: '#241b16' },
  Launch: { mode: 'launch', bg: '#070b16', surface: '#111827', muted: '#111a2a', line: '#2e4a7d', ink: '#eef2ff' },
  Lens: { mode: 'lens', bg: '#fbfdff', surface: '#ffffff', muted: '#eef6fb', line: '#d6e2ea', ink: '#17212e' },
  Horizon: { mode: 'horizon', bg: '#f4f7fc', surface: '#ffffff', muted: '#e6eef7', line: '#cad4e5', ink: '#0f172a' }
};

export function buildSiteArchive(payload) {
  const files = buildSiteFiles(payload);
  const zip = new AdmZip();
  Object.entries(files).forEach(([path, content]) => zip.addFile(path, Buffer.from(content)));
  return zip.toBuffer();
}

export function buildSiteFiles({ data = {}, theme = {}, inputs = {} }) {
  return {
    'index.html': renderHtml({ data, theme, inputs }),
    'assets/styles.css': renderCss(theme),
    'logo.png': getLogoFile()
  };
}

function renderHtml({ data, theme, inputs }) {
  const preset = presets[theme.preset] || presets.Minimalist;
  const projects = inputs.highlightedProjects?.length
    ? (data.projects || []).filter((project) => inputs.highlightedProjects.includes(project.title))
    : data.projects || [];
  const title = inputs.preferredTitle || data.title || 'Portfolio Professional';
  const bio = inputs.bioOverride || data.bio || `${data.name || 'I'} creates focused digital work with a practical blend of craft, engineering, and product thinking.`;
  const heroImage = inputs.heroImage || data.heroImage || '';
  const hasSkills = (data.skills || []).length > 0;
  const hasProjects = projects.length > 0;
  const hasExperience = (data.experience || []).length > 0;
  const hasEducation = (data.education || []).length > 0;
  const socials = inputs.socials || {};
  const hasContact = Object.values(socials).some(Boolean);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.name || 'Portfolio')} | Portfolio Cart</title>
  <link rel="icon" href="/logo.png" type="image/x-icon">
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body class="${preset.mode}">
  <header class="topbar">
    <a class="brand" href="#home">${escapeHtml(data.name || 'Portfolio')}</a>
    <nav>
      ${hasProjects ? '<a href="#work">Work</a>' : ''}
      ${hasSkills ? '<a href="#skills">Skills</a>' : ''}
      ${hasExperience ? '<a href="#experience">Experience</a>' : ''}
      ${hasContact ? '<a href="#contact">Contact</a>' : ''}
    </nav>
  </header>
  <aside class="rail">
    <strong>${initials(data.name)}</strong>
    <a href="#home" aria-label="Home">${icon('compass')}</a>
    <a href="#work" aria-label="Work">${icon('briefcase')}</a>
    <a href="#skills" aria-label="Skills">${icon('terminal')}</a>
    <a href="#contact" aria-label="Contact">${icon('mail')}</a>
  </aside>
  <main>
    <section id="home" class="hero">
      <div class="heroCopy">
        <span class="badge">${escapeHtml(title)}</span>
        <h1>${heroTitle(data.name, theme.preset)}</h1>
        <p>${escapeHtml(bio)}</p>
        <div class="actions">
          ${socialLinks(socials)}
          ${hasProjects ? '<a class="secondary" href="#work">View Work</a>' : ''}
        </div>
      </div>
      <div class="heroPanel" aria-hidden="true">
        ${heroImage ? `<div class="heroVisual"><img src="${escapeHtml(heroImage)}" alt="${escapeHtml(data.name || 'Portfolio image')}" /></div>` : `<div class="windowDots"><span></span><span></span><span></span></div>
        <pre>${theme.preset === 'Tech' ? 'const developer = {' : 'const profile = {'}
  name: "${escapeJs(data.name || 'Your Name')}",
  role: "${escapeJs(title)}",
  focus: ["${escapeJs((data.skills || [])[0] || 'Product')}", "${escapeJs((data.skills || [])[1] || 'Engineering')}"]
}</pre>`}
      </div>
    </section>

    ${hasSkills ? `<section id="skills" class="splitSection">
      <div>
        <p class="eyebrow">Capabilities</p>
        <h2>${theme.preset === 'Tech' ? 'Toolkit' : 'Technical Proficiencies'}</h2>
        <div class="meters">${(data.skills || []).slice(0, 4).map(renderMeter).join('')}</div>
      </div>
      <div class="skillGrid">${(data.skills || []).slice(0, 8).map(renderSkillCard).join('')}</div>
    </section>` : ''}

    ${hasProjects ? `<section id="work">
      <div class="sectionHead">
        <div>
          <p class="eyebrow">Selected Work</p>
          <h2>${theme.preset === 'Creative' ? 'Featured Work' : 'Project Timeline'}</h2>
        </div>
        <span>${projects.length || 0} highlighted projects</span>
      </div>
      <div class="timeline">${projects.map(renderProject).join('')}</div>
    </section>` : ''}

    ${hasExperience ? `<section id="experience" class="splitSection">
      <div>
        <p class="eyebrow">Background</p>
        <h2>Experience</h2>
      </div>
      <div>${(data.experience || []).map(renderExperience).join('')}</div>
    </section>` : ''}

    ${hasEducation ? `<section class="splitSection">
      <div>
        <p class="eyebrow">Education</p>
        <h2>Foundation</h2>
      </div>
      <div class="cardGrid">${(data.education || []).map(renderEducation).join('')}</div>
    </section>` : ''}

    ${hasContact ? `<section id="contact" class="contact">
      <div>
        <p class="eyebrow">Contact</p>
        <h2>Let's work together.</h2>
        <p>${contactLines(socials)}</p>
      </div>
      <div class="contactCard">
        ${icon('mail')}
        <strong>Start a conversation</strong>
        <div class="actions">${socialLinks(socials)}</div>
      </div>
    </section>` : ''}
  </main>
  <footer>Generated with PortfolioCraft. Precise. Empowering. Sophisticated.</footer>
</body>
</html>`;
}

function renderCss(theme) {
  const preset = presets[theme.preset] || presets.Minimalist;
  const font = theme.font || 'Inter, system-ui, sans-serif';
  return `:root {
  --primary: ${theme.primary || '#0b63ce'};
  --secondary: ${theme.secondary || '#b9d7ff'};
  --text: ${theme.text || preset.ink};
  --bg: ${preset.bg};
  --surface: ${preset.surface};
  --muted: ${preset.muted};
  --line: ${preset.line};
  --shadow: 0 22px 60px rgba(18, 29, 54, .12);
  font-family: ${font};
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--text); line-height: 1.6; }
a { color: inherit; text-decoration: none; }
.topbar { position: sticky; top: 0; z-index: 5; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; background: color-mix(in srgb, var(--surface), transparent 4%); border-bottom: 1px solid var(--line); backdrop-filter: blur(16px); }
.brand { font-weight: 900; font-size: 20px; }
nav { display: flex; gap: 28px; font-size: 14px; }
nav a:first-child { color: var(--primary); border-bottom: 2px solid var(--primary); }
.rail { position: fixed; top: 64px; bottom: 0; left: 0; width: 76px; display: grid; align-content: start; justify-items: center; gap: 24px; padding-top: 22px; background: color-mix(in srgb, var(--surface), var(--bg) 30%); border-right: 1px solid var(--line); }
.rail strong, .rail a { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 8px; background: var(--muted); color: var(--primary); font-size: 12px; }
.rail svg { width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 2; }
main { width: min(1080px, calc(100% - 64px)); margin: 0 auto; padding: 0 24px; }
section { padding: 76px 0; }
.hero { min-height: calc(100vh - 64px); display: grid; grid-template-columns: minmax(0, 1fr) 440px; align-items: center; gap: 58px; }
.badge { display: inline-flex; padding: 5px 14px; border-radius: 999px; background: var(--secondary); color: color-mix(in srgb, var(--primary), black 12%); font-weight: 800; letter-spacing: .08em; text-transform: uppercase; font-size: 12px; }
h1, h2, h3 { letter-spacing: 0; line-height: 1.05; margin: 0; }
h1 { max-width: 760px; margin-top: 22px; font-size: clamp(48px, 8vw, 86px); font-family: Georgia, serif; }
h2 { font-size: clamp(34px, 5vw, 48px); font-family: Georgia, serif; }
h3 { font-size: 24px; }
.heroCopy p, .contact p { max-width: 720px; font-size: 20px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 26px; }
.actions a { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 22px; border-radius: 8px; background: var(--primary); color: white; font-weight: 800; }
.actions .secondary, .actions a:nth-child(n+2) { background: transparent; color: var(--text); border: 1px solid var(--line); }
  .heroPanel { border: 1px solid color-mix(in srgb, var(--primary), transparent 55%); border-radius: 12px; background: color-mix(in srgb, var(--surface), var(--bg) 22%); box-shadow: var(--shadow); overflow: hidden; width: 100%; max-width: 520px; margin-left: auto; }
  .heroVisual { width: 100%; height: min(520px, 55vh); overflow: hidden; border-radius: 24px; }
  .heroVisual img { width: 100%; height: 100%; object-fit: cover; display: block; }
.windowDots { display: flex; gap: 8px; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.windowDots span { width: 12px; height: 12px; border-radius: 50%; background: var(--primary); }
.windowDots span:nth-child(2) { background: var(--secondary); }
.windowDots span:nth-child(3) { background: #28c76f; }
pre { margin: 0; padding: 28px; overflow: auto; font-size: 15px; color: var(--text); }
.splitSection { display: grid; grid-template-columns: 320px 1fr; gap: 42px; align-items: start; border-top: 1px solid var(--line); }
.eyebrow { margin: 0 0 12px; color: var(--primary); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .14em; }
.meters { display: grid; gap: 22px; margin-top: 34px; }
.meterHead { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; }
.bar { height: 6px; margin-top: 10px; border-radius: 999px; background: color-mix(in srgb, var(--text), transparent 88%); overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--primary); }
.skillGrid, .cardGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.skillCard, .project, .experience, .education, .contactCard { border: 1px solid var(--line); border-radius: 12px; background: color-mix(in srgb, var(--surface), transparent 3%); box-shadow: 0 1px 0 rgba(10, 20, 40, .03); }
.skillCard { min-height: 132px; padding: 24px; display: grid; align-content: space-between; }
.skillCard svg, .contactCard svg { width: 24px; height: 24px; stroke: var(--primary); fill: none; stroke-width: 2; }
.sectionHead { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 34px; border-bottom: 1px solid var(--line); padding-bottom: 18px; }
.sectionHead span { color: var(--primary); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
.timeline { display: grid; gap: 28px; position: relative; }
.project { padding: 30px; display: grid; grid-template-columns: 1fr 240px; gap: 24px; }
.projectVisual { min-height: 190px; border-radius: 10px; background: linear-gradient(135deg, color-mix(in srgb, var(--primary), black 15%), color-mix(in srgb, var(--secondary), white 12%)); display: grid; place-items: center; color: white; }
.projectVisual svg { width: 72px; height: 72px; stroke: currentColor; fill: none; stroke-width: 1.5; }
.project-stack { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 10px; }
.tech-tag { background: rgba(255, 255, 255, 0.18); padding: 8px 12px; border-radius: 10px; font-size: 13px; font-weight: 700; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.tags span { padding: 5px 9px; border-radius: 6px; background: var(--muted); color: var(--primary); font-size: 12px; font-weight: 800; }
ul { padding-left: 18px; }
.experience, .education { padding: 24px; margin-bottom: 14px; }
.contact { display: grid; grid-template-columns: 1fr 360px; gap: 44px; align-items: center; border-top: 1px solid var(--line); }
.contactCard { padding: 28px; }
footer { margin-left: 76px; padding: 32px; border-top: 1px solid var(--line); color: color-mix(in srgb, var(--text), transparent 42%); font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
.dark { --shadow: 0 24px 70px rgba(0,0,0,.35); }
.editorial h1 { text-align: center; margin-left: auto; margin-right: auto; }
.editorial .hero { grid-template-columns: 1fr; text-align: center; min-height: 70vh; }
.editorial .heroPanel { display: none; }
.editorial .actions { justify-content: center; }
.studio .hero { grid-template-columns: minmax(0, 1fr) 420px; }
.studio .heroPanel { border-radius: 24px; overflow: hidden; }
.studio .heroPanel img { width: 100%; height: 100%; object-fit: cover; display: block; }
.launch { background: radial-gradient(circle at top left, rgba(75, 117, 255, .18), transparent 28%), var(--bg); }
.launch .hero { min-height: calc(100vh - 64px); align-items: center; }
.launch .heroCopy h1 { font-size: clamp(54px, 10vw, 96px); }
.launch .heroPanel { padding: 0; background: transparent; box-shadow: none; border: none; }
.launch .heroVisual { border-radius: 24px; overflow: hidden; box-shadow: 0 38px 90px rgba(0, 0, 0, .16); }
.launch .heroPanel img { width: 100%; height: 100%; object-fit: cover; }
.lens .hero { text-align: center; grid-template-columns: 1fr; min-height: 72vh; }
.lens .heroPanel { margin: 40px auto 0; width: min(560px, 100%); border-radius: 30px; padding: 0; background: rgba(255,255,255,.9); backdrop-filter: blur(18px); border: 1px solid rgba(255,255,255,.6); }
.lens .heroVisual img { width: 100%; display: block; height: 100%; object-fit: cover; }
.horizon .hero { grid-template-columns: 1fr 440px; min-height: 92vh; }
.horizon .heroPanel { border-radius: 20px; overflow: hidden; }
.horizon .heroPanel img { width: 100%; height: 100%; object-fit: cover; }
@media (max-width: 860px) {
  .topbar { padding: 0 18px; }
  nav { display: none; }
  .rail { display: none; }
  main { width: min(100% - 40px, 720px); margin: 0 auto; }
  .hero, .splitSection, .project, .contact { grid-template-columns: 1fr; }
  .hero { gap: 32px; }
  .heroPanel { width: 100%; max-width: 100%; margin-left: 0; }
  .heroVisual { height: 320px; }
  .skillGrid, .cardGrid { grid-template-columns: 1fr; }
  .actions { justify-content: stretch; }
  .actions a { width: 100%; justify-content: center; }
  footer { margin-left: 0; }
}

@media (max-width: 520px) {
  .topbar { padding: 0 14px; }
  .hero { gap: 24px; }
  .heroCopy p, .contact p { font-size: 18px; }
  .project { padding: 22px; }
  .projectVisual { min-height: 150px; }
  .heroVisual { height: 260px; }
  .tags, .actions { gap: 10px; }
}

`;
}

function heroTitle(name, preset) {
  const safeName = escapeHtml(name || 'Thoughtful Portfolio');
  if (preset === 'Tech') return `Building systems with <span>clarity</span>.`;
  if (preset === 'Creative') return `The Art of<br><em>${safeName}</em>.`;
  if (preset === 'Studio') return `Studio-ready work with polished presence.`;
  if (preset === 'Launch') return `Launching bold product and portfolio stories.`;
  if (preset === 'Lens') return `Crystal clear narratives that scale.`;
  if (preset === 'Horizon') return `Fresh horizons for modern digital tales.`;
  return safeName;
}

function renderMeter(skill, index) {
  const score = 95 - index * 6;
  return `<div><div class="meterHead"><span>${escapeHtml(skill)}</span><span>${score}%</span></div><div class="bar"><span style="width:${score}%"></span></div></div>`;
}

function renderSkillCard(skill, index) {
  return `<article class="skillCard">${icon(index % 2 ? 'database' : 'terminal')}<strong>${escapeHtml(skill)}</strong><span>Applied across production work, projects, and portfolio-ready outcomes.</span></article>`;
}

function renderProject(project, index) {
  const tags = [project.organization, project.period].filter(Boolean).concat((project.bullets || []).slice(0, 1).flatMap((bullet) => bullet.split(/\s+/).slice(0, 2)));
  const techStack = (project.technologies || []).slice(0, 4).map((tech) => `<span class="tech-tag">${escapeHtml(tech)}</span>`).join('');
  return `<article class="project">
    <div>
      <p class="eyebrow">${escapeHtml(project.period || `Project ${index + 1}`)}</p>
      <h3>${escapeHtml(project.title || 'Featured Project')}</h3>
      <p>${escapeHtml(project.organization || (project.bullets || [])[0] || 'A focused project built to demonstrate meaningful product thinking.')}</p>
      <ul>${(project.bullets || []).slice(0, 3).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
      <div class="project-stack">${techStack}</div>
      <div class="tags">${tags.slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    </div>
    <div class="projectVisual">${icon(index % 2 ? 'network' : 'briefcase')}</div>
  </article>`;
}

function renderExperience(job) {
  return `<article class="experience"><p class="eyebrow">${escapeHtml(job.period || 'Experience')}</p><h3>${escapeHtml(job.title || 'Role')}</h3><ul>${(job.bullets || []).slice(0, 4).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul></article>`;
}

function renderEducation(item) {
  return `<article class="education"><p class="eyebrow">${escapeHtml(item.period || 'Education')}</p><h3>${escapeHtml(item.school || '')}</h3><p>${escapeHtml(item.degree || '')}</p></article>`;
}

function emptyCard(message) {
  return `<article class="experience"><p>${escapeHtml(message)}</p></article>`;
}

function socialLinks(socials) {
  const entries = Object.entries(socials).filter(([, value]) => value);
  if (!entries.length) return '<a href="#contact">Contact Me</a>';

  return entries
    .filter(([key]) => !['Phone', 'Location'].includes(key))
    .map(([key, value]) => {
      const href = contactHref(key, value);
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(key)}</a>`;
    })
    .join('');
}

function contactLines(socials) {
  return Object.entries(socials)
    .filter(([, value]) => value)
    .map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(value)}`)
    .join('<br>');
}

function initials(name) {
  return escapeHtml(String(name || 'PC').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PC');
}

function icon(name) {
  const paths = {
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15 9-2.2 5.8L9 16l2.2-5.8L15 9Z"/>',
    briefcase: '<path d="M10 6h4a2 2 0 0 1 2 2v1h4v11H4V9h4V8a2 2 0 0 1 2-2Z"/><path d="M8 9v11M16 9v11M10 6h4"/>',
    terminal: '<path d="m7 8 4 4-4 4"/><path d="M13 16h4"/><rect x="3" y="5" width="18" height="14" rx="2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    database: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    network: '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="m8 11 8-4M8 13l8 4"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.briefcase}</svg>`;
}

function escapeJs(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/javascript:/gi, '');
}

function contactHref(key, value) {
  if (!value) return '#';

  let url = String(value).trim();

  if (key === 'Email') return `mailto:${escapeAttribute(url)}`;
  if (key === 'Phone') return `tel:${escapeAttribute(url)}`;

  // already has protocol
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
    return escapeAttribute(url);
  }

  // allow protocol-relative urls like //example.com
  if (/^\/\//.test(url)) {
    return escapeAttribute(`https:${url}`);
  }

  // force https for domain-only or relative input
  return escapeAttribute(`https://${url.replace(/^\/+/, '')}`);
}

function getLogoFile() {
  // Return the logo.png file content - in a real implementation, you'd read this from disk
  // For now, return a placeholder or read from the client directory
  const fs = require('fs');
  const path = require('path');
  try {
    return fs.readFileSync(path.join(process.cwd(), 'client', 'logo.png'));
  } catch (error) {
    // Return a simple placeholder if file not found
    return Buffer.from('placeholder');
  }
}
