import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// A fake Google: token endpoint + Sheets API, kept in memory.
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const sa = { client_email: 'bot@proj.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = Buffer.from(JSON.stringify(sa)).toString('base64');
process.env.SHEET_ID = 'SHEET123'; process.env.ADMIN_KEY = 'd49440286d1b28b28696b636';
delete process.env.SHEETS_WEBHOOK_URL;

const calls = [], store = { sheets: [], A: [], row2: null };
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url), body = init.body && typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : init.body;
  calls.push({ method: init.method || 'GET', path: u.pathname + u.search, body, auth: init.headers?.authorization });
  const json = (o, status = 200) => ({ ok: status < 300, status, json: async () => o });
  if (u.host === 'oauth2.googleapis.com') {
    const [h, c, s] = new URLSearchParams(init.body).get('assertion').split('.');
    assert.ok(crypto.createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(s, 'base64url')), 'JWT signature');
    assert.equal(JSON.parse(Buffer.from(c, 'base64url')).iss, sa.client_email);
    return json({ access_token: 'tok', expires_in: 3600 });
  }
  const p = decodeURIComponent(u.pathname);
  if (p.endsWith(':batchUpdate')) { if (body.requests[0].addSheet) { store.sheets.push('Candidates'); return json({ replies: [{ addSheet: { properties: { sheetId: 7, title: 'Candidates' } } }] }); } store.row2 = 'Ref ID'; return json({}); }
  if (u.search.includes('fields=sheets.properties')) return json({ sheets: store.sheets.map(t => ({ properties: { sheetId: 7, title: t } })) });
  if (p.includes('!A2:K2')) return json(store.row2 ? { values: [[store.row2]] } : {});
  if (p.includes('!A3:A2000') && (init.method || 'GET') === 'GET') return json({ values: store.A.map(v => [v]) });
  if (init.method === 'PUT') { const row = +p.match(/!A(\d+):K/)[1]; store.A[row - 3] = body.values[0][0]; store.last = body.values[0]; return json({}); }
  return json({ error: { message: 'unexpected ' + p } }, 400);
};
const { pushToSheet, layoutRequests } = await import('../api/_sheets.js');
const item = n => ({ ref: `CAND-${n}`, created_at: '2026-10-15T08:00:00Z', data: { basic: { firstName: '=SUM(1)', lastName: 'Sharma', dateOfBirth: '1995-03-14' }, college: [], schooling: [], employment: [], breaks: [], languages: [], documents: { cv: [{ path: 'a/b.pdf' }] } } });

test('first push builds the layout once, then writes the row', async () => {
  const r = await pushToSheet(item('A1'), { headers: { host: 'site.example' } });
  assert.deepEqual(r, { ok: true, row: 3 });
  assert.ok(calls.every(c => c.auth === 'Bearer tok' || c.path.includes('/token')));
  assert.equal(calls.filter(c => c.path.endsWith(':batchUpdate')).length, 2);           // add tab + layout
  const layout = calls.filter(c => c.path.endsWith(':batchUpdate'))[1].body.requests;
  assert.ok(layout.some(q => q.mergeCells) && layout.filter(q => q.addConditionalFormatRule).length === 8);
  assert.ok(layout.some(q => q.updateSheetProperties?.properties.gridProperties.frozenColumnCount === 4));
});
test('formula-like text is neutralised, the CV link stays a formula', () => {
  assert.equal(store.last[2], "'=SUM(1) Sharma");
  assert.match(store.last[10], /^=HYPERLINK\("https:\/\/site\.example\/api\/cv\?ref=CAND-A1&sig=[0-9a-f]{32}","'?=SUM\(1\) Sharma's CV\.pdf"\)$/);
});
test('re-sending replaces the same row; a new candidate gets the next row; layout is not rebuilt', async () => {
  const before = calls.filter(c => c.path.endsWith(':batchUpdate')).length;
  assert.equal((await pushToSheet(item('A1'), {})).row, 3);
  assert.equal((await pushToSheet(item('B2'), {})).row, 4);
  assert.equal(calls.filter(c => c.path.endsWith(':batchUpdate')).length, before);
  assert.deepEqual(store.A, ['CAND-A1', 'CAND-B2']);
});
test('layout requests are plain JSON with the expected columns', () => {
  const reqs = layoutRequests(7); JSON.parse(JSON.stringify(reqs));
  assert.equal(reqs.filter(q => q.updateDimensionProperties && q.updateDimensionProperties.range.dimension === 'COLUMNS').length, 11);
});
