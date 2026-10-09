import Anthropic from '@anthropic-ai/sdk';
import { db, guard, BUCKET, UUID } from './_lib.js';
import { STEPS } from '../public/schema.js';

// Extracts answers from an uploaded CV so the form can be pre-filled. Only fields the form actually has are returned.
// Every property is required (empty string / empty list when unknown): the API limits optional properties in output schemas.
const UNK = 'Unknown'; // enum placeholder: enums may not contain empty strings
const STR = { type: 'string' }, opt = (props, extra = {}) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false, ...extra });
const month = { type: 'string', description: 'YYYY-MM, or empty if unknown' };
const opts = key => { for (const s of STEPS) for (const g of s.groups) for (const f of g.fields) if (f.k === key && f.o) return f.o; };
const SCHEMA = opt({
  personal: opt({ firstName: STR, middleName: STR, lastName: STR, dateOfBirth: { type: 'string', description: 'YYYY-MM-DD or empty' }, gender: { type: 'string', enum: [...opts('gender'), UNK] },
    nationality: { type: 'string', description: 'Country name in English' }, countryOfResidence: STR, currentCity: STR, maritalStatus: { type: 'string', enum: [...opts('maritalStatus'), UNK] }, passportNumber: STR }),
  contact: opt({ phone: { type: 'string', description: 'Format: +<country code> <digits>, e.g. "+91 9876543210"' }, email: STR, address: STR }),
  schooling: { type: 'array', items: opt({ institution: STR, country: STR, city: STR, startDate: month, endDate: month }) },
  college: { type: 'array', items: opt({ degree: { type: 'string', enum: [...opts('degree'), UNK], description: 'Closest option, or "Other qualification"' }, degreeOther: { type: 'string', description: 'Original degree name when degree is "Other qualification"' },
    institution: STR, country: STR, city: STR, startDate: month, endDate: month }) },
  employment: { type: 'array', items: opt({ employer: STR, jobTitle: STR, department: STR, country: STR, city: STR, current: { type: 'string', enum: ['Yes', 'No'] }, startDate: month, endDate: month, responsibilities: STR }) },
  languages: { type: 'array', items: opt({ name: STR, fluency: { type: 'string', enum: [...opts('fluency'), UNK] } }) },
  german: opt({ level: { type: 'string', enum: [...opts('level'), UNK] } }),
  skills: opt({ itSkills: { type: 'array', items: { type: 'string', enum: opts('itSkills') } } }),
});

const SYSTEM = `You extract facts from a nurse's CV into a fixed form. Fill only what the CV states or clearly implies; leave unknown fields as empty strings (or empty lists), and choose "Unknown" for a choice field you cannot determine. Never invent values.
Dates: use YYYY-MM for months, YYYY-MM-DD for the date of birth. Mark a job as current ("Yes") only if the CV says so (e.g. "present", "till date").
Schooling = school / high school; college = university degrees, diplomas and vocational training. For "degree" pick the closest listed option; if none fits use "Other qualification" and put the CV's wording in degreeOther.
List education and jobs in chronological order (oldest first). Country names in English. Phone as "+<country code> <number>".`;

// Gemini (free tier) is the default parser; Claude is used only when no Gemini key is configured.
const clean = o => Array.isArray(o) ? o.map(clean) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clean(v)])) : o === UNK ? '' : o;

// Tries each model in turn; a model that is overloaded or rate-limited (429/503) is skipped.
const GEMINI_MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'].filter(Boolean))];
async function withGemini(b64, mime) {
  const strip = o => Array.isArray(o) ? o.map(strip) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'additionalProperties').map(([k, v]) => [k, strip(v)])) : o;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: b64 } }, { text: 'Extract this CV into the form.' }] }],
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

async function withClaude(file) {
  const client = new Anthropic();
  const r = await client.beta.messages.create({
    model: 'claude-opus-5-5', max_tokens: 16000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: [file, { type: 'text', text: 'Extract this CV into the form.' }] }],
  });
  if (r.stop_reason === 'refusal') return null;
  const text = r.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text);
}

export default async function handler(req, res) {
  if (guard(req, res, 'parse', 10)) return;
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'CV reading is not set up yet.' });
  const { session, path } = req.body || {};
  if (!UUID.test(String(session)) || typeof path !== 'string' || !path.startsWith(session.toLowerCase() + '/') || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(path))
    return res.status(400).json({ error: 'Please upload the CV again.' });

  const { data: blob, error } = await db().storage.from(BUCKET).download(path);
  if (error || !blob) return res.status(404).json({ error: 'The CV could not be found. Please upload it again.' });
  const b64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
  const pdf = path.endsWith('.pdf');
  const file = pdf ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
    : { type: 'image', source: { type: 'base64', media_type: path.endsWith('.png') ? 'image/png' : 'image/jpeg', data: b64 } };

  try {
    const data = process.env.GEMINI_API_KEY ? await withGemini(b64, pdf ? 'application/pdf' : path.endsWith('.png') ? 'image/png' : 'image/jpeg') : await withClaude(file);
    if (!data) return res.status(422).json({ error: 'We could not read this CV.' });
    res.json({ data: clean(data) });
  } catch (e) {
    console.error('parse-resume', e?.status, e?.message);
    res.status(502).json({ error: 'We could not read the CV right now. You can continue and type your answers.' });
  }
}
