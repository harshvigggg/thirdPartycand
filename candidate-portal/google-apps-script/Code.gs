/**
 * Candidate sheet: one colour-coded row per candidate, fed by the website.
 *
 * Setup (once):
 *  1. In your Google Sheet: Extensions > Apps Script, paste this whole file, save.
 *  2. Project Settings (gear icon) > Script properties > Add property: SECRET = the secret from SHEETS_SETUP.md.
 *  3. Select the function  setup  and press Run (accept the permission prompt). It builds the layout.
 *  4. Deploy > New deployment > type "Web app": Execute as "Me", Who has access "Anyone". Copy the Web app URL.
 *  5. Put that URL in the website setting SHEETS_WEBHOOK_URL.
 * Re-running setup is safe: it rebuilds the layout without touching candidate rows.
 */

const TAB = 'Candidates';
const FIRST_DATA_ROW = 3, LAST_ROW = 2000;
// Columns in chronological order of a candidate's story: who -> education -> work -> German -> review flags -> document.
const COLS = [
  { key: 'ref',              head: 'Ref ID',               width: 120, group: 0 },
  { key: 'submitted',        head: 'Submitted',            width: 110, group: 0 },
  { key: 'name',             head: 'Name',                 width: 180, group: 1 },
  { key: 'age',              head: 'Age',                  width: 60,  group: 1 },
  { key: 'degree',           head: 'Degree',               width: 250, group: 2 },
  { key: 'totalExp',         head: 'Total Exp',            width: 140, group: 3 },
  { key: 'department',       head: 'Department',           width: 270, group: 3 },
  { key: 'currentlyWorking', head: 'Currently Working?',   width: 130, group: 3 },
  { key: 'germanCert',       head: 'B1/B2 Certificate',    width: 240, group: 4 },
  { key: 'gaps',             head: 'Timeline Gaps',        width: 210, group: 5 },
  { key: 'cv',               head: 'CV',                   width: 210, group: 6 },
];
// [label, band colour, header tint]
const GROUPS = [
  ['SUBMISSION', '#55505C', '#E9E6EE'],
  ['PERSON',     '#F26B5B', '#FDE2DE'],
  ['EDUCATION',  '#7B4FBF', '#E8DFF7'],
  ['WORK',       '#E8912D', '#FCE7CC'],
  ['GERMAN',     '#2A9D8F', '#D6EFEB'],
  ['REVIEW',     '#D6457B', '#F9DBE7'],
  ['DOCUMENT',   '#3A3A44', '#E4E4EA'],
];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(TAB) || ss.insertSheet(TAB, 0);
}

/** Builds headers, colours, widths, banding and status colours. Safe to run again. */
function setup() {
  const sh = sheet_(), n = COLS.length;
  sh.clearConditionalFormatRules();
  sh.getRange(1, 1, 2, n).breakApart();
  sh.setHiddenGridlines(true);
  sh.setTabColor('#F26B5B');
  if (sh.getMaxRows() < LAST_ROW) sh.insertRowsAfter(sh.getMaxRows(), LAST_ROW - sh.getMaxRows());

  const all = sh.getRange(1, 1, LAST_ROW, n);
  all.setFontFamily('Poppins').setFontSize(10).setVerticalAlignment('middle').setFontColor('#2B2B33');
  const data = sh.getRange(FIRST_DATA_ROW, 1, LAST_ROW - FIRST_DATA_ROW + 1, n);
  data.setWrap(true).setBorder(null, null, null, null, null, true, '#EFE7DD', SpreadsheetApp.BorderStyle.SOLID);

  // Row 1: coloured group bands, merged across their columns.
  GROUPS.forEach((g, gi) => {
    const idx = COLS.map((c, i) => c.group === gi ? i + 1 : 0).filter(Boolean);
    const r = sh.getRange(1, idx[0], 1, idx.length);
    if (idx.length > 1) r.merge();
    r.setValue(g[0]).setBackground(g[1]).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(9)
      .setHorizontalAlignment('center');
  });
  // Row 2: column headers in a soft tint of their group colour.
  COLS.forEach((c, i) => {
    const g = GROUPS[c.group];
    sh.getRange(2, i + 1).setValue(c.head).setBackground(g[2]).setFontColor('#2B2B33').setFontWeight('bold')
      .setHorizontalAlignment('center').setBorder(null, null, true, null, null, null, g[1], SpreadsheetApp.BorderStyle.SOLID_THICK);
    sh.setColumnWidth(i + 1, c.width);
  });
  sh.setRowHeight(1, 26); sh.setRowHeight(2, 38);
  // Freeze through Age (column 4): the SUBMISSION and PERSON bands are merged cells and may not be cut by the freeze line.
  sh.setFrozenRows(2); sh.setFrozenColumns(4);

  // Alignment per column.
  const col = k => COLS.findIndex(c => c.key === k) + 1;
  const colRange = k => sh.getRange(FIRST_DATA_ROW, col(k), LAST_ROW - FIRST_DATA_ROW + 1, 1);
  ['ref', 'submitted', 'age', 'currentlyWorking'].forEach(k => colRange(k).setHorizontalAlignment('center'));
  colRange('ref').setFontFamily('Roboto Mono').setFontSize(9).setFontColor('#6B6573');
  colRange('name').setFontWeight('bold').setFontSize(11);

  // Colour rules (first matching rule wins), then zebra stripes.
  const rules = [], rng = k => [colRange(k)];
  const rule = (k, formula, bg, fg) => rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula)
    .setBackground(bg).setFontColor(fg).setBold(true).setRanges(rng(k)).build());
  const L = k => colLetter_(col(k));
  rule('currentlyWorking', `=$${L('currentlyWorking')}${FIRST_DATA_ROW}="Yes"`, '#C9F1D8', '#14693A');
  rule('currentlyWorking', `=$${L('currentlyWorking')}${FIRST_DATA_ROW}="No"`, '#ECE8F2', '#5B5568');
  rule('gaps', `=$${L('gaps')}${FIRST_DATA_ROW}="None"`, '#C9F1D8', '#14693A');
  rule('gaps', `=LEN($${L('gaps')}${FIRST_DATA_ROW})>0`, '#FFD9CC', '#A23B14');
  rule('germanCert', `=REGEXMATCH($${L('germanCert')}${FIRST_DATA_ROW},"^(B2|C1|C2)")`, '#C9F1D8', '#14693A');
  rule('germanCert', `=REGEXMATCH($${L('germanCert')}${FIRST_DATA_ROW},"^B1")`, '#FFEFB8', '#7A5A00');
  rule('germanCert', `=LEN($${L('germanCert')}${FIRST_DATA_ROW})>0`, '#F9DADA', '#9B2C2C');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=ISEVEN(ROW())`).setBackground('#FFF8F1').setRanges([data]).build());
  sh.setConditionalFormatRules(rules);
}

function colLetter_(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

/** Receives one candidate from the website and inserts or replaces their row (matched by Ref ID). */
function doPost(e) {
  const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'Bad request.' }); }
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!secret || body.secret !== secret) return out({ ok: false, error: 'Wrong secret.' });
  const r = body.row || {};
  if (!r.ref) return out({ ok: false, error: 'Missing reference.' });

  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = sheet_();
    if (sh.getRange(2, 1).getValue() !== COLS[0].head) setup();
    const refCol = sh.getRange(FIRST_DATA_ROW, 1, LAST_ROW - FIRST_DATA_ROW + 1, 1);
    const found = refCol.createTextFinder(String(r.ref)).matchEntireCell(true).findNext();
    let row = found ? found.getRow() : 0;
    if (!row) { const filled = refCol.getValues().findIndex(v => v[0] === ''); row = FIRST_DATA_ROW + (filled === -1 ? LAST_ROW - FIRST_DATA_ROW : filled); }
    const values = COLS.map(c => c.key === 'cv' ? '' : (r[c.key] === undefined ? '' : r[c.key]));
    sh.getRange(row, 1, 1, COLS.length).setValues([values]);
    const cvCell = sh.getRange(row, COLS.findIndex(c => c.key === 'cv') + 1);
    if (r.cvUrl) cvCell.setFormula('=HYPERLINK("' + String(r.cvUrl).replace(/"/g, '""') + '","' + String(r.cvName || 'CV').replace(/"/g, '""') + '")').setFontColor('#7B4FBF').setFontLine('underline');
    else cvCell.setValue('—').setFontColor('#999999').setFontLine('none');
    return out({ ok: true, row: row });
  } finally { lock.releaseLock(); }
}

function doGet() { return ContentService.createTextOutput('Candidate sheet endpoint is running.'); }
