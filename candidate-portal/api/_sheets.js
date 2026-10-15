import { candidateSummary } from '../public/schema.js';
import { cvSig, siteUrl } from './_lib.js';

// Sends one candidate to the Google Sheet (Apps Script web app). Re-sending the same reference replaces its row.
export const sheetsEnabled = () => !!(process.env.SHEETS_WEBHOOK_URL && process.env.SHEETS_SECRET);

export async function pushToSheet(item, req) {
  if (!sheetsEnabled()) return { skipped: true };
  const sm = candidateSummary(item.data);
  const row = {
    ref: item.ref,
    submitted: new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
    name: sm.name, age: sm.age, degree: sm.degree, totalExp: sm.totalExp, department: sm.department,
    currentlyWorking: sm.currentlyWorking, germanCert: sm.germanCert, gaps: sm.gaps,
    cvName: sm.cvName, cvUrl: sm.cvPath ? `${siteUrl(req)}/api/cv?ref=${encodeURIComponent(item.ref)}&sig=${cvSig(item.ref)}` : '',
  };
  const r = await fetch(process.env.SHEETS_WEBHOOK_URL, {
    method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, redirect: 'follow',
    body: JSON.stringify({ secret: process.env.SHEETS_SECRET, row }), signal: AbortSignal.timeout(20000),
  });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { throw new Error(`Sheet returned an unexpected answer (HTTP ${r.status}).`); }
  if (!j.ok) throw new Error(j.error || 'The sheet rejected the row.');
  return { ok: true };
}
