import crypto from 'node:crypto';
import { db, guard, BUCKET, UUID } from './_lib.js';

const EXT = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

// Returns a one-time signed URL so the browser uploads straight to private storage.
export default async function handler(req, res) {
  if (guard(req, res, 'upload', 80)) return;
  const { session, type, size } = req.body || {};
  if (!UUID.test(String(session))) return res.status(400).json({ error: 'Invalid session. Please reload the page.' });
  if (!EXT[type]) return res.status(400).json({ error: 'Only PDF, JPG or PNG files are allowed.' });
  if (!(size > 0 && size <= 10 * 1024 * 1024)) return res.status(400).json({ error: 'Files must be 10 MB or smaller.' });
  const path = `${session.toLowerCase()}/${crypto.randomUUID()}.${EXT[type]}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) return res.status(500).json({ error: 'Upload is unavailable right now. Please try again.' });
  res.json({ url: data.signedUrl, path });
}
