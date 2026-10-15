import { db, guard, isAdmin } from './_lib.js';
import { pushToSheet, sheetsEnabled } from './_sheets.js';

// Admin action: (re-)send one candidate to the Google Sheet. Body: { ref }.
export default async function handler(req, res) {
  if (guard(req, res, 'sheets-sync', 200)) return;
  if (!isAdmin(req.headers['x-admin-key'])) return res.status(401).json({ error: 'Unauthorized' });
  if (!sheetsEnabled()) return res.status(503).json({ error: 'The Google Sheet is not connected yet (GOOGLE_SERVICE_ACCOUNT_JSON and SHEET_ID are not set).' });
  const ref = String(req.body?.ref || '');
  const { data: item } = await db().from('submissions').select('ref,created_at,data').eq('ref', ref).maybeSingle();
  if (!item) return res.status(404).json({ error: 'Submission not found.' });
  try { await pushToSheet(item, req); res.json({ ok: true }); }
  catch (e) { console.error('sheets-sync', e.message); res.status(502).json({ error: e.message }); }
}
