import { STEPS } from '../public/schema.js';

// Fills the German institution / employer names (fields marked `auto` in the schema) that the candidate never types.
// Uses Gemini; if it is unavailable the names stay empty and can be added by staff.
const GEMINI_MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'].filter(Boolean))];
const RULES = `Give correct, natural German names for institutions as used in German official documents (Anerkennung paperwork).
Translate generic words (University → Universität, College of Nursing → Pflegehochschule, School of Nursing → Krankenpflegeschule, Institute → Institut,
Hospital → Krankenhaus, Medical College → Medizinische Hochschule, Government → Staatliche/Staatliches, Higher Secondary School → Höhere Sekundarschule,
School Education Board → Schulbildungsbehörde, Nursing Home → Pflegeheim) but keep proper nouns, personal names, abbreviations and place names unchanged.
Examples: "KLE Institute of Nursing Sciences" → "KLE Institut für Pflegewissenschaften"; "Apollo Hospital" → "Apollo Krankenhaus";
"Punjab School Education Board" → "Schulbildungsbehörde des Bundesstaates Punjab". Never leave English words that have a standard German equivalent.
Return a JSON array of strings, one German name per input, in the same order.`;

// Pairs of [original-name key, German-name key] per list, derived from the schema's `auto` fields.
const PAIRS = { college: ['institutionOriginal', 'institution'], schooling: ['institution', 'institutionGerman'], employment: ['employer', 'employerGerman'] };

export function pendingTranslations(d) {
  const todo = [];
  for (const [list, [src, dst]] of Object.entries(PAIRS)) (d[list] || []).forEach((e, i) => { if (e?.[src] && !e[dst]) todo.push({ list, i, dst, name: e[src] }); });
  return todo;
}

export async function translateNames(names) {
  if (!process.env.GEMINI_API_KEY || !names.length) return null;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: RULES }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(names) }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: { type: 'array', items: { type: 'string' } } },
  });
  for (const model of GEMINI_MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body, signal: AbortSignal.timeout(15000),
    }).catch(() => null);
    if (!r) continue;
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const out = JSON.parse(j.candidates?.[0]?.content?.parts?.map(x => x.text || '').join('') || '[]');
      return Array.isArray(out) && out.length === names.length ? out.map(x => String(x || '').trim().slice(0, 200)) : null;
    }
    if (![429, 503, 404].includes(r.status)) break;
  }
  return null;
}

// Mutates `d`: fills every missing German name it can. Returns how many were filled.
export async function fillGermanNames(d) {
  const todo = pendingTranslations(d);
  if (!todo.length) return 0;
  const names = [...new Set(todo.map(t => t.name))], de = await translateNames(names);
  if (!de) return 0;
  const map = Object.fromEntries(names.map((n, i) => [n, de[i]]));
  let n = 0;
  for (const t of todo) if (map[t.name]) { d[t.list][t.i][t.dst] = map[t.name]; n++; }
  return n;
}
