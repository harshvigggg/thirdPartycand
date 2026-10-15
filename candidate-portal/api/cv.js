import { db, BUCKET, limited, cvSig } from './_lib.js';
import { fileNames } from '../public/schema.js';
import crypto from 'node:crypto';

// Opens a candidate's CV from the Google Sheet link: checks the signature, then redirects to a fresh 1-minute download URL.
export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'GET') return res.status(405).end('Method not allowed.');
  if (limited(req, 'cv', 120)) return res.status(429).end('Too many requests.');
  const { ref, sig } = req.query || {};
  const want = Buffer.from(cvSig(String(ref || ''))), got = Buffer.from(String(sig || ''));
  if (!process.env.ADMIN_KEY || want.length !== got.length || !crypto.timingSafeEqual(want, got)) return res.status(403).end('This link is not valid.');
  const { data: item } = await db().from('submissions').select('data').eq('ref', String(ref)).maybeSingle();
  const path = item?.data?.documents?.cv?.[0]?.path;
  if (!path) return res.status(404).end('No CV on file.');
  const { data } = await db().storage.from(BUCKET).createSignedUrl(path, 60, { download: fileNames(item.data)[path] });
  if (!data?.signedUrl) return res.status(500).end('Could not open the file.');
  res.status(302).setHeader('location', data.signedUrl).end();
}
