import crypto from 'node:crypto';
import { db, limited, BUCKET } from './_lib.js';
import { filePaths } from '../public/schema.js';

const authorized = k => {
  const a = Buffer.from(String(k || '')), b = Buffer.from(process.env.ADMIN_KEY || '');
  return b.length >= 12 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  if (limited(req, 'admin', 200)) return res.status(429).json({ error: 'Too many requests. Please wait a few minutes.' });
  if (!authorized(req.headers['x-admin-key'])) return res.status(401).json({ error: 'Unauthorized' });

  const sb = db(), ref = req.query.ref;
  if (!ref) {
    const { data, error } = await sb.from('submissions').select('ref,created_at,full_name,email,phone').order('created_at', { ascending: false }).limit(2000);
    return error ? res.status(500).json({ error: error.message }) : res.json({ items: data });
  }

  const { data: item, error } = await sb.from('submissions').select('*').eq('ref', String(ref)).maybeSingle();
  if (error || !item) return res.status(404).json({ error: 'Submission not found.' });
  const paths = filePaths(item.data), files = {};
  if (paths.length) {
    const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, 15 * 60); // links expire after 15 minutes
    for (const x of data || []) if (x.signedUrl) files[x.path] = x.signedUrl;
  }
  res.json({ item, files });
}
