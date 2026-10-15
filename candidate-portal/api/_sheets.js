import crypto from 'node:crypto';
import { candidateSummary } from '../public/schema.js';
import { cvSig, siteUrl } from './_lib.js';

// Sends one candidate to a Google Sheet as one colour-coded row. Two ways to connect, tried in this order:
//  1. A Google service account + the Sheets API  (GOOGLE_SERVICE_ACCOUNT_JSON + SHEET_ID)       <- recommended, see SHEETS_SETUP.md
//  2. An Apps Script web app                      (SHEETS_WEBHOOK_URL + SHEETS_SECRET)           <- legacy fallback
// Re-sending a candidate replaces their row (matched on the Ref ID column).
const TAB = 'Candidates', FIRST = 3, LAST = 2000;
const COLS = [
  { key: 'ref', head: 'Ref ID', w: 120, g: 0 }, { key: 'submitted', head: 'Submitted', w: 110, g: 0 },
  { key: 'name', head: 'Name', w: 180, g: 1 }, { key: 'age', head: 'Age', w: 60, g: 1 },
  { key: 'degree', head: 'Degree', w: 250, g: 2 },
  { key: 'totalExp', head: 'Total Exp', w: 140, g: 3 }, { key: 'department', head: 'Department', w: 270, g: 3 }, { key: 'currentlyWorking', head: 'Currently Working?', w: 130, g: 3 },
  { key: 'germanCert', head: 'B1/B2 Certificate', w: 240, g: 4 }, { key: 'gaps', head: 'Timeline Gaps', w: 210, g: 5 }, { key: 'cv', head: 'CV', w: 210, g: 6 },
];
// [label, band colour, header tint]
const GROUPS = [['SUBMISSION', '#55505C', '#E9E6EE'], ['PERSON', '#F26B5B', '#FDE2DE'], ['EDUCATION', '#7B4FBF', '#E8DFF7'], ['WORK', '#E8912D', '#FCE7CC'], ['GERMAN', '#2A9D8F', '#D6EFEB'], ['REVIEW', '#D6457B', '#F9DBE7'], ['DOCUMENT', '#3A3A44', '#E4E4EA']];

export const sheetsEnabled = () => !!((process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.SHEET_ID) || (process.env.SHEETS_WEBHOOK_URL && process.env.SHEETS_SECRET));

export function rowFor(item, req) {
  const sm = candidateSummary(item.data);
  return {
    ref: item.ref,
    submitted: new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
    name: sm.name, age: sm.age, degree: sm.degree, totalExp: sm.totalExp, department: sm.department,
    currentlyWorking: sm.currentlyWorking, germanCert: sm.germanCert, gaps: sm.gaps,
    cvName: sm.cvName, cvUrl: sm.cvPath ? `${siteUrl(req)}/api/cv?ref=${encodeURIComponent(item.ref)}&sig=${cvSig(item.ref)}` : '',
  };
}

export async function pushToSheet(item, req) {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.SHEET_ID) return pushViaApi(rowFor(item, req));
  if (process.env.SHEETS_WEBHOOK_URL && process.env.SHEETS_SECRET) return pushViaWebhook(rowFor(item, req));
  return { skipped: true };
}

/* ---------- legacy: Apps Script web app ---------- */
async function pushViaWebhook(row) {
  const r = await fetch(process.env.SHEETS_WEBHOOK_URL, {
    method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, redirect: 'follow',
    body: JSON.stringify({ secret: process.env.SHEETS_SECRET, row }), signal: AbortSignal.timeout(20000),
  });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { throw new Error(`Sheet returned an unexpected answer (HTTP ${r.status}). The web app must allow "Anyone" access.`); }
  if (!j.ok) throw new Error(j.error || 'The sheet rejected the row.');
  return { ok: true };
}

/* ---------- Google service account + Sheets API ---------- */
const b64u = x => Buffer.from(x).toString('base64url');
const credentials = () => {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
  const sa = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  if (!sa.client_email || !sa.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not a service-account key file.');
  return sa;
};
let token = null;
async function accessToken() {
  if (token && token.exp > Date.now() + 60000) return token.value;
  const sa = credentials(), now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google sign-in failed: ${j.error_description || j.error || r.status}`);
  token = { value: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return token.value;
}
async function api(path, init = {}) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}${path}`, {
    ...init, headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' }, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const m = j.error?.message || `HTTP ${r.status}`;
    throw new Error(r.status === 403 || r.status === 404 ? `${m} — share the sheet with ${credentials().client_email} as Editor and check SHEET_ID.` : m);
  }
  return j;
}
const rgb = h => ({ red: parseInt(h.slice(1, 3), 16) / 255, green: parseInt(h.slice(3, 5), 16) / 255, blue: parseInt(h.slice(5, 7), 16) / 255 });
const A1 = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const colIdx = k => COLS.findIndex(c => c.key === k);

// Builds the coloured layout once (when the tab or its header row is missing).
export function layoutRequests(sheetId) {
  const n = COLS.length, R = (r0, r1, c0, c1) => ({ sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 });
  const reqs = [
    { updateSheetProperties: { properties: { sheetId, tabColorStyle: { rgbColor: rgb('#F26B5B') }, gridProperties: { rowCount: LAST, columnCount: Math.max(n, 11), frozenRowCount: 2, frozenColumnCount: 4, hideGridlines: true } },
      fields: 'tabColorStyle,gridProperties(rowCount,columnCount,frozenRowCount,frozenColumnCount,hideGridlines)' } },
    // base look for everything
    { repeatCell: { range: R(0, LAST, 0, n), cell: { userEnteredFormat: { verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP', textFormat: { fontFamily: 'Poppins', fontSize: 10, foregroundColorStyle: { rgbColor: rgb('#2B2B33') } } } },
      fields: 'userEnteredFormat(verticalAlignment,wrapStrategy,textFormat)' } },
    { updateBorders: { range: R(FIRST - 1, LAST, 0, n), innerHorizontal: { style: 'SOLID', colorStyle: { rgbColor: rgb('#EFE7DD') } } } },
  ];
  // group bands (row 1, merged) and header cells (row 2)
  GROUPS.forEach(([label, band], gi) => {
    const idx = COLS.map((c, i) => c.g === gi ? i : -1).filter(i => i >= 0), a = idx[0], b = idx[idx.length - 1] + 1;
    if (idx.length > 1) reqs.push({ mergeCells: { range: R(0, 1, a, b), mergeType: 'MERGE_ALL' } });
    reqs.push({ repeatCell: { range: R(0, 1, a, b), cell: { userEnteredValue: { stringValue: label }, userEnteredFormat: { backgroundColor: rgb(band), horizontalAlignment: 'CENTER', textFormat: { bold: true, fontSize: 9, fontFamily: 'Poppins', foregroundColorStyle: { rgbColor: rgb('#FFFFFF') } } } },
      fields: 'userEnteredValue,userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)' } });
  });
  COLS.forEach((c, i) => {
    const [, band, tint] = GROUPS[c.g];
    reqs.push({ repeatCell: { range: R(1, 2, i, i + 1), cell: { userEnteredValue: { stringValue: c.head }, userEnteredFormat: { backgroundColor: rgb(tint), horizontalAlignment: 'CENTER', textFormat: { bold: true, fontFamily: 'Poppins', fontSize: 10, foregroundColorStyle: { rgbColor: rgb('#2B2B33') } },
      borders: { bottom: { style: 'SOLID_THICK', colorStyle: { rgbColor: rgb(band) } } } } }, fields: 'userEnteredValue,userEnteredFormat(backgroundColor,horizontalAlignment,textFormat,borders)' } });
    reqs.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: c.w }, fields: 'pixelSize' } });
  });
  reqs.push({ updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 26 }, fields: 'pixelSize' } },
            { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 38 }, fields: 'pixelSize' } });
  // column styles
  for (const k of ['ref', 'submitted', 'age', 'currentlyWorking']) reqs.push({ repeatCell: { range: R(FIRST - 1, LAST, colIdx(k), colIdx(k) + 1), cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } }, fields: 'userEnteredFormat.horizontalAlignment' } });
  reqs.push({ repeatCell: { range: R(FIRST - 1, LAST, 0, 1), cell: { userEnteredFormat: { textFormat: { fontFamily: 'Roboto Mono', fontSize: 9, foregroundColorStyle: { rgbColor: rgb('#6B6573') } } } }, fields: 'userEnteredFormat.textFormat' } },
            { repeatCell: { range: R(FIRST - 1, LAST, colIdx('name'), colIdx('name') + 1), cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 11, fontFamily: 'Poppins' } } }, fields: 'userEnteredFormat.textFormat' } });
  // colour rules: first matching rule wins, zebra stripes last
  const rules = [], rule = (k, formula, bg, fg) => rules.push({ ranges: [R(FIRST - 1, LAST, colIdx(k), colIdx(k) + 1)], booleanRule: { condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: formula }] },
    format: { backgroundColor: rgb(bg), textFormat: { bold: true, foregroundColorStyle: { rgbColor: rgb(fg) } } } } });
  const L = k => A1(colIdx(k) + 1);
  rule('currentlyWorking', `=$${L('currentlyWorking')}${FIRST}="Yes"`, '#C9F1D8', '#14693A');
  rule('currentlyWorking', `=$${L('currentlyWorking')}${FIRST}="No"`, '#ECE8F2', '#5B5568');
  rule('gaps', `=$${L('gaps')}${FIRST}="None"`, '#C9F1D8', '#14693A');
  rule('gaps', `=LEN($${L('gaps')}${FIRST})>0`, '#FFD9CC', '#A23B14');
  rule('germanCert', `=REGEXMATCH($${L('germanCert')}${FIRST},"^(B2|C1|C2)")`, '#C9F1D8', '#14693A');
  rule('germanCert', `=REGEXMATCH($${L('germanCert')}${FIRST},"^B1")`, '#FFEFB8', '#7A5A00');
  rule('germanCert', `=LEN($${L('germanCert')}${FIRST})>0`, '#F9DADA', '#9B2C2C');
  rules.push({ ranges: [R(FIRST - 1, LAST, 0, n)], booleanRule: { condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: '=ISEVEN(ROW())' }] }, format: { backgroundColor: rgb('#FFF8F1') } } });
  rules.forEach((r, i) => reqs.push({ addConditionalFormatRule: { rule: r, index: i } }));
  return reqs;
}

// Text that starts like a formula must not be executed by the sheet.
const safe = v => typeof v === 'string' && /^[=+\-@]/.test(v) ? `'${v}` : v;
const esc = s => String(s).replace(/"/g, '""');
const q = `'${TAB}'`;

async function ensureLayout() {
  const meta = await api('?fields=sheets.properties(sheetId,title)');
  let sheet = meta.sheets?.find(s => s.properties.title === TAB);
  if (!sheet) {
    const added = await api(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TAB, index: 0 } } }] }) });
    sheet = { properties: added.replies[0].addSheet.properties };
  }
  const head = await api(`/values/${encodeURIComponent(`${q}!A2:K2`)}`);
  if (head.values?.[0]?.[0] !== COLS[0].head) await api(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: layoutRequests(sheet.properties.sheetId) }) });
}

async function pushViaApi(r) {
  await ensureLayout();
  const col = await api(`/values/${encodeURIComponent(`${q}!A${FIRST}:A${LAST}`)}`);
  const refs = (col.values || []).map(v => v[0]);
  const at = refs.indexOf(r.ref), row = FIRST + (at >= 0 ? at : refs.length);
  if (row > LAST) throw new Error('The sheet is full (2000 candidates). Add a new tab or raise LAST in api/_sheets.js.');
  const values = COLS.map(c => c.key === 'cv' ? (r.cvUrl ? `=HYPERLINK("${esc(r.cvUrl)}","${esc(r.cvName || 'CV')}")` : '—') : (r[c.key] ?? ''));
  await api(`/values/${encodeURIComponent(`${q}!A${row}:${A1(COLS.length)}${row}`)}?valueInputOption=USER_ENTERED`, { method: 'PUT', body: JSON.stringify({ values: [values.map((v, i) => COLS[i].key === 'cv' ? v : safe(v))] }) });
  return { ok: true, row };
}
