import crypto from 'node:crypto';
import { db, guard, UUID } from './_lib.js';
import { normalize, validate, filePaths } from '../public/schema.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const refId = () => 'CAND-' + Array.from(crypto.randomBytes(8), b => ALPHABET[b % 32]).join('');

export default async function handler(req, res) {
  if (guard(req, res, 'submit', 10)) return;
  const { session, data } = req.body || {};
  if (!UUID.test(String(session))) return res.status(400).json({ error: 'Invalid session. Please reload the page.' });

  const clean = normalize(data), fields = validate(clean);
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Some answers are missing or invalid. Please review the form.', fields });
  if (filePaths(clean).some(p => !p.startsWith(session.toLowerCase() + '/'))) return res.status(400).json({ error: 'Please upload your documents again.' });

  const p = clean.personal, sb = db();
  for (let i = 0; i < 3; i++) {
    const ref = refId();
    const { error } = await sb.from('submissions').insert({
      ref, data: clean, email: clean.contact.email, phone: clean.contact.phone,
      full_name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' '),
    });
    if (!error) return res.json({ ref });
    if (error.code !== '23505') break; // retry only on duplicate reference
  }
  res.status(500).json({ error: 'We could not save your submission. Please try again.' });
}
