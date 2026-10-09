import Anthropic from '@anthropic-ai/sdk';
import { db, guard, BUCKET, UUID } from './_lib.js';
import { STEPS, DOC_KINDS } from '../public/schema.js';

// Reads the candidate's uploaded documents (CV, passport, ID, degree, transcript, German certificate, experience letters)
// and returns answers for the form. Only fields the form actually has are returned; unknown values stay empty.
export const config = { maxDuration: 60 };

const UNK = 'Unknown'; // enum placeholder: enums may not contain empty strings
const STR = { type: 'string' }, opt = (props, extra = {}) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false, ...extra });
const date = { type: 'string', description: 'YYYY-MM-DD; if only month and year are known use the first day of that month; empty if unknown' };
const opts = (group, key) => { for (const s of STEPS) for (const g of s.groups) if (g.key === group) for (const f of g.fields) if (f.k === key && f.o) return f.o; };
const en = (group, key) => ({ type: 'string', enum: [...opts(group, key), UNK] });
const SCHEMA = opt({
  basic: opt({ firstName: STR, lastName: STR, nationality: { type: 'string', description: 'Country name in English' }, profession: STR, dateOfBirth: date, germanLevel: en('basic', 'germanLevel'), gender: en('basic', 'gender') }),
  college: { type: 'array', items: opt({ institutionOriginal: STR, institution: { type: 'string', description: 'The college name translated to German' }, degree: { ...en('college', 'degree'), description: 'Closest option, or "Other qualification"' },
    degreeOther: { type: 'string', description: 'Original degree name when degree is "Other qualification"' }, startDate: date, endDate: date, city: STR, country: STR, diplomaDate: date,
    homeQualification: { type: 'string', description: 'Official name of the qualification as written in the home country, e.g. "B.Sc. Nursing (4 years)"' } }) },
  personal: opt({ placeOfBirth: STR, countryOfBirth: STR, birthName: STR, maritalStatus: en('personal', 'maritalStatus'), children: en('personal', 'children'), street: STR, zip: STR, city: STR,
    phone: { type: 'string', description: 'Format: +<country code> <digits>, e.g. "+91 9876543210"' }, email: STR, passportNumber: STR }),
  schooling: { type: 'array', items: opt({ institution: STR, institutionGerman: { type: 'string', description: 'The school name translated to German' }, startDate: date, endDate: date, city: STR, country: STR, diplomaDate: date }) },
  employment: { type: 'array', items: opt({ jobTitle: STR, employer: STR, employerGerman: { type: 'string', description: 'The hospital name translated to German' }, facilityType: en('employment', 'facilityType'), department: { type: 'string', description: 'Hospital department / ward, e.g. ICU, Emergency, Medical ward' },
    startDate: date, current: { type: 'string', enum: ['Yes', 'No'] }, endDate: date, employmentType: en('employment', 'employmentType'), city: STR, country: STR, responsibilities: STR, conditions: STR, equipment: STR }) },
  skills: opt({ germanLevel: en('skills', 'germanLevel'), additionalSkills: STR, drivingLicence: { type: 'string', enum: ['Yes', 'No', UNK] }, itSkills: { type: 'array', items: { type: 'string', enum: opts('skills', 'itSkills') } } }),
  german: opt({ learning: { type: 'string', enum: ['Yes', 'No', UNK] }, examStatus: en('german', 'examStatus'), examProvider: en('german', 'examProvider'), examLevel: en('german', 'examLevel'), examDate: date }),
  languages: { type: 'array', items: opt({ name: STR, fluency: { ...en('languages', 'fluency'), description: 'For every language except German' }, cefr: { ...en('languages', 'cefr'), description: 'Only for German: CEFR level A1–C2' } }) },
});

const SYSTEM = `You extract facts from a nurse's documents into a fixed application form. Each document is labelled with its type. Fill only what the documents state or clearly imply; leave unknown fields as empty strings (or empty lists) and choose "Unknown" for a choice field you cannot determine. Never invent values.
Prefer these sources: passport for nationality, date/place/country of birth, gender and passport number; national ID for birth name, marital status and current address; CV for profession, phone, email, schooling, work experience, languages and skills; degree certificate for college name, degree, country and diploma date; transcript for college start/end dates; German certificate for the German level and exam details; experience letters for hospital, department, dates, employment type, tasks, conditions treated and equipment used (merge them with the CV's jobs — one entry per job, no duplicates).
Dates: always YYYY-MM-DD; when only a month and year are given, use the first day of that month. Mark a job as current ("Yes") only if the documents say so (e.g. "present", "till date").
Schooling = school / high school; college = university degrees, diplomas and vocational training. For "degree" pick the closest listed option; if none fits use "Other qualification" and put the original wording in degreeOther. For German-name fields give a faithful German translation of the institution name. List education and jobs in chronological order (oldest first). Country names in English. Phone as "+<country code> <number>". If a German certificate is present, set german.learning to "Yes" and languages should include German with its CEFR level.`;

const clean = o => Array.isArray(o) ? o.map(clean) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clean(v)])) : o === UNK ? '' : o;
const mime = p => p.endsWith('.pdf') ? 'application/pdf' : p.endsWith('.png') ? 'image/png' : 'image/jpeg';
const MAX_TOTAL = 18 * 1024 * 1024; // keep the model request comfortably under its inline-data limit

// Tries each model in turn; a model that is overloaded or rate-limited (429/503) is skipped.
const GEMINI_MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'].filter(Boolean))];
async function withGemini(files) {
  const strip = o => Array.isArray(o) ? o.map(strip) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'additionalProperties').map(([k, v]) => [k, strip(v)])) : o;
  const parts = files.flatMap(f => [{ text: `Document: ${f.label}` }, { inlineData: { mimeType: f.mime, data: f.b64 } }]);
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [...parts, { text: 'Extract these documents into the form.' }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: strip(SCHEMA) },
  });
  let last;
  for (const model of GEMINI_MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body,
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const text = j.candidates?.[0]?.content?.parts?.map(x => x.text || '').join('') || '';
      return text ? JSON.parse(text) : null;
    }
    last = new Error(`Gemini ${model} ${r.status}: ${j?.error?.message || ''}`);
    if (![429, 503, 404].includes(r.status)) throw last;
    console.warn(last.message);
  }
  throw last;
}

// Fallback when no Gemini key is configured.
async function withClaude(files) {
  const client = new Anthropic();
  const content = files.flatMap(f => [{ type: 'text', text: `Document: ${f.label}` },
    f.mime === 'application/pdf' ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.b64 } } : { type: 'image', source: { type: 'base64', media_type: f.mime, data: f.b64 } }]);
  const r = await client.beta.messages.create({
    model: 'claude-opus-5-5', max_tokens: 16000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: [...content, { type: 'text', text: 'Extract these documents into the form.' }] }],
  });
  if (r.stop_reason === 'refusal') return null;
  return JSON.parse(r.content.filter(b => b.type === 'text').map(b => b.text).join(''));
}

export default async function handler(req, res) {
  if (guard(req, res, 'parse', 10)) return;
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'Document reading is not set up yet.' });
  const { session, docs } = req.body || {};
  const own = p => typeof p === 'string' && p.startsWith(session.toLowerCase() + '/') && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(p);
  if (!UUID.test(String(session)) || !Array.isArray(docs) || !docs.length || docs.length > 20 || !docs.every(d => DOC_KINDS[d?.kind] && own(d.path)))
    return res.status(400).json({ error: 'Please upload your documents again.' });

  const sb = db(), files = [];
  let total = 0;
  for (const d of docs) {
    const { data: blob } = await sb.storage.from(BUCKET).download(d.path);
    if (!blob) continue;
    const buf = Buffer.from(await blob.arrayBuffer());
    if (total + buf.length > MAX_TOTAL) { console.warn('parse-docs: skipping', d.kind, 'over size budget'); continue; }
    total += buf.length;
    files.push({ label: DOC_KINDS[d.kind], mime: mime(d.path), b64: buf.toString('base64') });
  }
  if (!files.length) return res.status(404).json({ error: 'Your documents could not be found. Please upload them again.' });

  try {
    const data = process.env.GEMINI_API_KEY ? await withGemini(files) : await withClaude(files);
    if (!data) return res.status(422).json({ error: 'We could not read these documents.' });
    res.json({ data: clean(data), read: files.length });
  } catch (e) {
    console.error('parse-docs', e?.status, e?.message);
    res.status(502).json({ error: 'We could not read your documents right now. You can continue and type your answers.' });
  }
}
