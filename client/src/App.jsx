import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Briefcase,
  Code2,
  Compass,
  Database,
  Download,
  FileText,
  FileUp,
  Github,
  LayoutTemplate,
  Linkedin,
  Mail,
  Palette,
  Rocket,
  Settings,
  Sparkles,
  Wand2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const emptyData = {
  name: '',
  title: '',
  bio: '',
  skills: [],
  experience: [],
  projects: [],
  education: []
};

const defaultTheme = {
  primary: '#075fc7',
  secondary: '#cfe1ff',
  text: '#101827',
  font: 'Inter, system-ui, sans-serif',
  preset: 'Minimalist'
};

const templateOptions = [
  { name: 'Minimalist', icon: Compass, note: 'Clean engineering layout with crisp sections.' },
  { name: 'Tech', icon: Code2, note: 'Dark developer style with terminal-inspired blocks.' },
  { name: 'Creative', icon: Palette, note: 'Editorial composition for design-forward profiles.' },
  { name: 'Studio', icon: Sparkles, note: 'Warm studio-style hero blocks with refined spacing.' },
  { name: 'Launch', icon: Rocket, note: 'Bold landing page energy for modern product stories.' },
  { name: 'Lens', icon: Database, note: 'Glass-like card surfaces and sharp content hierarchy.' },
  { name: 'Horizon', icon: BadgeCheck, note: 'Soft gradients and balanced sections for new brands.' }
];

const presetThemeTokens = {
  Minimalist: { primary: '#075fc7', secondary: '#cfe1ff', text: '#101827' },
  Tech: { primary: '#0b7cff', secondary: '#12345c', text: '#f8fafc' },
  Creative: { primary: '#064fb1', secondary: '#e7edff', text: '#101214' },
  Studio: { primary: '#7d4c33', secondary: '#f6ddcb', text: '#241b16' },
  Launch: { primary: '#6c8cff', secondary: '#16223d', text: '#eef2ff' },
  Lens: { primary: '#0f4f79', secondary: '#c9eafa', text: '#17212e' },
  Horizon: { primary: '#2a5d9f', secondary: '#dbe7f5', text: '#0f172a' }
};

export default function App() {
  const [page, setPage] = useState('home');
  const [data, setData] = useState(emptyData);
  const [rawText, setRawText] = useState('');
  const [theme, setTheme] = useState(defaultTheme);
  const [inputs, setInputs] = useState({
    preferredTitle: '',
    bioOverride: '',
    highlightedProjects: [],
    heroImage: '',
    socials: { GitHub: '', LinkedIn: '', Email: '', Phone: '', Location: '', Website: '' }
  });
  const [status, setStatus] = useState('');
  const [deployUrl, setDeployUrl] = useState('');
  const [siteId, setSiteId] = useState('');

  const previewHtml = useMemo(() => renderPreview(data, theme, inputs), [data, theme, inputs]);

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('Parsing resume with deterministic extraction...');
    const formData = new FormData();
    formData.append('resume', file);
    const response = await fetch(`${API_BASE}/api/resume/upload`, { method: 'POST', body: formData });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Upload failed');
    const nextData = { ...emptyData, ...result.data };
    setData(nextData);
    setInputs((current) => ({
      ...current,
      bioOverride: nextData.bio || current.bioOverride,
      socials: {
        ...current.socials,
        Email: nextData.contact?.email || current.socials.Email,
        Phone: nextData.contact?.phone || current.socials.Phone,
        Location: nextData.contact?.location || current.socials.Location,
        Website: nextData.contact?.website || current.socials.Website,
        GitHub: nextData.contact?.github || current.socials.GitHub,
        LinkedIn: nextData.contact?.linkedin || current.socials.LinkedIn
      }
    }));
    setRawText(result.rawText || '');
    setPage('editor');
    const missingContact = ['Email', 'Phone', 'LinkedIn', 'GitHub'].filter((key) => !({
      Email: nextData.contact?.email,
      Phone: nextData.contact?.phone,
      LinkedIn: nextData.contact?.linkedin,
      GitHub: nextData.contact?.github
    })[key]);
    setStatus(missingContact.length
      ? `Resume parsed with Groq. Add missing contact details if needed: ${missingContact.join(', ')}.`
      : 'Resume parsed with Groq. Review the sections, then publish or export.');
  }

  function uploadHeroImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setInputs((current) => ({ ...current, heroImage: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  async function createBio() {
    setStatus('Generating bio...');
    const result = await postJson('/api/ai/bio', { data, preferredTitle: inputs.preferredTitle, bioOverride: inputs.bioOverride });
    updateData('bio', result.bio);
    setInputs((current) => ({ ...current, bioOverride: result.bio }));
    setStatus('Bio ready.');
  }

  async function downloadSite() {
    setStatus('Generating static site...');
    const response = await fetch(`${API_BASE}/api/generate/site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, theme, inputs })
    });
    if (!response.ok) throw new Error('Could not generate site');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugify(data.name || 'portfolio')}-site.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Static site downloaded.');
  }

  async function deploySite() {
    setStatus(siteId ? 'Updating existing Netlify site...' : 'Creating a fresh Netlify site...');
    const result = await postJson('/api/deploy/netlify', { data, theme, inputs, siteId });
    setDeployUrl(result.url);
    setSiteId(result.siteId);
    setStatus(`Deployment finished as ${result.siteName || 'Netlify site'}.`);
  }

  function updateData(key, value) {
    setData((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="shell">
      <Header page={page} setPage={setPage} onPublish={() => handleAsync(deploySite, null, setStatus)} />
      {page === 'home' && <HomePage onUpload={uploadResume} setPage={setPage} setStatus={setStatus} />}
      {page === 'templates' && <TemplatesPage theme={theme} setTheme={setTheme} setPage={setPage} />}
      {page === 'showcase' && <ShowcasePage />}
      {page === 'pricing' && <PricingPage />}
      {page === 'editor' && (
        <EditorPage
          data={data}
          setData={setData}
          rawText={rawText}
          theme={theme}
          setTheme={setTheme}
          inputs={inputs}
          setInputs={setInputs}
          status={status}
          setStatus={setStatus}
          deployUrl={deployUrl}
          previewHtml={previewHtml}
          onUpload={uploadResume}
          onBio={() => handleAsync(createBio, null, setStatus)}
          onDownload={() => handleAsync(downloadSite, null, setStatus)}
          onDeploy={() => handleAsync(deploySite, null, setStatus)}
          uploadHeroImage={uploadHeroImage}
          updateData={updateData}
        />
      )}
    </div>
  );
}

function Header({ page, setPage, onPublish }) {
  return (
    <header className="appHeader">
      <button className="wordmark" type="button" onClick={() => setPage('home')}>PortfolioCraft</button>
      <nav>
        {[
          ['templates', 'Templates'],
          ['editor', 'Editor'],
          ['showcase', 'Showcase'],
          ['pricing', 'Pricing']
        ].map(([id, label]) => (
          <button key={id} className={page === id ? 'active' : ''} type="button" onClick={() => setPage(id)}>{label}</button>
        ))}
      </nav>
      <div className="headerActions">
        <button type="button" onClick={() => setPage('editor')}>Preview</button>
        <button className="primaryAction" type="button" onClick={onPublish}>Publish</button>
      </div>
    </header>
  );
}

function HomePage({ onUpload, setPage, setStatus }) {
  return (
    <main className="homePage">
      <section className="homeHero">
        <div>
          <span className="pill"><Sparkles size={15} /> Resume to portfolio builder</span>
          <h1>Turn a resume into a polished portfolio with control where it matters.</h1>
          <p>Upload a PDF, review deterministic parsing, enhance selected content with Groq, customize the style, then export or publish a fresh Netlify site.</p>
          <div className="heroActions">
            <label className="primaryUpload"><FileUp size={18} /> Upload Resume<input type="file" accept="application/pdf" onChange={(event) => handleAsync(onUpload, event, setStatus)} /></label>
            <button type="button" onClick={() => setPage('templates')}>Browse Templates</button>
          </div>
        </div>
        <div className="instructionPanel">
          <h2>Build Flow</h2>
          {[
            ['Upload PDF', 'Text is extracted with pdf-parse, then Groq converts it into portfolio JSON.'],
            ['Correct JSON', 'Edit name, title, contact details, skills, projects, experience, education, and links.'],
            ['Enhance Selectively', 'Use Groq for bio, bullets, colors, and layout suggestions.'],
            ['Export or Publish', 'Download a static zip or create a new Netlify site named from the user.']
          ].map(([title, text], index) => (
            <div className="instructionStep" key={title}>
              <span>{index + 1}</span>
              <div><strong>{title}</strong><p>{text}</p></div>
            </div>
          ))}
        </div>
      </section>
      <section className="featureBand">
        <Feature icon={FileText} title="Reliable Parsing" text="AI is not used for core extraction, so demos stay predictable." />
        <Feature icon={LayoutTemplate} title="Fixed Templates" text="Layouts are deterministic, responsive, and theme-variable driven." />
        <Feature icon={Rocket} title="Fresh Deploys" text="Every publish creates a new Netlify site using the portfolio owner name." />
      </section>
    </main>
  );
}

function TemplatesPage({ theme, setTheme, setPage }) {
  return (
    <main className="contentPage">
      <div className="pageHead">
        <p>Template Selector</p>
        <h1>Choose the visual direction before polishing the details.</h1>
      </div>
      <div className="templateGrid">
        {templateOptions.map(({ name, icon: Icon, note }) => (
          <button
            className={`templateCard ${theme.preset === name ? 'selected' : ''} ${name.toLowerCase()}`}
            key={name}
            type="button"
            onClick={() => {
              setTheme((current) => ({ ...current, ...presetThemeTokens[name], preset: name }));
              setPage('editor');
            }}
          >
            <Icon size={24} />
            <strong>{name}</strong>
            <span>{note}</span>
            <div className="miniPreview"><i /><i /><i /></div>
          </button>
        ))}
      </div>
    </main>
  );
}

function ShowcasePage() {
  return (
    <main className="contentPage">
      <div className="pageHead">
        <p>Showcase</p>
        <h1>Portfolio styles built for engineers, designers, and product-minded builders.</h1>
      </div>
      <div className="showcaseGrid">
        {[
          ['Systems Architect', Code2, 'Dark technical narrative with active project cards.'],
          ['Product Designer', Palette, 'Editorial layout with featured work and contact form rhythm.'],
          ['Full Stack Developer', Database, 'Clear skill groups, timeline projects, and deployment-ready sections.']
        ].map(([title, Icon, text]) => <Feature key={title} icon={Icon} title={title} text={text} />)}
      </div>
    </main>
  );
}

function PricingPage() {
  return (
    <main className="contentPage">
  <div className="pageHead">
    <p>Pricing</p>
    <h1>Free Portfolio Access for Everyone</h1>
    <p>
      Build and showcase your professional portfolio at no cost. Simple, reliable, and easy to maintain.
    </p>
  </div>

  <div className="pricingCard">
    <BadgeCheck size={28} />
    <h2>Maintenance Plan</h2>
    
    <p>
      Designed for users who want to keep their portfolio updated without technical effort.
    </p>

    <p>
      This plan includes content updates, minor design adjustments, and basic issue resolution to ensure your site remains current and functional.
    </p>

    <p>
      To request updates or support, email us at{" "}
      <strong>spandix.fit@gmail.com</strong> with your username and website URL.
    </p>
  </div>
</main>
  );
}

function EditorPage(props) {
  const {
    data, rawText, theme, setTheme, inputs, setInputs, status, setStatus, deployUrl,
    previewHtml, onUpload, onBio, onDownload, onDeploy, uploadHeroImage, updateData
  } = props;

  return (
    <div className="editorApp">
      <aside className="editorSidebar">
        <div className="selectorHead">
          <span><LayoutTemplate size={18} /></span>
          <div><strong>Template Selector</strong><small>Switch visual vibe</small></div>
        </div>
        {templateOptions.map(({ name, icon: Icon }) => (
          <button className={theme.preset === name ? 'sideTemplate active' : 'sideTemplate'} key={name} type="button" onClick={() => setTheme((current) => ({ ...current, ...presetThemeTokens[name], preset: name }))}>
            <Icon size={17} /> {name}
          </button>
        ))}
        <button className="customStyles" type="button"><Settings size={15} /> Custom Styles</button>
      </aside>

      <aside className="controlPanel">
        <label className="upload">
          <FileUp size={18} />
          <span>Upload PDF</span>
          <input type="file" accept="application/pdf" onChange={(event) => handleAsync(onUpload, event, setStatus)} />
        </label>

        <Field label="Name" value={data.name} onChange={(value) => updateData('name', value)} />
        <Field label="Preferred role" value={inputs.preferredTitle} onChange={(value) => setInputs((current) => ({ ...current, preferredTitle: value }))} />
        <Field label="Parsed title" value={data.title} onChange={(value) => updateData('title', value)} />
        <Textarea label="Bio override" value={inputs.bioOverride} onChange={(value) => setInputs((current) => ({ ...current, bioOverride: value }))} />
        <label className="field imageUpload">
          <span>Hero image</span>
          <input type="file" accept="image/*" onChange={uploadHeroImage} />
        </label>
        {inputs.heroImage && (
          <div className="imagePreview">
            <img src={inputs.heroImage} alt="Hero preview" />
          </div>
        )}

        <div className="buttonRow">
          <IconButton icon={<Wand2 size={17} />} label="Bio" onClick={onBio} />
        </div>

        <SectionEditor title="Skills" items={data.skills} onChange={(items) => updateData('skills', items)} />
        <EntryEditor title="Projects" items={data.projects} onChange={(items) => updateData('projects', items)} selectable selected={inputs.highlightedProjects} onSelect={(selected) => setInputs((current) => ({ ...current, highlightedProjects: selected }))} />
        <EntryEditor title="Experience" items={data.experience} onChange={(items) => updateData('experience', items)} />
        <EducationEditor items={data.education} onChange={(items) => updateData('education', items)} />
        <ThemePanel theme={theme} onChange={setTheme} />

        <Field label="GitHub" value={inputs.socials.GitHub} onChange={(value) => setInputs((current) => ({ ...current, socials: { ...current.socials, GitHub: value } }))} />
        <Field label="LinkedIn" value={inputs.socials.LinkedIn} onChange={(value) => setInputs((current) => ({ ...current, socials: { ...current.socials, LinkedIn: value } }))} />
        <Field label="Email" value={inputs.socials.Email} onChange={(value) => setInputs((current) => ({ ...current, socials: { ...current.socials, Email: value } }))} />
        <Field label="Phone" value={inputs.socials.Phone} onChange={(value) => setInputs((current) => ({ ...current, socials: { ...current.socials, Phone: value } }))} />
        <Field label="Location" value={inputs.socials.Location} onChange={(value) => setInputs((current) => ({ ...current, socials: { ...current.socials, Location: value } }))} />
        <Field label="Website" value={inputs.socials.Website} onChange={(value) => setInputs((current) => ({ ...current, socials: { ...current.socials, Website: value } }))} />

        <div className="buttonRow">
          <IconButton icon={<Download size={17} />} label="Export" onClick={onDownload} />
          <IconButton icon={<Rocket size={17} />} label="Deploy" onClick={onDeploy} />
        </div>
        {status && <p className="status">{status}</p>}
        {deployUrl && <a className="deployLink" href={deployUrl} target="_blank" rel="noreferrer">{deployUrl}</a>}
        {rawText && <details><summary>Raw extracted text</summary><pre>{rawText}</pre></details>}
      </aside>

      <main className="previewPane">
        <iframe title="Portfolio preview" srcDoc={previewHtml} />
      </main>
    </div>
  );
}

function Feature({ icon: Icon, title, text }) {
  return <article className="featureCard"><Icon size={24} /><h2>{title}</h2><p>{text}</p></article>;
}

function Field({ label, value, onChange }) {
  return <label className="field"><span>{label}</span><input value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Textarea({ label, value, onChange }) {
  return <label className="field"><span>{label}</span><textarea value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

function IconButton({ icon, label, onClick }) {
  return <button type="button" className="iconButton" onClick={onClick} title={label}>{icon}<span>{label}</span></button>;
}

function SectionEditor({ title, items, onChange }) {
  return <section className="panel"><h2>{title}</h2><textarea value={(items || []).join(', ')} onChange={(event) => onChange(event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></section>;
}

function EntryEditor({ title, items = [], onChange, selectable = false, selected = [], onSelect }) {
  const update = (index, key, value) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const updateBullets = (index, value) => update(index, 'bullets', value.split('\n').filter(Boolean));
  const add = () => onChange([...items, { title: '', organization: '', period: '', bullets: [] }]);

  return (
    <section className="panel">
      <div className="panelHeader"><h2>{title}</h2><button type="button" onClick={add}>+</button></div>
      {items.map((item, index) => (
        <div className="entry" key={`${title}-${index}`}>
          {selectable && (
            <label className="check"><input type="checkbox" checked={selected.includes(item.title)} onChange={(event) => {
              const next = event.target.checked ? [...selected, item.title].slice(-3) : selected.filter((value) => value !== item.title);
              onSelect(next);
            }} /> Highlight</label>
          )}
          <input value={item.title || ''} placeholder="Title" onChange={(event) => update(index, 'title', event.target.value)} />
          <input value={item.organization || ''} placeholder="Organization or summary" onChange={(event) => update(index, 'organization', event.target.value)} />
          <input value={item.period || ''} placeholder="Period" onChange={(event) => update(index, 'period', event.target.value)} />
          <textarea value={(item.bullets || []).join('\n')} placeholder="Bullets" onChange={(event) => updateBullets(index, event.target.value)} />
        </div>
      ))}
    </section>
  );
}

function EducationEditor({ items = [], onChange }) {
  const update = (index, key, value) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  return (
    <section className="panel">
      <div className="panelHeader"><h2>Education</h2><button type="button" onClick={() => onChange([...items, { school: '', degree: '', period: '' }])}>+</button></div>
      {items.map((item, index) => (
        <div className="entry" key={`education-${index}`}>
          <input value={item.school || ''} placeholder="School" onChange={(event) => update(index, 'school', event.target.value)} />
          <input value={item.degree || ''} placeholder="Degree" onChange={(event) => update(index, 'degree', event.target.value)} />
          <input value={item.period || ''} placeholder="Period" onChange={(event) => update(index, 'period', event.target.value)} />
        </div>
      ))}
    </section>
  );
}

function ThemePanel({ theme, onChange }) {
  const patch = (key, value) => onChange((current) => ({ ...current, [key]: value }));
  return (
    <section className="panel">
      <h2>Theme</h2>
      <div className="swatches">
        {['primary', 'secondary', 'text'].map((key) => <label key={key} title={key}><input type="color" value={theme[key]} onChange={(event) => patch(key, event.target.value)} /></label>)}
      </div>
      <select value={theme.font} onChange={(event) => patch('font', event.target.value)}>
        <option>Inter, system-ui, sans-serif</option>
        <option>Georgia, serif</option>
        <option>IBM Plex Sans, Arial, sans-serif</option>
      </select>
    </section>
  );
}

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}

async function handleAsync(fn, event, setStatus) {
  try {
    await fn(event);
  } catch (error) {
    setStatus(error.message);
  }
}

function renderPreview(data, theme, inputs) {
  const projects = inputs.highlightedProjects?.length
    ? (data.projects || []).filter((project) => inputs.highlightedProjects.includes(project.title))
    : data.projects || [];
  const bio = inputs.bioOverride || data.bio || 'Upload a resume, correct the extracted content, and generate a stronger portfolio narrative.';
  const preset = theme.preset || 'Minimalist';
  const mode = preset === 'Minimalist' ? 'light'
    : preset === 'Tech' ? 'dark'
    : preset === 'Creative' ? 'editorial'
    : preset === 'Studio' ? 'studio'
    : preset === 'Launch' ? 'launch'
    : preset === 'Lens' ? 'lens'
    : preset === 'Horizon' ? 'horizon'
    : 'light';
  const dark = mode === 'dark' || mode === 'launch';
  const creative = mode === 'editorial';
  const heroImage = inputs.heroImage || data.heroImage || '';
  const hasSkills = (data.skills || []).length > 0;
  const hasProjects = projects.length > 0;
  const hasExperience = (data.experience || []).length > 0;
  const hasEducation = (data.education || []).length > 0;
  const hasContact = Object.values(inputs.socials || {}).some(Boolean);
  const heroPanel = heroImage
    ? `<div class="heroVisual"><img src="${escapeHtml(heroImage)}" alt="${escapeHtml(data.name || 'Portfolio image')}" /></div>`
    : creative
      ? ''
      : `<div class="${dark ? 'terminal' : 'summaryPanel'}">${dark ? `<div class="dots"><i></i><i></i><i></i></div>` : ''}<pre>${dark ? 'developer.json' : 'portfolio.json'}
name: ${escapeHtml(data.name || 'Your Name')}
role: ${escapeHtml(inputs.preferredTitle || data.title || 'Portfolio')}
focus: ${(data.skills || []).slice(0, 4).map(escapeHtml).join(', ') || 'Add skills'}</pre></div>`;
  const contactBlock = hasContact ? `<section id="contact" class="contact"><div><h2>Contact</h2><p>${contactLines(inputs.socials)}</p></div><div class="actions">${socialPreview(inputs.socials)}</div></section>` : '';

  return `<!doctype html><html><head><style>
    :root{--bg:${mode === 'light' ? '#f5f7fb' : mode === 'dark' ? '#171a21' : mode === 'editorial' ? '#eef2f8' : mode === 'studio' ? '#f8f1eb' : mode === 'launch' ? '#070b16' : mode === 'lens' ? '#fbfdff' : mode === 'horizon' ? '#f4f7fc' : '#f5f7fb'};--surface:${mode === 'dark' ? '#252832' : '#ffffff'};--text:${theme.text};--primary:${theme.primary};--secondary:${theme.secondary};--muted:${mode === 'dark' ? '#12345c' : mode === 'editorial' ? '#f1f4ff' : mode === 'studio' ? '#f2e9e3' : mode === 'launch' ? '#111a2a' : mode === 'lens' ? '#eef6fb' : mode === 'horizon' ? '#e6eef7' : '#edf3ff'};--line:${mode === 'dark' ? '#3a3f4d' : mode === 'editorial' ? '#dbe3f0' : mode === 'studio' ? '#d7c6bd' : mode === 'launch' ? '#2e4a7d' : mode === 'lens' ? '#d6e2ea' : mode === 'horizon' ? '#cad4e5' : '#d8deea'};}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font-family:${theme.font};line-height:1.55}
    header{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:color-mix(in srgb, var(--surface), transparent 4%);border-bottom:1px solid var(--line);backdrop-filter:blur(16px)}
    nav{display:flex;gap:22px;font-size:13px}.wrap{width:min(980px,calc(100% - 42px));margin:auto}.hero{min-height:62vh;display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center}
    .badge{display:inline-flex;background:var(--secondary);color:var(--primary);padding:5px 13px;border-radius:999px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.1em}
    h1{font:700 clamp(44px,8vw,76px)/.98 Georgia,serif;margin:18px 0;letter-spacing:0}h2{font:700 38px/1 Georgia,serif;margin:0 0 22px}.hero p{font-size:19px;max-width:660px}
    .summaryPanel,.terminal,.card{border:1px solid var(--line);border-radius:${creative ? '2px' : '12px'};background:var(--surface);box-shadow:${creative ? 'none' : '0 22px 60px rgba(18,29,54,.12)'};padding:24px}
    .terminal{background:#111722}.dots{display:flex;gap:8px;margin-bottom:16px}.dots i{width:11px;height:11px;border-radius:50%;background:var(--primary)}.dots i:nth-child(2){background:var(--secondary)}.dots i:nth-child(3){background:#28c76f}
    .actions{display:flex;gap:12px;margin-top:24px}.actions a{padding:12px 18px;border-radius:8px;background:var(--primary);color:#fff;font-weight:900;text-decoration:none}.actions a+ a{background:transparent;color:inherit;border:1px solid var(--line)}
    section{padding:58px 0;border-top:1px solid var(--line)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.skills{display:flex;flex-wrap:wrap;gap:10px}.skills span{padding:8px 11px;border-radius:7px;background:var(--secondary);color:var(--primary);font-weight:900}
    .project{display:grid;grid-template-columns:1fr 180px;gap:18px;min-height:220px}.visual{border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-size:42px;font-weight:900}.heroVisual{width:100%;max-width:520px;height:min(460px,55vh);overflow:hidden;border-radius:24px;box-shadow:0 30px 70px rgba(18,29,54,.14);margin-left:auto}.heroVisual img{width:100%;height:100%;object-fit:cover;display:block}.project-stack{margin-top:20px;display:flex;flex-wrap:wrap;gap:8px}.tech-tag{background:rgba(255,255,255,0.2);padding:6px 10px;border-radius:7px;font-size:12px;font-weight:700}
    .editorial .hero{display:block;text-align:center;min-height:54vh;padding-top:100px}.editorial .hero p{margin:auto}.editorial .actions{justify-content:center}.editorial .grid{grid-template-columns:1fr 1fr}.editorial .card:nth-child(even){transform:translateY(32px)}
    .studio .hero{grid-template-columns:1fr 340px;min-height:70vh}.studio .heroVisual img{width:100%;border-radius:24px}
    .launch .hero{min-height:80vh;align-items:center}.launch .heroVisual img{border-radius:30px;width:100%}
    .lens .hero{text-align:center;grid-template-columns:1fr;min-height:68vh}.lens .heroVisual{margin:30px auto 0;width:min(580px,100%);border-radius:30px;overflow:hidden;box-shadow:0 24px 60px rgba(15,33,46,.12)}
    .lens .heroVisual img{width:100%;display:block}
    .horizon .hero{grid-template-columns:1fr 1fr;min-height:72vh}.horizon .heroVisual{border-radius:20px;overflow:hidden}
    .contact{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
    @media(max-width:760px){.hero,.project,.grid{grid-template-columns:1fr}nav{display:none}}
  </style></head><body class="${mode}"><header><strong>${escapeHtml(data.name || 'PortfolioCraft')}</strong><nav>${hasProjects ? '<span>Work</span>' : ''}${hasSkills ? '<span>Skills</span>' : ''}${hasContact ? '<span>Contact</span>' : ''}</nav></header><main class="wrap">
    <section class="hero"><div><span class="badge">${escapeHtml(inputs.preferredTitle || data.title || 'Portfolio')}</span><h1>${creative ? `The Art of<br><em>${escapeHtml(data.name || 'Thoughtful Work')}</em>` : escapeHtml(data.name || 'Your Name')}</h1><p>${escapeHtml(bio)}</p><div class="actions">${socialPreview(inputs.socials)}${hasProjects ? '<a href="#work">View Work</a>' : ''}</div></div>${heroPanel}</section>
    ${hasSkills ? `<section><h2>${dark ? 'Toolkit' : 'Technical Proficiencies'}</h2><div class="skills">${(data.skills || []).map((skill) => `<span>${escapeHtml(skill)}</span>`).join('')}</div></section>` : ''}
    ${hasProjects ? `<section id="work"><h2>${creative ? 'Featured Work' : 'Project Timeline'}</h2><div class="grid">${projects.map((project, index) => `<article class="card project"><div><h3>${escapeHtml(project.title || 'Project')}</h3><p>${escapeHtml(project.description || project.organization || '')}</p><ul>${(project.bullets || []).slice(0, 3).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul><div class="project-stack">${(project.technologies || []).slice(0, 4).map((tech) => `<span class="tech-tag">${escapeHtml(tech)}</span>`).join('')}</div></div><div class="visual">${index + 1}</div></article>`).join('')}</div></section>` : ''}
    ${hasExperience ? `<section><h2>Experience</h2>${(data.experience || []).map((job) => `<article class="card"><h3>${escapeHtml(job.title || 'Experience')}</h3><small>${escapeHtml(job.period || '')}</small><ul>${(job.bullets || []).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul></article>`).join('')}</section>` : ''}
    ${hasEducation ? `<section><h2>Education</h2><div class="grid">${(data.education || []).map((item) => `<article class="card"><h3>${escapeHtml(item.school || '')}</h3><p>${escapeHtml(item.degree || '')}</p><small>${escapeHtml(item.period || '')}</small></article>`).join('')}</div></section>` : ''}
    ${contactBlock}
  </main></body></html>`;
}

function socialPreview(socials) {
  const entries = Object.entries(socials || {}).filter(([key, value]) => value && !['Phone', 'Location'].includes(key));
  return entries.length ? entries.slice(0, 1).map(([key, value]) => `<a href="${contactHref(key, value)}">${escapeHtml(key)}</a>`).join('') : '<a href="#contact">Contact Me</a>';
}

function contactLines(socials) {
  return Object.entries(socials || {})
    .filter(([, value]) => value)
    .map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(value)}`)
    .join('<br>');
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'portfolio';
}

function contactHref(key, value) {
  if (!value) return '#';

  let url = String(value).trim();

  if (key === 'Email') return `mailto:${escapeAttribute(url)}`;
  if (key === 'Phone') return `tel:${escapeAttribute(url)}`;

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
    return escapeAttribute(url);
  }

  if (/^\/\//.test(url)) {
    return escapeAttribute(`https:${url}`);
  }

  return escapeAttribute(`https://${url.replace(/^\/+/, '')}`);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/javascript:/gi, '');
}
