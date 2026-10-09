import { sections, timelineGaps } from './schema.js';

const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const when = t => new Date(t).toLocaleString();
let key = '', vals = [];
try { key = sessionStorage.getItem('k') || ''; } catch {}

async function api(q = '') {
  const r = await fetch('/api/admin' + q, { headers: { 'x-admin-key': key } });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { key = ''; try { sessionStorage.removeItem('k'); } catch {} login('That key is not correct.'); return null; }
  if (!r.ok) { app.innerHTML = `<section class="card"><p class="err">${esc(j.error || 'Something went wrong.')}</p><p><a href="#">Back</a></p></section>`; return null; }
  return j;
}

function login(msg = '') {
  app.innerHTML = `<section class="card narrow"><h2>Sign in</h2><form id="login"><label class="lbl" for="k">Access key</label><input id="k" type="password" autocomplete="current-password" required><div class="err">${esc(msg)}</div><div class="nav" style="margin-top:12px"><button class="btn primary">Open</button></div></form></section>`;
  document.getElementById('login').onsubmit = e => {
    e.preventDefault(); key = document.getElementById('k').value;
    try { sessionStorage.setItem('k', key); } catch {}
    route();
  };
}

async function list() {
  const j = await api(); if (!j) return;
  app.innerHTML = `<section class="card"><h2>Submissions (${j.items.length})</h2><input id="q" type="search" placeholder="Search name, email, phone or reference" aria-label="Search">
<div class="tbl"><table><thead><tr><th>Reference</th><th>Name</th><th>Email</th><th>Phone</th><th>Submitted</th></tr></thead><tbody>
${j.items.map(x => `<tr tabindex="0" data-ref="${esc(x.ref)}"><td>${esc(x.ref)}</td><td>${esc(x.full_name)}</td><td>${esc(x.email)}</td><td>${esc(x.phone)}</td><td>${when(x.created_at)}</td></tr>`).join('')}
</tbody></table></div></section>`;
  const q = document.getElementById('q'), tb = app.querySelector('tbody');
  q.oninput = () => { const v = q.value.toLowerCase(); tb.querySelectorAll('tr').forEach(tr => tr.hidden = !tr.textContent.toLowerCase().includes(v)); };
  tb.onclick = e => { const tr = e.target.closest('tr'); if (tr) location.hash = tr.dataset.ref; };
  tb.onkeydown = e => { if (e.key === 'Enter' && e.target.dataset.ref) location.hash = e.target.dataset.ref; };
}

async function detail(ref) {
  const j = await api('?ref=' + encodeURIComponent(ref)); if (!j) return;
  const { item, files } = j, secs = sections(item.data), tg = timelineGaps(item.data), anyGap = tg.some(t => t.gaps.length);
  vals = [];
  const copy = v => `<button type="button" class="link" data-c="${vals.push(String(v)) - 1}">Copy</button>`;
  const gapLines = tg.map(t => `${t.title}: ${t.gaps.length ? t.gaps.join('; ') : 'no gaps'}`);
  const full = [`CANDIDATE DATA FILE`, `Reference ID: ${item.ref}`, `Name: ${item.full_name}`, `Submitted: ${when(item.created_at)}`,
    `\nTIMELINE GAPS (auto-detected, any full month without an entry)\n` + gapLines.join('\n'),
    ...secs.map(s => `\n${s.title.toUpperCase()}\n` + s.items.map(it => it.h ? `-- ${it.h}` : `${it.l}: ${it.files ? it.files.map(f => f.name).join(', ') : it.v}`).join('\n'))].join('\n');
  const link = f => files[f.path] ? `<a href="${esc(files[f.path])}" target="_blank" rel="noopener">${esc(f.name)}</a>` : esc(f.name);
  app.innerHTML = `<p><a href="#">← All submissions</a></p><section class="card"><div class="rv-h"><div><h2 style="margin:0">${esc(item.full_name)}</h2><p class="note" style="margin:4px 0 0">${esc(item.ref)} · ${when(item.created_at)}</p></div><div class="nav" style="margin:0"><button type="button" class="btn" data-c="${vals.push(full) - 1}">Copy Full Candidate Data</button><button type="button" class="btn primary" data-dl="${vals.length - 1}" data-name="${esc(item.ref)}">Download Candidate File</button></div></div></section>`
    + `<section class="card ${anyGap ? 'warn' : ''}"><h3 style="margin-top:0">Timeline gaps${anyGap ? ' ⚠' : ''}</h3><p class="note">Auto-detected: any full month with no schooling, college, job or career break entry.</p>${tg.map(t => `<div class="row"><span class="k">${esc(t.title)}</span><span class="v${t.gaps.length ? ' gap-v' : ''}">${t.gaps.length ? t.gaps.map(esc).join('<br>') : 'No gaps'}</span></div>`).join('')}</section>`
    + secs.map(s => `<section class="card"><h3 style="margin-top:0">${s.title}</h3>${s.items.map(it => it.h ? `<h4>${esc(it.h)}</h4>`
      : `<div class="row"><span class="k">${esc(it.l)}</span><span class="v">${it.files ? it.files.map(link).join('<br>') : esc(it.v)}</span>${it.files ? '' : copy(it.v)}</div>`).join('')}</section>`).join('');
}

app.addEventListener('click', e => {
  const dl = e.target.closest('[data-dl]');
  if (dl) {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([vals[dl.dataset.dl]], { type: 'text/plain' })), download: `${dl.dataset.name}.txt` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); return;
  }
  const b = e.target.closest('[data-c]'); if (!b) return;
  navigator.clipboard.writeText(vals[b.dataset.c]).then(() => {
    const t = b.textContent; b.textContent = 'Copied ✓'; setTimeout(() => b.textContent = t, 1200);
  });
});

function route() {
  if (!key) return login();
  const ref = decodeURIComponent(location.hash.slice(1));
  ref ? detail(ref) : list();
}
addEventListener('hashchange', route);
route();
