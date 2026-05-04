import pdf from 'pdf-parse';
import { structureResumeText } from './groqService.js';

const SECTION_ALIASES = {
  skills: ['skills', 'technical skills', 'core skills', 'technologies'],
  experience: ['experience', 'work experience', 'professional experience', 'employment'],
  projects: ['projects', 'selected projects', 'personal projects'],
  education: ['education', 'academic background', 'academics']
};

const KNOWN_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB',
  'Python', 'Java', 'C++', 'C#', 'HTML', 'CSS', 'Tailwind', 'Redux',
  'Next.js', 'AWS', 'Docker', 'Kubernetes', 'SQL', 'PostgreSQL', 'Git',
  'REST', 'GraphQL', 'Firebase', 'Figma', 'Machine Learning'
];

export async function parseResumeBuffer(buffer) {
  const result = await pdf(buffer);
  const rawText = normalizeText(result.text || '');
  const deterministicData = parseDeterministic(rawText);
  const aiData = await structureResumeText(rawText, deterministicData);

  return {
    rawText,
    data: aiData,
    source: 'groq',
    confidence: {
      name: aiData.name ? 0.9 : 0,
      title: aiData.title ? 0.85 : 0,
      skills: aiData.skills?.length ? 0.9 : 0,
      experience: aiData.experience?.length ? 0.85 : 0,
      projects: aiData.projects?.length ? 0.85 : 0,
      education: aiData.education?.length ? 0.85 : 0,
      contact: Object.values(aiData.contact || {}).some(Boolean) ? 0.9 : 0
    }
  };
}

function parseDeterministic(rawText) {
  const lines = rawText.split('\n').map((line) => line.trim()).filter(Boolean);
  const sections = splitSections(lines);

  return {
    name: detectName(lines),
    title: detectTitle(lines),
    contact: detectContact(rawText),
    skills: detectSkills(sections.skills || [], rawText),
    experience: parseEntries(sections.experience || []),
    projects: parseEntries(sections.projects || []),
    education: parseEducation(sections.education || [])
  };
}

function detectContact(rawText) {
  return {
    email: rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '',
    phone: rawText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || '',
    github: rawText.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0] || '',
    linkedin: rawText.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] || '',
    website: rawText.match(/https?:\/\/(?!www\.github\.com|github\.com|www\.linkedin\.com|linkedin\.com)[^\s)]+/i)?.[0] || '',
    location: ''
  };
}

function normalizeText(text) {
  return text
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitSections(lines) {
  const sections = {};
  let current = 'header';
  sections[current] = [];

  for (const line of lines) {
    const section = sectionForLine(line);
    if (section) {
      current = section;
      sections[current] ||= [];
      continue;
    }
    sections[current].push(line);
  }

  return sections;
}

function sectionForLine(line) {
  const normalized = line.toLowerCase().replace(/[:|]/g, '').trim();
  return Object.entries(SECTION_ALIASES).find(([, labels]) => labels.includes(normalized))?.[0];
}

function detectName(lines) {
  const candidate = lines.find((line) => {
    const words = line.split(/\s+/);
    return words.length >= 2 && words.length <= 4 && /^[A-Za-z .'-]+$/.test(line);
  });
  return candidate || lines[0] || '';
}

function detectTitle(lines) {
  const titlePattern = /(developer|engineer|designer|analyst|manager|architect|student|consultant|specialist)/i;
  return lines.slice(0, 8).find((line) => titlePattern.test(line)) || '';
}

function detectSkills(skillLines, rawText) {
  const explicit = skillLines
    .flatMap((line) => line.split(/[,|•;]+/))
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 1 && skill.length < 35);

  const discovered = KNOWN_SKILLS.filter((skill) => new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'i').test(rawText));
  return unique([...explicit, ...discovered]).slice(0, 30);
}

function parseEntries(lines) {
  const entries = [];
  let current = null;

  for (const line of lines) {
    const isBullet = /^[-•*]\s+/.test(line);
    const hasDate = /(20\d{2}|19\d{2}|present|current)/i.test(line);

    if (!isBullet && (hasDate || line.length < 90)) {
      if (current) entries.push(current);
      current = {
        title: line.replace(/\s+/g, ' '),
        organization: '',
        period: extractPeriod(line),
        bullets: []
      };
      continue;
    }

    if (!current) {
      current = { title: 'Entry', organization: '', period: '', bullets: [] };
    }
    current.bullets.push(line.replace(/^[-•*]\s+/, '').trim());
  }

  if (current) entries.push(current);
  return entries.filter((entry) => entry.title || entry.bullets.length).slice(0, 8);
}

function parseEducation(lines) {
  return parseEntries(lines).map((entry) => ({
    school: entry.title,
    degree: entry.bullets[0] || '',
    period: entry.period
  }));
}

function extractPeriod(line) {
  const match = line.match(/((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\.?\s?\d{4}|20\d{2}|19\d{2})\s?[-–]\s?((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\.?\s?\d{4}|present|current|20\d{2}|19\d{2})/i);
  return match?.[0] || '';
}

function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
