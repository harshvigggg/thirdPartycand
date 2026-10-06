import { createClient } from '@supabase/supabase-js';

export const BUCKET = 'candidate-files';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Best-effort per-instance rate limit (serverless instances do not share memory).
const hits = new Map();
export function limited(req, name, max, windowMs = 10 * 60 * 1000) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const k = name + ip, now = Date.now(), list = (hits.get(k) || []).filter(t => now - t < windowMs);
  list.push(now); hits.set(k, list);
  return list.length > max;
}

// Common checks for JSON POST endpoints. Returns true if the request was rejected.
export function guard(req, res, name, max) {
  const stop = (code, error) => (res.status(code).json({ error }), true);
  if (req.method !== 'POST') return stop(405, 'Method not allowed.');
  const origin = req.headers.origin;
  if (origin) { try { if (new URL(origin).host !== req.headers.host) return stop(403, 'Forbidden.'); } catch { return stop(403, 'Forbidden.'); } }
  if (!String(req.headers['content-type'] || '').includes('application/json')) return stop(415, 'Unsupported request.');
  if (limited(req, name, max)) return stop(429, 'Too many requests. Please wait a few minutes and try again.');
  return false;
}
