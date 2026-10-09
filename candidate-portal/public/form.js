import { STEPS, FORM_STEPS, DOC_KINDS, NOTES, COUNTRIES, TIMEZONES, validate, sections, visible, required, experience, months, today, spanLabel, gaps } from './schema.js';

const KEY = 'candidate-form-draft', MAX = 10 * 1024 * 1024, TYPES = ['application/pdf', 'image/jpeg', 'image/png'], ACCEPT = '.pdf,.jpg,.jpeg,.png';
const AC = { firstName: 'given-name', middleName: 'additional-name', lastName: 'family-name', dateOfBirth: 'bday', email: 'email', address: 'street-address', currentCity: 'address-level2' };
const N = FORM_STEPS.length, app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const uploading = {}, previews = {}, slotField = {}, multiField = {}, filters = {};
const fresh = () => ({ data: {}, step: 0, seen: 0, session: crypto.randomUUID() });
let st, D, dirty = false, reading = null; // `reading` is the in-flight CV extraction, if any

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.session && s.data) return s; } catch {}
  return fresh();
}
function init(s) {
  st = s; D = st.data;
  // Drafts saved before the Education split kept qualifications under `education`; carry them into `college`.
  if (Array.isArray(D.education) && !D.college) {
    D.college = D.education.map(e => ({ institution: e.institution, country: e.country, startDate: e.startDate, endDate: e.endDate, certificate: e.certificate }));
    delete D.education;
  }
  // Older drafts stored speaking/reading/writing separately; keep the speaking level as fluency.
  for (const l of D.languages || []) if (l && !l.fluency && l.speaking) l.fluency = l.speaking;
  // Start/end dates used to be month-only; give them a day so the date inputs accept them.
  for (const x of STEPS) for (const g of x.groups) for (const e of g.repeat ? D[g.key] || [] : [D[g.key] || {}])
    for (const f of g.fields) if (f.t === 'date' && /^\d{4}-\d{2}$/.test(e?.[f.k] || '')) e[f.k] += '-01';
  for (const x of STEPS) for (const g of x.groups) D[g.key] ??= g.repeat ? (g.repeat.min ? [{}] : []) : {};
  D.notes ??= {}; D.consent ??= {};
}
function save() {
  dirty = false;
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { return; }
  if (st.step) document.getElementById('saved').textContent = `Progress saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
const get = p => p.split('.').reduce((o, k) => o?.[k], D);
function set(p, v) {
  const k = p.split('.'), last = k.pop(), o = k.reduce((o, x) => o?.[x], D);
  if (o) { o[last] = v; dirty = true; }
}
const errors = () => validate(D, { step: FORM_STEPS[st.step - 1], client: 1 });
let tt;
function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.className = 'show'; clearTimeout(tt); tt = setTimeout(() => t.className = '', 4000); }

/* ---------- views ---------- */

function render() {
  const s = st.step;
  app.innerHTML = s === 0 ? intro() : s <= N ? stepView(FORM_STEPS[s - 1]) : review();
  if (s >= 1 && s <= N) { paintTotal(); if (st.show) showErrors(errors()); }
}

function stepper(cur) {
  const pct = cur >= N ? 100 : Math.round((cur + 1) / N * 100);
  return `<ol class="stepper">${FORM_STEPS.map((x, i) => `<li class="${i < cur ? 'past' : i === cur ? 'cur' : ''}"><button type="button" data-act="go" data-s="${i + 1}"${i + 1 > st.seen ? ' disabled' : ''} aria-label="Step ${i + 1}: ${x.short}${i < cur ? ' (completed)' : ''}"><i>${i < cur ? '✓' : ''}</i><span>${x.short}</span></button></li>`).join('')}</ol>
<div class="prog"><span>${cur >= N ? 'Review' : `Step ${cur + 1} of ${N}`}</span><span>${pct}% Complete</span></div>`;
}

const DOCS = STEPS.find(x => x.key === 'documents').groups[0];
// Uploaded documents that can be read, in priority order, as [{ kind, path }].
const docList = () => DOCS.fields.filter(f => f.intro && DOC_KINDS[f.k]).flatMap(f => (D.documents[f.k] || []).map(x => ({ kind: f.k, path: x.path })));
const docsKey = () => docList().map(d => d.path).join('|');
const introState = () => { const n = docList().length, fresh = n && docsKey() !== st.docsRead; return { n, fresh,
  status: st.docsRead && !fresh ? 'Your CV has been read. Continue to check each page.' : fresh ? 'When you continue, we will read your CV and fill in the form.' : '',
  button: fresh ? 'Read my CV & continue' : n ? 'Continue' : 'Start without a CV' }; };
// Keeps the intro's status line and button in step with the uploaded documents without re-rendering the slots.
function paintIntro() {
  if (st.step !== 0) return;
  const { status, button } = introState(), el = document.getElementById('cv-status'), b = app.querySelector('[data-act=go][data-s="1"]');
  if (el) el.textContent = status; if (b) b.textContent = button;
}
function intro() {
  const { status, button } = introState();
  return `<section class="card intro">
<h2>Welcome</h2>
<p>This form collects the details we need for your application. It takes about 15 minutes.</p>
<p>Your answers are saved automatically on this device, so you can come back later and continue.</p>
<h3>Start with your CV <span class="tag">Required</span></h3>
<p class="note">We read your CV and fill in as much of the form as we can. You can check and change everything afterwards. Other documents are asked for at the end.</p>
<div class="grid">${DOCS.fields.filter(f => f.intro).map(f => field(f, D.documents, 'documents')).join('')}</div>
<p class="note" id="cv-status">${status}</p>
</section><div class="nav"><button type="button" class="btn primary" data-act="go" data-s="1">${button}</button></div>`;
}
// Shown while the documents are being read, so step 1 never appears empty and then fills itself.
function loading(n) {
  return `<section class="card done"><div class="spin" aria-hidden="true"></div><h2>Reading your ${n === 1 ? 'CV' : `${n} documents`}…</h2><p>We are filling in your details for you. This usually takes under a minute.</p><p class="note">Please wait — the next page will open automatically.</p><div class="nav" style="justify-content:center"><button type="button" class="btn" data-act="skipcv">Skip and type myself</button></div></section>`;
}

function stepView(x) {
  let h = stepper(st.step - 1) + `<section class="card"><h2>${x.title}</h2>${x.note ? `<p class="note">${x.note}</p>` : ''}`;
  for (const g of x.groups) {
    if (g.title) h += `<h3>${g.title}</h3>`;
    if (!g.repeat) { h += grid(g, D[g.key], g.key); continue; }
    const a = D[g.key], r = g.repeat;
    if (!a.length && r.none) h += `<p class="note">${r.none}</p>`;
    if (g.timeline) h += '<div class="tl">';
    a.forEach((e, i) => {
      const span = g.timeline ? spanLabel(e) : '';
      h += `<div class="entry"><div class="entry-h"><b>${r.item} ${i + 1}${span ? `<small>${esc(span)}</small>` : ''}</b>${a.length > r.min ? `<button type="button" class="link" data-act="rm" data-g="${g.key}" data-i="${i}">Delete</button>` : ''}</div>${grid(g, e, `${g.key}.${i}`)}</div>`;
    });
    if (g.timeline) h += '</div>';
    h += `<div data-f="${g.key}"><div class="err"></div></div>`;
    if (a.length < r.max) h += `<button type="button" class="add" data-act="add" data-g="${g.key}">+ ${r.add}</button>`;
    if (g.key === 'employment') h += '<p class="total" id="total"></p>';
  }
  if (x.groups.some(g => g.timeline)) {
    const miss = gaps(timelineLists());
    h += `<div class="gap" id="gaps"${miss.length ? '' : ' hidden'}>${gapText(miss)}</div>`;
  }
  h += `<h3>Notes</h3>${field({ ...NOTES, k: x.key }, D.notes, 'notes')}`;
  return h + `</section><div class="nav"><button type="button" class="btn" data-act="go" data-s="${st.step - 1}">Back</button><button type="button" class="btn primary" data-act="next">${st.ret ? 'Save &amp; Return to Review' : 'Save &amp; Continue'}</button></div>`;
}
const gapText = miss => miss.length ? `<b>Your timeline has a gap:</b> ${esc(miss.join('; '))}. Please add what you did during this time (for example schooling, a course, a job or a career break) so nothing is missing.` : '';
// Schooling, college, jobs and breaks share one timeline, whichever page they are entered on.
const timelineLists = () => FORM_STEPS.flatMap(x => x.groups.filter(g => g.timeline).map(g => D[g.key]));
function paintGaps() {
  const el = document.getElementById('gaps'); if (!el) return;
  const miss = gaps(timelineLists());
  el.innerHTML = gapText(miss); el.hidden = !miss.length;
  app.querySelectorAll('.tl .entry').forEach(en => {
    const [g, i] = en.querySelector('[data-p]')?.dataset.p.split('.') || [];
    const small = en.querySelector('.entry-h small'), span = g && D[g]?.[i] ? spanLabel(D[g][i]) : '';
    if (small) small.textContent = span; else if (span) en.querySelector('.entry-h b').insertAdjacentHTML('beforeend', `<small>${esc(span)}</small>`);
  });
}
const grid = (g, s, base) => `<div class="grid">${g.fields.filter(f => !f.intro).map(f => field(f, s, base)).join('')}</div>`;

function field(f, s, base) {
  if (!visible(f, s, D)) return '';
  const p = `${base}.${f.k}`, v = s[f.k], id = 'f-' + p.replace(/\./g, '-');
  const req = required(f, s, D) ? ' <b aria-hidden="true">*</b>' : '', cls = `fld${f.half ? ' half' : f.third ? ' third' : ''}`;
  if (f.t === 'check') return `<label class="chk ${cls}"><input type="checkbox" data-p="${p}"${v ? ' checked' : ''}><span>${esc(f.l)}</span></label>`;
  if (f.t === 'file') { slotField[p] = f; return `<div class="${cls}" data-f="${p}"><div class="lbl">${esc(f.l)}${req}</div><div class="slot" data-slot="${p}">${slot(p)}</div><div class="err"></div></div>`; }
  let input;
  if (f.t === 'multi') {
    const sel = Array.isArray(v) ? v : [], long = f.o.length > 12, q = (filters[p] || '').toLowerCase();
    multiField[p] = f;
    input = (long ? `<input type="search" data-filter="${p}" placeholder="Search ${esc(f.l.toLowerCase())}…" aria-label="Search ${esc(f.l)}" value="${esc(filters[p])}" style="margin-bottom:8px">` : '')
      + `<div class="opts multi${long ? ' long' : ''}" role="group" aria-labelledby="${id}-l">${f.o.map(o => `<label class="opt"${q && !o.toLowerCase().includes(q) ? ' hidden' : ''}><input type="checkbox" data-p="${p}" data-m value="${esc(o)}"${sel.includes(o) ? ' checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`
      + (long && sel.length ? `<div class="picked">Selected: ${esc(sel.join(', '))}</div>` : '');
  } else if (f.t === 'radio') input = `<div class="opts" role="radiogroup" aria-labelledby="${id}-l">${f.o.map(o => `<label class="opt"><input type="radio" name="${id}" data-p="${p}" value="${esc(o)}"${v === o ? ' checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
  else if (f.o || f.t === 'tz') {
    const o = f.o || (!v || TIMEZONES.includes(v) ? TIMEZONES : [v, ...TIMEZONES]);
    input = `<select id="${id}" data-p="${p}"><option value="">Select…</option>${o.map(x => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  } else if (f.t === 'textarea') input = `<textarea id="${id}" data-p="${p}" rows="3" maxlength="2000"${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}>${esc(v)}</textarea>`;
  else if (f.t === 'phone') {
    const [c = '', n = ''] = (v || '').split(' ');
    input = `<div class="phone"><input data-p="${p}" data-part="c" aria-label="Country code" inputmode="tel" autocomplete="tel-country-code" placeholder="+91" maxlength="5" value="${esc(c)}"><input id="${id}" data-p="${p}" data-part="n" inputmode="numeric" autocomplete="tel-national" placeholder="Mobile number" maxlength="14" value="${esc(n)}"></div>`;
  } else {
    const type = f.t === 'date' || f.t === 'month' ? f.t : f.t === 'email' ? 'email' : 'text', len = f.t === 'date' ? 10 : 7;
    input = `<input id="${id}" data-p="${p}" type="${type}" value="${esc(v)}" maxlength="200"`
      + (f.t === 'country' ? ' list="countries" autocomplete="off"' : AC[f.k] ? ` autocomplete="${AC[f.k]}"` : '')
      + (f.ph || f.t === 'month' ? ` placeholder="${esc(f.ph || 'YYYY-MM')}"` : '')
      + (f.past ? ` max="${today().slice(0, len)}"` : '') + (f.future ? ` min="${today().slice(0, len)}"` : '') + '>';
  }
  const lab = f.t === 'radio' || f.t === 'multi' ? `<div class="lbl" id="${id}-l">${esc(f.l)}${req}</div>` : `<label class="lbl" for="${id}">${esc(f.l)}${req}</label>`;
  return `<div class="${cls}" data-f="${p}">${lab}${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}<div class="err"></div></div>`;
}

const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.ceil(n / 1024) + ' KB';
function slot(p) {
  const f = slotField[p], files = get(p) || [], up = uploading[p] || [];
  return files.map((x, i) => {
    const u = previews[x.path], pdf = x.type === 'application/pdf';
    return `<div class="file">${u && !pdf ? `<img class="th" src="${u}" alt="">` : `<span class="th">${pdf ? 'PDF' : 'IMG'}</span>`}<span class="fn">${u ? `<a href="${u}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name)}<small>${kb(x.size)}</small></span><button type="button" class="x" data-del="${p}" data-i="${i}" aria-label="Remove ${esc(x.name)}">×</button></div>`;
  }).join('')
    + up.map(u => `<div class="file"><span class="th">…</span><span class="fn">${esc(u.name)}<span class="bar"><i style="width:${u.pct}%"></i></span></span></div>`).join('')
    + (f.multi || !files.length
      ? `<label class="drop"><input class="vh" type="file" data-up="${p}" accept="${ACCEPT}"${f.multi ? ' multiple' : ''}><b>${files.length ? 'Add another file' : 'Click to upload'}</b> or drag a file here<small>PDF / JPG / PNG · up to 10 MB</small></label>`
      : `<label class="replace"><input class="vh" type="file" data-up="${p}" accept="${ACCEPT}">Replace file</label>`);
}
function paintSlot(p) { const el = app.querySelector(`[data-slot="${p}"]`); if (el) el.innerHTML = slot(p); }
function fileErr(p, m) { const el = app.querySelector(`[data-f="${p}"]`); if (el) { el.querySelector('.err').textContent = m; el.classList.toggle('bad', !!m); } }
function paintTotal() { const el = document.getElementById('total'); if (el) { const m = experience(D.employment); el.textContent = m ? `Total Professional Experience: ${months(m)}` : ''; } }

function review() {
  const box = (k, l) => `<label class="chk"><input type="checkbox" data-p="consent.${k}"${D.consent[k] ? ' checked' : ''}><span>${l}</span></label>`;
  return stepper(N) + `<section class="card"><h2>Review Your Information</h2><p class="note">Please check everything carefully. Use Edit to change a section.</p>`
    + sections(D).map(s => `<div class="rv"><div class="rv-h"><h3>${s.title}</h3><button type="button" class="link" data-act="edit" data-s="${s.i + 1}">Edit</button></div><dl>${s.items.map(it => it.h ? `<dt class="sub">${esc(it.h)}</dt>` : `<dt>${esc(it.l)}</dt><dd>${it.files ? it.files.map(x => esc(x.name)).join('<br>') : esc(it.v)}</dd>`).join('')}</dl></div>`).join('')
    + `</section><section class="card"><h2>Declaration</h2>${box('accurate', 'I confirm that the information provided above is correct.')}${box('processing', 'I consent to the use of my information and documents for recruitment, interview coordination, candidate evaluation, and related processing.')}<div data-f="consent"><div class="err"></div></div></section>
<div class="nav"><button type="button" class="btn" data-act="go" data-s="${N}">Back</button><button type="button" class="btn primary" data-act="submit">Submit</button></div>`;
}

const done = ref => `<section class="card done"><div class="tick" aria-hidden="true">✓</div><h2>Submission Successful</h2><p>Thank you. Your information has been received successfully.</p><p class="note">Reference ID</p><p class="ref">${esc(ref)}</p><p>Our recruitment team will contact you if any additional information is required.</p></section>`;

/* ---------- actions ---------- */

function showErrors(e) {
  let first = null;
  app.querySelectorAll('[data-f]').forEach(el => { const m = e[el.dataset.f] || ''; el.querySelector('.err').textContent = m; el.classList.toggle('bad', !!m); if (m) first ??= el; });
  return first;
}
const busy = () => Object.values(uploading).some(a => a.length);

function go(s) { st.waiting = 0; if (s > N) st.ret = 0; st.step = s; st.seen = Math.max(st.seen, s); st.show = 0; save(); render(); scrollTo(0, 0); }

function next() {
  if (busy()) return toast('Please wait until your files finish uploading.');
  const first = showErrors(errors());
  if (!first) return go(st.ret ? N + 1 : st.step + 1);
  st.show = 1;
  first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  first.querySelector('input,select,textarea')?.focus({ preventScroll: true });
  toast('Please correct the highlighted fields.');
}

async function submit(b) {
  if (busy()) return toast('Please wait until your files finish uploading.');
  const e = validate(D, { client: 1 }), bad = Object.keys(e).find(k => k !== 'consent');
  if (bad) {
    const [grp, sub] = bad.split('.');
    st.ret = 1; go(bad === 'documents.cv' ? 0 : grp === 'notes' ? FORM_STEPS.findIndex(x => x.key === sub) + 1 : FORM_STEPS.findIndex(x => x.groups.some(g => g.key === grp)) + 1);
    st.show = 1; showErrors(errors());
    return toast('Some details are missing. Please complete the highlighted fields.');
  }
  if (e.consent) { showErrors(e); return toast(e.consent); }
  b.disabled = true; b.textContent = 'Submitting…';
  try {
    const r = await fetch('/api/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: st.session, data: D }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ref) throw new Error(j.error || 'Submission failed. Please check your connection and try again.');
    try { localStorage.removeItem(KEY); } catch {}
    init(fresh());
    document.getElementById('saved').textContent = '';
    app.innerHTML = done(j.ref); scrollTo(0, 0);
  } catch (err) { b.disabled = false; b.textContent = 'Submit'; toast(err.message); }
}

const put = (url, file, prog) => new Promise((ok, no) => {
  const x = new XMLHttpRequest();
  x.open('PUT', url);
  x.setRequestHeader('content-type', file.type);
  x.upload.onprogress = e => e.lengthComputable && prog(Math.round(e.loaded / e.total * 100));
  x.onload = () => x.status < 300 ? ok() : no(new Error('Upload failed. Please try again.'));
  x.onerror = () => no(new Error('Network error during upload. Please try again.'));
  x.send(file);
});

async function upload(p, list) {
  const f = slotField[p];
  for (const file of list.slice(0, f.multi ? 10 : 1)) {
    if (!TYPES.includes(file.type)) { fileErr(p, 'Only PDF, JPG or PNG files are allowed.'); continue; }
    if (file.size > MAX) { fileErr(p, 'This file is larger than 10 MB.'); continue; }
    fileErr(p, '');
    const u = { name: file.name, pct: 0 };
    (uploading[p] ||= []).push(u); paintSlot(p);
    try {
      const r = await fetch('/api/upload-url', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: st.session, type: file.type, size: file.size }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error);
      await put(j.url, file, n => { u.pct = n; paintSlot(p); });
      previews[j.path] = URL.createObjectURL(file);
      const item = { name: file.name.slice(0, 200), path: j.path, type: file.type, size: file.size };
      set(p, f.multi ? [...(get(p) || []), item] : [item]); save(); paintIntro();
    } catch (e) { fileErr(p, e.message || 'Upload failed. Please try again.'); }
    uploading[p] = uploading[p].filter(x => x !== u); paintSlot(p);
  }
}

// Asks the server to read every uploaded document and fills in answers the candidate has not typed yet.
function readDocs() { reading = readAll().finally(() => { reading = null; }); return reading; }
async function readAll() {
  const docs = docList(), key = docsKey();
  try {
    const r = await fetch('/api/parse-docs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: st.session, docs }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'We could not read your documents.');
    const n = applyResume(j.data || {});
    st.docsRead = key; save();
    if (st.waiting) go(1);
    toast(n ? `We filled in ${n} answer${n === 1 ? '' : 's'} from your documents. Please check them as you go.` : 'We could not find details to fill in from these documents. Please type them in.');
  } catch (e) {
    toast(`${e.message || 'We could not read your documents.'} They are saved — please type your answers.`);
    if (st.waiting) go(1);
  }
}
const filled = v => v != null && v !== '' && !(Array.isArray(v) && !v.length);
// Maps an extracted value onto the field's option list (exact, then case-insensitive containment); unmatched choices are dropped.
function coerce(f, v) {
  if (!f || v == null) return v;
  if (f.t === 'multi') return Array.isArray(v) ? v.map(x => coerce({ ...f, t: 'select' }, x)).filter(Boolean) : [];
  if (!f.o || typeof v !== 'string') return v;
  const s = v.trim().toLowerCase(); if (!s) return '';
  return f.o.find(o => o.toLowerCase() === s) || f.o.find(o => o.toLowerCase().includes(s)) || f.o.find(o => s.includes(o.toLowerCase())) || '';
}
// Merges extracted answers into the draft without overwriting anything already typed. Returns how many answers were filled.
function applyResume(x) {
  clearAutofill();
  let n = 0; const auto = st.auto = {};
  for (const stp of STEPS) for (const g of stp.groups) {
    const src = x[g.key]; if (!src) continue;
    const keys = new Set(g.fields.filter(f => f.t !== 'file').map(f => f.k));
    const fields = Object.fromEntries(g.fields.map(f => [f.k, f]));
    const fill = (dst, s, base) => { for (const k of keys) { const v = coerce(fields[k], s?.[k]); if (filled(v) && !filled(dst[k])) { dst[k] = v; auto[`${base}.${k}`] = JSON.stringify(v); n++; } } };
    if (!g.repeat) { fill(D[g.key], src, g.key); continue; }
    if (!Array.isArray(src)) continue;
    const typed = D[g.key].some(e => Object.values(e).some(filled));
    if (typed) continue;
    D[g.key] = src.slice(0, g.repeat.max).map((e, i) => { const o = {}; fill(o, e, `${g.key}.${i}`); return o; }).filter(o => Object.keys(o).length);
    if (!D[g.key].length && g.repeat.min) D[g.key] = [{}];
  }
  return n;
}
// Removes answers that came from an earlier CV and were not edited since, so a new CV starts clean while typed answers stay.
function clearAutofill() {
  for (const [p, v] of Object.entries(st.auto || {})) if (JSON.stringify(get(p)) === v) set(p, undefined);
  for (const stp of STEPS) for (const g of stp.groups) if (g.repeat) {
    D[g.key] = D[g.key].filter(e => Object.values(e).some(filled));
    if (!D[g.key].length && g.repeat.min) D[g.key] = [{}];
  }
  st.auto = {};
}

/* ---------- events ---------- */

app.addEventListener('input', e => {
  const t = e.target, p = t.dataset.p;
  if (t.dataset.filter) {
    const q = (filters[t.dataset.filter] = t.value).toLowerCase();
    t.nextElementSibling.querySelectorAll('.opt').forEach(o => o.hidden = !o.textContent.toLowerCase().includes(q));
    return;
  }
  if (!p || t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT') return;
  if (t.dataset.part) {
    const [c, n] = t.parentNode.querySelectorAll('input'), cd = c.value.replace(/\D/g, ''), nd = n.value.replace(/\D/g, '');
    if (c.value !== (cd ? '+' + cd : '')) c.value = cd ? '+' + cd : '';
    if (n.value !== nd) n.value = nd;
    set(p, nd ? `+${cd} ${nd}` : '');
  } else set(p, t.value);
  if (p.startsWith('employment.')) paintTotal();
  if (p.endsWith('Date')) paintGaps();
  if (st.show) showErrors(errors());
});

app.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.up) return upload(t.dataset.up, [...t.files]);
  const p = t.dataset.p;
  if (!p || !(t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT')) return;
  const multi = t.dataset.m !== undefined, box = t.closest('.long'), top = box?.scrollTop;
  if (multi) {
    // "No preference" clears the other choices, and any other choice clears "No preference"
    const f = multiField[p], cur = (get(p) || []).filter(x => x !== t.value);
    const next = !t.checked ? cur : t.value === f.none ? [t.value] : [...cur.filter(x => x !== f.none), t.value];
    set(p, next.sort((a, b) => f.o.indexOf(a) - f.o.indexOf(b)));
  } else set(p, t.type === 'checkbox' ? t.checked : t.value);
  save(); render();
  const el = app.querySelector(`[data-p="${p}"]${t.type === 'radio' || multi ? `[value="${CSS.escape(t.value)}"]` : ''}`);
  if (box) { const nb = el?.closest('.long'); if (nb) nb.scrollTop = top; }
  el?.focus({ preventScroll: true });
});

app.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const { act, s, g, i, del } = b.dataset;
  if (del) { set(del, get(del).filter((_, j) => j !== +i)); save(); paintSlot(del); return paintIntro(); }
  if (act === 'go') {
    if (+s === 1 && st.step === 0) {
      if (busy()) return toast('Please wait until your files finish uploading.');
      const docs = docList();
      if (docs.length && docsKey() !== st.docsRead) { if (!reading) readDocs(); st.waiting = 1; app.innerHTML = loading(docs.length); scrollTo(0, 0); return; }
    }
    go(+s);
  } else if (act === 'skipcv') { st.docsRead = docsKey(); go(1); }
  else if (act === 'edit') { st.ret = 1; go(+s); }
  else if (act === 'next') next();
  else if (act === 'submit') submit(b);
  else if (act === 'add') { D[g].push({}); save(); render(); [...app.querySelectorAll('.entry')].pop()?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  else if (act === 'rm' && confirm('Delete this entry?')) { D[g].splice(+i, 1); save(); render(); }
});

app.addEventListener('dragover', e => { const d = e.target.closest('.drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
app.addEventListener('dragleave', e => e.target.closest('.drop')?.classList.remove('over'));
app.addEventListener('drop', e => {
  const d = e.target.closest('.drop'); if (!d) return;
  e.preventDefault(); d.classList.remove('over');
  upload(d.querySelector('input').dataset.up, [...e.dataTransfer.files]);
});
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => e.preventDefault());

app.addEventListener('focusout', () => dirty && save());
document.addEventListener('visibilitychange', () => document.hidden && dirty && save());
setInterval(() => dirty && save(), 30000);

document.getElementById('countries').innerHTML = COUNTRIES.map(c => `<option value="${esc(c)}">`).join('');
init(load());
render();
