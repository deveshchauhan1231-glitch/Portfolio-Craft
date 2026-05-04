const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function structureResumeText(rawText, deterministicData = {}) {
  if (!process.env.GROQ_API_KEY) {
    return normalizePortfolioJson({}, deterministicData);
  }

  const sections = splitResumeText(rawText);
  const [basic, skills, experience, projects] = await Promise.all([
    parseBasicInfo(sections.header, deterministicData),
    parseSkills(sections.skills, deterministicData),
    parseExperience(sections.experience, deterministicData),
    parseProjects(sections.projects, deterministicData)
  ]);

  return normalizePortfolioJson({
    ...basic,
    skills: skills.skills,
    experience: experience.experience,
    projects: projects.projects,
    education: deterministicData.education || []
  }, deterministicData);
}

async function parseBasicInfo(text, fallback) {
  const fallbackJson = {
    name: fallback.name || '',
    title: fallback.title || '',
    bio: '',
    contact: fallback.contact || {}
  };

  return safeGroqJson({
    system: 'Extract basic portfolio identity from resume text. Return JSON only.',
    user: `Return clean JSON with this schema:
{"name":"","title":"","bio":"","contact":{"email":"","phone":"","location":"","website":"","github":"","linkedin":""}}

Rules:
- Preserve facts. Do not invent contact details.
- Bio should be concise and based only on the resume.
- Return JSON only.

Resume excerpt:
${limitText(text, 2600)}`
  }, fallbackJson);
}

async function parseSkills(text, fallback) {
  const fallbackJson = { skills: fallback.skills || [] };

  return safeGroqJson({
    system: 'Extract skills from resume text. Return JSON only.',
    user: `Return clean JSON with this schema:
{"skills":[]}

Rules:
- Split combined skill lines into individual skills.
- Remove duplicates.
- Do not include sentences or section headings.
- Return JSON only.

Skills section:
${limitText(text, 2400)}`
  }, fallbackJson);
}

async function parseExperience(text, fallback) {
  const fallbackJson = { experience: fallback.experience || [] };

  return safeGroqJson({
    system: 'Extract work experience from resume text. Return JSON only.',
    user: `Return clean JSON with this schema:
{"experience":[{"title":"","organization":"","period":"","bullets":[]}]}

Rules:
- Preserve factual role names, organizations, dates, and bullets.
- Do not invent metrics.
- Empty array if no experience exists.
- Return JSON only.

Experience section:
${limitText(text, 3000)}`
  }, fallbackJson);
}

async function parseProjects(text, fallback) {
  const fallbackJson = { projects: fallback.projects || [] };

  return safeGroqJson({
    system: 'Extract projects from resume text. Return JSON only.',
    user: `Return clean JSON with this schema:
{"projects":[{"title":"","organization":"","period":"","description":"","bullets":[],"technologies":[]}]}

Rules:
- Preserve project names, descriptions, technologies, and factual bullets.
- Empty array if no projects exist.
- Return JSON only.

Projects section:
${limitText(text, 3000)}`
  }, fallbackJson);
}

export async function generateBio({ data = {}, preferredTitle = '', bioOverride = '' }) {
  const fallback = buildBioFallback(data, preferredTitle, bioOverride);
  const text = await callGroq({
    system: 'You write concise, factual portfolio bios. Return only the rewritten bio text.',
    user: `Rewrite the portfolio bio in 65-85 words.

Rules:
- Preserve facts from the resume JSON.
- Do not invent employers, degrees, numbers, awards, or links.
- Use the preferred title if it fits the resume.
- If an existing bio is provided, improve it instead of returning it unchanged.

Resume JSON: ${JSON.stringify(data)}
Preferred title: ${preferredTitle || data.title || ''}
Existing bio: ${bioOverride || data.bio || ''}`
  }, fallback);
  return cleanGeneratedText(text) || fallback;
}

export async function improveBullets(bullets) {
  if (!bullets.length) return [];
  const fallback = bullets.map((bullet) => bullet.replace(/^(worked on|helped with)/i, 'Delivered'));
  const text = await callGroq({
    system: 'Improve resume bullets. Return JSON array only.',
    user: `Rewrite these bullets with clearer action verbs and measurable impact where reasonable: ${JSON.stringify(bullets)}`
  }, JSON.stringify(fallback));
  return safeJson(text, fallback);
}

export async function refineProjectDescription(project) {
  const fallback = project.bullets?.join(' ') || project.title || '';
  const text = await callGroq({
    system: 'You write concise portfolio project summaries.',
    user: `Write a 35-word project description from this JSON: ${JSON.stringify(project)}`
  }, fallback);
  return cleanGeneratedText(text) || fallback;
}

export async function suggestDesign({ theme = {}, data = {} }) {
  const fallback = {
    colors: {
      primary: theme.primary && theme.primary !== '#075fc7' ? theme.primary : '#116466',
      secondary: theme.secondary && theme.secondary !== '#cfe1ff' ? theme.secondary : '#d9b08c',
      text: theme.text || '#111827'
    },
    preset: theme.preset || 'Minimalist',
    layoutTips: [
      'Feature the strongest project before experience.',
      'Use short project summaries and keep bullet lists compact.'
    ]
  };

  const text = await callGroq({
    system: 'You are a practical portfolio designer. Return compact JSON only.',
    user: `Suggest a small design adjustment for this portfolio.

Return this schema:
{"colors":{"primary":"#000000","secondary":"#000000","text":"#000000"},"preset":"Minimalist|Tech|Creative|Studio|Launch|Lens|Horizon","layoutTips":[]}

Rules:
- Choose readable colors with strong contrast.
- Do not return the exact same colors unless they are already ideal.
- Pick one existing preset only.
- The text color and the background color and the primary and secondary colors should complement each other and not get lost in each other they should stand out and the text color should be diffrent than the bg
- Return JSON only.


Current theme: ${JSON.stringify(theme)}
Resume data: ${JSON.stringify(data)}`
  }, JSON.stringify(fallback));
  return safeJson(text, fallback);
}

export async function suggestPortfolioChanges({ data = {}, theme = {}, inputs = {}, rawText = '' }) {
  const fallback = buildPortfolioSuggestionsFallback(data, theme, inputs);
  const text = await callGroq({
    system: 'You are an expert portfolio editor and UI design assistant. Return JSON only.',
    user: `Suggest concrete improvements for a resume-to-portfolio editor.

Return this exact JSON schema:
{
  "title": "",
  "bio": "",
  "about": "",
  "skills": [],
  "projects": [
    {"index":0,"title":"","description":"","bullets":[]}
  ],
  "experience": [
    {"index":0,"bullets":[]}
  ],
  "theme": {
    "primary":"#000000",
    "secondary":"#000000",
    "text":"#000000",
    "preset":"Minimalist"
  },
  "notes": []
}

Rules:
- Preserve facts. Do not invent companies, metrics, dates, links, certifications, or education.
- Make suggestions polished, concise, and ready to apply.
- "bio" should be 65-85 words.
- "about" should be 2-3 first-person or neutral portfolio sentences.
- Improve up to 5 skills, 3 projects, and 3 experience entries.
- Keep project and experience indexes matched to the arrays in the provided data.
- Theme must use readable hex colors and one preset: Minimalist, Tech, Creative, Studio, Launch, Lens, or Horizon.
- Return JSON only.

Portfolio data: ${JSON.stringify(data)}
Editor inputs: ${JSON.stringify(inputs)}
Current theme: ${JSON.stringify(theme)}
Raw resume excerpt: ${limitText(rawText, 2200)}`
  }, JSON.stringify(fallback));

  return normalizeSuggestions(safeJson(text, fallback), fallback);
}

async function callGroq(messages, fallback) {
  if (!process.env.GROQ_API_KEY) return fallback;

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: messages.system },
        { role: 'user', content: messages.user }
      ],
      temperature: 0.4
    })
  });

  if (!response.ok) {
    const details = await parseGroqError(response);
    const error = new Error(formatGroqError(response, details));
    error.status = 502;
    error.groq = details;
    error.groqStatus = response.status;
    throw error;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || fallback;
}

function safeJson(text, fallback) {
  const cleaned = stripJsonFence(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    const canParseObject = objectStart >= 0 && objectEnd > objectStart;
    const canParseArray = arrayStart >= 0 && arrayEnd > arrayStart;

    try {
      if (canParseObject && (!canParseArray || objectStart < arrayStart)) {
        return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
      }
      if (canParseArray) {
        return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
      }
    } catch {
      return fallback;
    }

    return fallback;
  }
}

function stripJsonFence(text) {
  return String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function cleanGeneratedText(text = '') {
  return String(text || '')
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

async function safeGroqJson(messages, fallback) {
  const text = await callGroq(messages, JSON.stringify(fallback));
  return safeJson(text, fallback);
}

async function parseGroqError(response) {
  const rawBody = await response.text();
  if (!rawBody) return { message: response.statusText || 'Groq request failed' };

  try {
    const parsed = JSON.parse(rawBody);
    return parsed.error || parsed;
  } catch {
    return { message: rawBody };
  }
}

function formatGroqError(response, details) {
  const message = details?.message || details?.error || response.statusText || 'Groq request failed';
  const metadata = [
    details?.type && `type: ${details.type}`,
    details?.code && `code: ${details.code}`
  ].filter(Boolean);

  return `Groq API error (${response.status}): ${message}${metadata.length ? ` (${metadata.join(', ')})` : ''}`;
}

function splitResumeText(rawText) {
  const sections = {
    header: [],
    skills: [],
    experience: [],
    projects: [],
    education: []
  };
  let current = 'header';

  for (const line of String(rawText || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const section = sectionForLine(trimmed);
    if (section) {
      current = section;
      continue;
    }

    sections[current].push(trimmed);
  }

  return {
    header: limitText([...sections.header, ...collectContactLines(rawText)].join('\n'), 2600),
    skills: limitText(sections.skills.join('\n') || rawText, 2400),
    experience: limitText(sections.experience.join('\n'), 3000),
    projects: limitText(sections.projects.join('\n'), 3000),
    education: limitText(sections.education.join('\n'), 2400)
  };
}

function sectionForLine(line) {
  const normalized = line.toLowerCase().replace(/[:|]/g, '').trim();
  const labels = {
    skills: ['skills', 'technical skills', 'core skills', 'technologies', 'tech stack'],
    experience: ['experience', 'work experience', 'professional experience', 'employment', 'internships'],
    projects: ['projects', 'selected projects', 'personal projects', 'academic projects'],
    education: ['education', 'academic background', 'academics', 'qualification']
  };

  return Object.entries(labels).find(([, names]) => names.includes(normalized))?.[0] || '';
}

function collectContactLines(rawText) {
  const text = String(rawText || '');
  return [
    text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0],
    text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0],
    text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0],
    text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0],
    text.match(/https?:\/\/[^\s)]+/i)?.[0]
  ].filter(Boolean);
}

function limitText(text, maxLength = 2800) {
  const normalized = String(text || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength);
}

function normalizePortfolioJson(data, fallback = {}) {
  return {
    name: cleanString(data.name) || fallback.name || '',
    title: cleanString(data.title) || fallback.title || '',
    bio: cleanString(data.bio),
    contact: {
      email: cleanString(data.contact?.email) || cleanString(fallback.contact?.email),
      phone: cleanString(data.contact?.phone) || cleanString(fallback.contact?.phone),
      location: cleanString(data.contact?.location) || cleanString(fallback.contact?.location),
      website: cleanString(data.contact?.website) || cleanString(fallback.contact?.website),
      github: cleanString(data.contact?.github) || cleanString(fallback.contact?.github),
      linkedin: cleanString(data.contact?.linkedin) || cleanString(fallback.contact?.linkedin)
    },
    skills: cleanArray(data.skills?.length ? data.skills : fallback.skills),
    experience: cleanEntries(data.experience?.length ? data.experience : fallback.experience),
    projects: cleanEntries(data.projects?.length ? data.projects : fallback.projects, true),
    education: cleanEducation(data.education?.length ? data.education : fallback.education)
  };
}

function cleanEntries(entries = [], includeDescription = false) {
  return entries
    .map((entry) => ({
      title: cleanString(entry.title),
      organization: cleanString(entry.organization),
      period: cleanString(entry.period),
      description: includeDescription ? cleanString(entry.description) : undefined,
      technologies: includeDescription ? cleanArray(entry.technologies) : undefined,
      bullets: cleanArray(entry.bullets)
    }))
    .filter((entry) => entry.title || entry.organization || entry.description || entry.bullets.length);
}

function cleanEducation(entries = []) {
  return entries
    .map((entry) => ({
      school: cleanString(entry.school),
      degree: cleanString(entry.degree),
      period: cleanString(entry.period)
    }))
    .filter((entry) => entry.school || entry.degree);
}

function cleanArray(values = []) {
  return [...new Set((Array.isArray(values) ? values : String(values).split(/[,|;]/))
    .map(cleanString)
    .filter(Boolean))];
}

function cleanString(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function joinList(values) {
  if (!values.length) return 'their core discipline';
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`;
}

function buildBioFallback(data = {}, preferredTitle = '', bioOverride = '') {
  const role = preferredTitle || data.title || 'technology professional';
  const skills = joinList(data.skills?.slice(0, 5) || []);
  const project = data.projects?.[0]?.title ? ` Their work includes ${data.projects[0].title}.` : '';
  const existing = cleanString(bioOverride || data.bio);

  if (existing) {
    return `${existing} ${project}`.trim();
  }

  return `${data.name || 'This professional'} is a ${role} with experience across ${skills}.${project}`.trim();
}

function buildPortfolioSuggestionsFallback(data = {}, theme = {}, inputs = {}) {
  const bio = buildBioFallback(data, inputs.preferredTitle, inputs.bioOverride);
  const about = [
    bio,
    data.projects?.length ? `Selected projects show hands-on work across ${data.projects.slice(0, 2).map((project) => project.title).filter(Boolean).join(' and ')}.` : ''
  ].filter(Boolean).join(' ');

  return {
    title: inputs.preferredTitle || data.title || '',
    bio,
    about,
    skills: cleanArray(data.skills || []).slice(0, 12),
    projects: (data.projects || []).slice(0, 3).map((project, index) => ({
      index,
      title: cleanString(project.title),
      description: cleanString(project.description || project.organization || project.bullets?.[0] || project.title),
      bullets: cleanArray(project.bullets || []).slice(0, 3)
    })),
    experience: (data.experience || []).slice(0, 3).map((entry, index) => ({
      index,
      bullets: cleanArray(entry.bullets || []).slice(0, 3)
    })),
    theme: {
      primary: theme.primary && theme.primary !== '#075fc7' ? theme.primary : '#116466',
      secondary: theme.secondary && theme.secondary !== '#cfe1ff' ? theme.secondary : '#d9b08c',
      text: theme.text || '#111827',
      preset: theme.preset || 'Minimalist'
    },
    notes: [
      'Use the suggested bio as the hero summary.',
      'Apply project descriptions only where the source project already exists.',
      'Preview the theme colors before exporting.'
    ]
  };
}

function normalizeSuggestions(suggestions = {}, fallback = {}) {
  const allowedPresets = new Set(['Minimalist', 'Tech', 'Creative', 'Studio', 'Launch', 'Lens', 'Horizon']);
  const theme = suggestions.theme || {};

  return {
    title: cleanString(suggestions.title) || fallback.title,
    bio: cleanString(suggestions.bio) || fallback.bio,
    about: cleanString(suggestions.about) || fallback.about,
    skills: cleanArray(suggestions.skills?.length ? suggestions.skills : fallback.skills),
    projects: normalizeIndexedSuggestions(suggestions.projects, fallback.projects, true),
    experience: normalizeIndexedSuggestions(suggestions.experience, fallback.experience),
    theme: {
      primary: cleanHex(theme.primary) || fallback.theme.primary,
      secondary: cleanHex(theme.secondary) || fallback.theme.secondary,
      text: cleanHex(theme.text) || fallback.theme.text,
      preset: allowedPresets.has(theme.preset) ? theme.preset : fallback.theme.preset
    },
    notes: cleanArray(suggestions.notes?.length ? suggestions.notes : fallback.notes)
  };
}

function normalizeIndexedSuggestions(entries = [], fallback = [], includeProjectFields = false) {
  const source = Array.isArray(entries) && entries.length ? entries : fallback;
  return source
    .map((entry, fallbackIndex) => ({
      index: Number.isInteger(entry.index) && entry.index >= 0 ? entry.index : fallbackIndex,
      title: includeProjectFields ? cleanString(entry.title) : undefined,
      description: includeProjectFields ? cleanString(entry.description) : undefined,
      bullets: cleanArray(entry.bullets || [])
    }))
    .filter((entry) => entry.bullets.length || entry.title || entry.description);
}

function cleanHex(value = '') {
  const hex = cleanString(value);
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : '';
}
