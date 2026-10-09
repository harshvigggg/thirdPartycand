// Single source of truth for the form: used by the candidate form, the review screen, the admin view and the API.
import { DEGREES, HOME_QUALIFICATIONS, CAREER_BREAKS } from './catalogs.js';

const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' }) : null;
const NON_COUNTRY = new Set(['AC', 'BV', 'CP', 'DG', 'EA', 'EU', 'EZ', 'HM', 'IC', 'QO', 'TA', 'UM', 'UN', 'XA', 'XB', 'ZZ']);
export const COUNTRIES = [...new Set(Array.from({ length: 676 }, (_, i) => String.fromCharCode(65 + (i / 26 | 0), 65 + i % 26))
  .filter(c => !NON_COUNTRY.has(c)).map(c => { try { return names?.of(c); } catch { return null; } }).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b));
export const TIMEZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];

const YN = ['Yes', 'No'];
const SKILL = ['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'];
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PROVIDERS = ['Goethe-Institut', 'telc', 'ÖSD', 'TestDaF', 'ECL', 'Other'];
const NP = 'No preference';
const FACILITIES = [NP, 'Hospital', 'Rehabilitation clinic', 'Outpatient care', 'Home care', 'Other'];
const DEPARTMENTS = [NP, ...['Anesthesiology', 'Cardiology', 'Cardiac Surgery', 'Central Sterile Services', 'Dermatology', 'Emergency Department', 'Endocrinology',
  'Endoscopy', 'ENT (Ear, Nose & Throat)', 'Gastroenterology', 'General Surgery', 'Geriatrics', 'Gynecology & Obstetrics', 'Hematology & Oncology',
  'Infectious Diseases', 'Intensive Care (ICU)', 'Internal Medicine', 'Long-term / Elderly Care', 'Neonatology (NICU)', 'Nephrology & Dialysis',
  'Neurology', 'Neurosurgery', 'Nuclear Medicine', 'Operating Theatre (OR)', 'Ophthalmology', 'Orthopedics', 'Palliative Care', 'Pediatrics',
  'Plastic Surgery', 'Psychiatry', 'Psychosomatics', 'Pulmonology', 'Radiology', 'Rehabilitation', 'Rheumatology', 'Stroke Unit',
  'Thoracic Surgery', 'Trauma Surgery', 'Urology', 'Vascular Surgery'], 'Other'];
const STATES = [NP, 'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Western Pomerania',
  'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'];
const OTHER_DEGREE = 'Other qualification', OTHER_QUALIFICATION = 'Other qualification';
const ONGOING = 'If no date is entered, this experience is considered ongoing to date.';
const picked = (k, x) => s => Array.isArray(s[k]) && s[k].includes(x);
const german = g => g.learning === 'Yes';
const examTaken = g => german(g) && !!g.examStatus && g.examStatus !== 'Exam Not Taken';
const booked = g => german(g) && g.nextBooked === 'Yes';
const VOLUNTARY = 'Voluntary work';

// Field keys: k key, l label, t type, r required (bool or fn), if visibility fn, o options, ph placeholder, hint helper text.
// Groups with `timeline: 1` render as a dated timeline; `order` sets which timeline block comes first.
export const STEPS = [
  { key: 'personal', title: 'Personal Information', short: 'Personal', groups: [{ key: 'personal', fields: [
    { k: 'firstName', l: 'First Name', t: 'text', r: 1, name: 1, half: 1 },
    { k: 'middleName', l: 'Middle Name', t: 'text', name: 1, half: 1 },
    { k: 'lastName', l: 'Last Name', t: 'text', r: 1, name: 1, half: 1 },
    { k: 'dateOfBirth', l: 'Date of Birth', t: 'date', r: 1, past: 1, half: 1 },
    { k: 'gender', l: 'Gender', t: 'radio', r: 1, o: ['Male', 'Female', 'Other', 'Prefer not to say'] },
    { k: 'nationality', l: 'Nationality', t: 'country', r: 1, half: 1, ph: 'Start typing a country' },
    { k: 'countryOfResidence', l: 'Country of Residence', t: 'country', r: 1, half: 1, ph: 'Start typing a country' },
    { k: 'currentCity', l: 'Current City', t: 'text', r: 1, half: 1 },
    { k: 'maritalStatus', l: 'Marital Status', t: 'select', o: ['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'], half: 1 },
    { k: 'passportNumber', l: 'Passport Number', t: 'text', pattern: /^[A-Za-z0-9]{6,12}$/, msg: 'Use 6–12 letters or numbers, without spaces.', hint: 'Leave blank if you do not have a passport yet.', half: 1 },
  ] }] },
  { key: 'contact', title: 'Contact Information', short: 'Contact', groups: [{ key: 'contact', fields: [
    { k: 'phone', l: 'Mobile Number', t: 'phone', r: 1, hint: 'We will use this number for calls and WhatsApp.' },
    { k: 'email', l: 'Email Address', t: 'email', r: 1 },
    { k: 'address', l: 'Current Address', t: 'textarea', r: 1 },
  ] }] },
  { key: 'education', title: 'Education', short: 'Education', note: 'Start with your schooling, then add each college or training course in the order you did them. Please add every step so there are no gaps in your timeline.', groups: [
    // School-leaving qualification ("Add Schooling"). Field list still to be confirmed against the reference form.
    { key: 'schooling', title: '1. Schooling', timeline: 1, repeat: { min: 1, max: 5, item: 'School', add: 'Add Schooling', none: 'Add your school-leaving qualification (high school).' }, fields: [
      { k: 'institution', l: 'Name of the school', t: 'text', r: 1, half: 1 },
      { k: 'institutionOriginal', l: 'Name of the school (original language)', t: 'text', half: 1 },
      { k: 'country', l: 'Country', t: 'country', r: 1, half: 1, ph: 'Start typing a country' },
      { k: 'city', l: 'City', t: 'text', half: 1 },
      { k: 'startDate', l: 'Start date', t: 'month', r: 1, past: 1, half: 1 },
      { k: 'endDate', l: 'End date', t: 'month', after: 'startDate', half: 1, hint: ONGOING },
      { k: 'certificate', l: 'School-leaving certificate', t: 'file' },
    ] },
    // Degree / vocational training ("Add College"). Labels and the two catalogs come from the reference system; see FORM_FIELD_MAP.md.
    { key: 'college', title: '2. College / Vocational Training', timeline: 1, repeat: { min: 1, max: 10, item: 'College', add: 'Add College' }, fields: [
      { k: 'degree', l: 'Degree', t: 'select', r: 1, o: DEGREES },
      { k: 'degreeOther', l: 'Other degree', t: 'text', r: 1, if: e => e.degree === OTHER_DEGREE },
      { k: 'homeQualification', l: 'Name of the Qualification in the Home Country', t: 'select', o: HOME_QUALIFICATIONS },
      { k: 'homeQualificationOther', l: 'Other Qualification - Name of the Qualification in the Home Country', t: 'text', r: 1, if: e => e.homeQualification === OTHER_QUALIFICATION },
      { k: 'institution', l: 'Name of the university, college or training institution (German)', t: 'text', r: 1, half: 1 },
      { k: 'institutionOriginal', l: 'Name of the university, college or training institution (original language)', t: 'text', half: 1 },
      { k: 'country', l: 'Country', t: 'country', r: 1, half: 1, ph: 'Start typing a country' },
      { k: 'city', l: 'City', t: 'text', half: 1 },
      { k: 'startDate', l: 'Start date', t: 'month', r: 1, past: 1, half: 1 },
      { k: 'endDate', l: 'End date', t: 'month', after: 'startDate', half: 1, hint: ONGOING },
      { k: 'diplomaDate', l: 'Diploma Date', t: 'date', past: 1, half: 1 },
      { k: 'certificate', l: 'Degree certificate / transcript', t: 'file' },
    ] },
  ] },
  { key: 'employment', title: 'Work Experience', short: 'Experience', note: 'Add every job from your first to your current one. If there was a time when you were not working, add it as a career break so your timeline has no gaps.', groups: [
    { key: 'employment', title: '1. Jobs', timeline: 1, repeat: { min: 0, max: 15, item: 'Job', add: 'Add Job', none: 'Add your jobs, starting with the first one. If you have no work experience yet, just continue.' }, fields: [
      { k: 'employer', l: 'Employer Name', t: 'text', r: 1 },
      { k: 'jobTitle', l: 'Job Title', t: 'text', r: 1, half: 1 },
      { k: 'department', l: 'Department', t: 'text', half: 1 },
      { k: 'country', l: 'Country', t: 'country', r: 1, half: 1, ph: 'Start typing a country' },
      { k: 'city', l: 'City', t: 'text', half: 1 },
      { k: 'current', l: 'Currently working here?', t: 'radio', r: 1, o: YN },
      { k: 'startDate', l: 'Start Date', t: 'month', r: 1, past: 1, half: 1 },
      { k: 'endDate', l: 'End Date', t: 'month', r: 1, if: e => e.current !== 'Yes', past: 1, after: 'startDate', half: 1 },
      { k: 'responsibilities', l: 'Main Responsibilities', t: 'textarea', r: 1 },
      { k: 'certificate', l: 'Experience Certificate', t: 'file' },
    ] },
    // Career breaks: the type list comes from the reference system's catalog.
    { key: 'breaks', title: '2. Career Breaks', timeline: 1, repeat: { min: 0, max: 10, item: 'Career break', add: 'Add Career Break', none: 'Only needed if there was a time between studies and jobs when you were not working or studying.' }, fields: [
      { k: 'type', l: 'Type of career break', t: 'select', r: 1, o: CAREER_BREAKS },
      { k: 'purpose', l: 'Social or voluntary purpose', t: 'text', r: 1, if: e => e.type === VOLUNTARY },
      { k: 'startDate', l: 'Start date', t: 'month', r: 1, past: 1, half: 1 },
      { k: 'endDate', l: 'End date', t: 'month', past: 1, after: 'startDate', half: 1, hint: ONGOING },
    ] },
  ] },
  { key: 'language', title: 'Language Details', short: 'Language', groups: [
    { key: 'languages', repeat: { min: 1, max: 10, item: 'Language', add: 'Add Language' }, fields: [
      { k: 'name', l: 'Language', t: 'text', r: 1, ph: 'e.g. English', half: 1 },
      { k: 'fluency', l: 'Fluency', t: 'select', r: 1, o: SKILL, half: 1 },
    ] },
    { key: 'german', title: 'German Language', fields: [
      { k: 'learning', l: 'Have you learned German or taken a German exam?', t: 'radio', r: 1, o: YN },
      { k: 'level', l: 'Current German Level', t: 'select', r: 1, o: CEFR, if: german, half: 1 },
      { k: 'examStatus', l: 'Exam Status', t: 'select', r: 1, o: ['Fully Passed', 'Partially Passed', 'Results Awaited', 'Not Passed', 'Exam Not Taken'], if: german, half: 1 },
      { k: 'examProvider', l: 'Exam Provider', t: 'select', r: 1, o: PROVIDERS, if: examTaken, half: 1 },
      { k: 'examDate', l: 'Exam Date', t: 'date', r: 1, past: 1, if: examTaken, half: 1 },
      { k: 'certificate', l: 'German Exam Certificate / Result', t: 'file', if: examTaken },
      { k: 'nextBooked', l: 'Have you booked your next exam?', t: 'radio', o: YN, if: german, hint: 'Optional' },
      { k: 'nextLevel', l: 'Exam Level', t: 'select', r: 1, o: CEFR, if: booked, third: 1 },
      { k: 'nextProvider', l: 'Provider', t: 'select', r: 1, o: PROVIDERS, if: booked, third: 1 },
      { k: 'nextDate', l: 'Confirmed Date', t: 'date', r: 1, future: 1, if: booked, third: 1 },
    ] },
  ] },
  { key: 'preferences', title: 'Job Preferences', short: 'Preferences', note: 'Where you see boxes, you can choose more than one option.', groups: [{ key: 'preferences', fields: [
    { k: 'facilityTypes', l: 'Facility Type', t: 'multi', r: 1, o: FACILITIES, none: NP },
    { k: 'facilityOther', l: 'Other Facility Type', t: 'text', r: 1, if: picked('facilityTypes', 'Other') },
    { k: 'departments', l: 'Departments', t: 'multi', r: 1, o: DEPARTMENTS, none: NP },
    { k: 'departmentOther', l: 'Other Department', t: 'text', r: 1, if: picked('departments', 'Other') },
    { k: 'states', l: 'Preferred States', t: 'multi', r: 1, o: STATES, none: NP },
    { k: 'region', l: 'Region', t: 'radio', r: 1, o: ['City', 'Rural', 'Both'] },
    { k: 'salaryBefore', l: 'Salary Before Recognition', t: 'text', r: 1, ph: 'e.g. €2,800 gross per month', half: 1 },
    { k: 'salaryAfter', l: 'Salary After Recognition', t: 'text', r: 1, ph: 'e.g. €3,400 gross per month', half: 1 },
    { k: 'adjustmentMeasures', l: 'Adjustment Measure', t: 'multi', r: 1, o: [NP, 'Adaptation course', 'Preparatory course for knowledge examination'], none: NP },
    { k: 'familyReunification', l: 'Family Reunification', t: 'radio', r: 1, o: ['Family reunification at job start', 'Family reunification after recognition', 'No family reunification (single, no children)', 'Other'] },
    { k: 'familyOther', l: 'Please specify', t: 'text', r: 1, if: s => s.familyReunification === 'Other' },
  ] }] },
  { key: 'skills', title: 'Additional Skills & Knowledge', short: 'Skills', groups: [{ key: 'skills', fields: [
    { k: 'drivingLicence', l: 'Do you have a driving licence for a car (four-wheeler)?', t: 'radio', r: 1, o: YN },
    { k: 'itSkills', l: 'IT Skills', t: 'multi', o: ['MS Office', 'MCC', 'SAP', 'NetWeaver', 'OpenOffice'] },
  ] }] },
  { key: 'documents', title: 'Documents', short: 'Documents', note: 'Upload clear scans or photos. PDF, JPG or PNG, up to 10 MB per file.', groups: [{ key: 'documents', fields: [
    { k: 'cv', l: 'CV / Resume', t: 'file', r: 1 },
    { k: 'passport', l: 'Passport', t: 'file', r: (s, d) => !!d.personal?.passportNumber },
    { k: 'photo', l: 'Profile Photo', t: 'file' },
    { k: 'degree', l: 'Degree Certificate', t: 'file' },
    { k: 'marksheets', l: 'Academic Marksheets', t: 'file', multi: 1 },
    { k: 'registration', l: 'Professional Registration', t: 'file' },
    { k: 'languageCertificate', l: 'Language Certificate', t: 'file', multi: 1 },
    { k: 'employmentCertificate', l: 'Employment Certificate', t: 'file', multi: 1 },
    { k: 'other', l: 'Other Supporting Documents', t: 'file', multi: 1 },
  ] }] },
];

export const today = (offset = 0) => { const d = new Date(Date.now() + offset * 864e5); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
export const visible = (f, s, d) => !f.if || !!f.if(s || {}, d || {});
export const required = (f, s, d) => typeof f.r === 'function' ? !!f.r(s || {}, d || {}) : !!f.r;
const empty = v => v == null || v === false || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
const FILE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/;

function check(f, v, s, g, d, o) {
  if (empty(v)) return required(f, s, d) ? (f.t === 'file' ? 'Please upload this document.' : f.t === 'multi' ? 'Please choose at least one option.' : f.o || f.t === 'tz' ? 'Please choose an option.' : 'This field is required.') : '';
  if (f.t === 'check') return '';
  if (f.t === 'multi') {
    if (!Array.isArray(v) || new Set(v).size !== v.length || !v.every(x => f.o.includes(x))) return 'Please choose from the list.';
    return f.none && v.includes(f.none) && v.length > 1 ? `"${f.none}" can't be combined with other choices.` : '';
  }
  if (f.t === 'file') return Array.isArray(v) && v.length <= 10 && v.every(x => typeof x?.name === 'string' && FILE.test(x.path)) ? '' : 'Please upload this file again.';
  if (typeof v !== 'string') return 'Please check this answer.';
  if (v.length > (f.t === 'textarea' ? 2000 : 200)) return 'This answer is too long.';
  if (f.o && !f.o.includes(v)) return 'Please choose an option.';
  if (f.name && !/^[\p{L}\p{M} .'-]+$/u.test(v)) return 'Please use letters only.';
  if (f.pattern && !f.pattern.test(v)) return f.msg;
  if (f.t === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Please enter a valid email address.';
  if (f.t === 'phone' && !/^\+\d{1,4} \d{6,14}$/.test(v)) return 'Enter the country code and number, digits only (6–14 digits).';
  if (f.t === 'country' && o.client && COUNTRIES.length && !COUNTRIES.includes(v)) return 'Please choose a country from the list.';
  if (f.t === 'date' || f.t === 'month') {
    if (!(f.t === 'date' ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}$/).test(v) || v < '1900') return 'Please enter a valid date.';
    const n = v.length, slack = o.client ? 0 : 1; // server allows one day for time-zone differences
    if (f.past && v > today(slack).slice(0, n)) return 'This date cannot be in the future.';
    if (f.future && v < today(-slack).slice(0, n)) return 'This date cannot be in the past.';
    const a = f.after && g.fields.find(x => x.k === f.after);
    if (a && s[f.after] && v < s[f.after]) return `This must be on or after the ${a.l.toLowerCase()}.`;
  }
  return '';
}

// Returns { 'path.to.field': 'message' }. Pass { step } to check one step, { client: 1 } in the browser.
export function validate(d, o = {}) {
  const e = {};
  for (const st of o.step ? [o.step] : STEPS) for (const g of st.groups) {
    const each = (s, base) => { for (const f of g.fields) if (visible(f, s, d)) { const m = check(f, s[f.k], s, g, d, o); if (m) e[`${base}.${f.k}`] = m; } };
    if (g.repeat) {
      const a = Array.isArray(d[g.key]) ? d[g.key] : [];
      if (a.length < g.repeat.min) e[g.key] = `Please add at least one ${g.repeat.item.toLowerCase()}.`;
      else if (a.length > g.repeat.max) e[g.key] = `You can add up to ${g.repeat.max} entries.`;
      a.forEach((s, i) => each(s || {}, `${g.key}.${i}`));
    } else each(d[g.key] || {}, g.key);
  }
  if (!o.step && !(d.consent?.accurate && d.consent?.processing)) e.consent = 'Please tick both boxes to continue.';
  return e;
}

// Keeps only known, visible, non-empty answers with stable keys.
export function normalize(raw) {
  const d = raw && typeof raw === 'object' ? raw : {}, out = {};
  const obj = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  for (const st of STEPS) for (const g of st.groups) {
    const pick = s => {
      const o = {};
      for (const f of g.fields) {
        const v = s[f.k];
        if (!visible(f, s, d) || empty(v)) continue;
        o[f.k] = f.t === 'file' ? (Array.isArray(v) ? v : []).map(x => ({ name: String(x?.name ?? '').slice(0, 200), path: String(x?.path ?? ''), type: String(x?.type ?? ''), size: +x?.size || 0 }))
          : f.t === 'check' ? true : f.t === 'multi' ? (Array.isArray(v) ? v.map(String) : [String(v)])
          : typeof v === 'string' ? v.trim() : v;
      }
      return o;
    };
    out[g.key] = g.repeat ? (Array.isArray(d[g.key]) ? d[g.key].slice(0, 50) : []).map(s => pick(obj(s))) : pick(obj(d[g.key]));
  }
  out.consent = { accurate: !!d.consent?.accurate, processing: !!d.consent?.processing };
  return out;
}

// Display / download names for uploaded files: "<Candidate name>'s <Field label>[ 2].<ext>".
export function fileNames(d) {
  const who = [d.personal?.firstName, d.personal?.lastName].filter(Boolean).join(' ').trim() || 'Candidate', out = {};
  for (const st of STEPS) for (const g of st.groups) (g.repeat ? d[g.key] || [] : [d[g.key] || {}]).forEach((s, i) => {
    for (const f of g.fields) if (f.t === 'file') (s[f.k] || []).forEach((x, j) => {
      const ext = (x.path || '').split('.').pop() || 'pdf', n = (g.repeat ? ` ${i + 1}` : '') + (j ? ` (${j + 1})` : '');
      out[x.path] = `${who}'s ${f.l.replace(/\s*\/.*$/, '')}${n}.${ext}`;
    });
  });
  return out;
}

export function filePaths(d) {
  const out = [];
  for (const st of STEPS) for (const g of st.groups) for (const s of g.repeat ? d[g.key] || [] : [d[g.key] || {}])
    for (const f of g.fields) if (f.t === 'file') for (const x of s[f.k] || []) out.push(x.path);
  return out;
}

const ym = s => /^\d{4}-\d{2}$/.test(s || '') ? +s.slice(0, 4) * 12 + +s.slice(5, 7) - 1 : null;
// Total months of work, counting overlapping jobs once.
export function experience(list = []) {
  const now = ym(today().slice(0, 7));
  const iv = list.map(e => [ym(e.startDate), e.current === 'Yes' ? now : ym(e.endDate)])
    .filter(([a, b]) => a != null && b != null && b >= a).sort((x, y) => x[0] - y[0]);
  let n = 0, end = -1;
  for (const [a, b] of iv) { const s = Math.max(a, end + 1); if (b >= s) { n += b - s + 1; end = b; } }
  return n;
}
export const months = m => `${m / 12 | 0} Years ${m % 12} Months`;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtMonth = s => /^\d{4}-\d{2}$/.test(s || '') ? `${MON[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}` : '';
export const spanLabel = e => {
  const a = fmtMonth(e.startDate), b = e.current === 'Yes' ? 'Present' : fmtMonth(e.endDate) || (a ? 'Present' : '');
  const m = ym(e.startDate) != null ? (e.current === 'Yes' || !ym(e.endDate) ? ym(today().slice(0, 7)) : ym(e.endDate)) - ym(e.startDate) + 1 : 0;
  const dur = m > 0 ? [m >= 12 && `${m / 12 | 0} yr`, m % 12 && `${m % 12} mo`].filter(Boolean).join(' ') : '';
  return a ? `${a} – ${b}${dur ? ` · ${dur}` : ''}` : '';
};
// Months with no dated entry between the entries of the given groups (all entries of a step share one timeline).
export function gaps(lists) {
  const iv = lists.flat().map(e => [ym(e.startDate), e.current === 'Yes' || !e.endDate ? ym(today().slice(0, 7)) : ym(e.endDate)])
    .filter(([a, b]) => a != null && b != null && b >= a).sort((x, y) => x[0] - y[0]);
  const out = []; let end = null;
  for (const [a, b] of iv) {
    if (end != null && a - end > 1) out.push([end + 1, a - 1]); // any full month without an entry counts as a gap
    end = end == null ? b : Math.max(end, b);
  }
  const f = n => `${MON[n % 12]} ${n / 12 | 0}`;
  return out.map(([a, b]) => `${f(a)} – ${f(b)}`);
}

// Display-ready rows per step, used by the review screen and the admin view.
export function sections(raw) {
  const d = normalize(raw);
  return STEPS.map((st, i) => {
    const items = [];
    for (const g of st.groups) {
      if (g.title) items.push({ h: g.title });
      const add = s => g.fields.forEach(f => f.t !== 'check' && s[f.k] !== undefined && items.push(f.t === 'file' ? { l: f.l, files: s[f.k] } : { l: f.l, v: f.t === 'multi' ? s[f.k].join(', ') : s[f.k] }));
      if (!g.repeat) { add(d[g.key]); continue; }
      if (!d[g.key].length) items.push({ l: g.repeat.item, v: 'None' });
      d[g.key].forEach((e, j) => { items.push({ h: `${g.repeat.item} ${j + 1}` }); add(e); });
      const m = g.key === 'employment' && experience(d.employment);
      if (m) items.push({ l: 'Total Professional Experience', v: months(m) });
    }
    return { i, title: st.title, items };
  });
}

// Gap report for the admin view and the candidate file: per timeline and across everything the candidate entered.
export function timelineGaps(raw) {
  const d = normalize(raw);
  const edu = [d.schooling, d.college], work = [d.employment, d.breaks];
  return [
    { title: 'Education timeline (schooling → college)', gaps: gaps(edu) },
    { title: 'Work timeline (jobs → career breaks)', gaps: gaps(work) },
    { title: 'Overall timeline (education + work + breaks, up to today)', gaps: gaps([...edu, ...work]) },
  ];
}