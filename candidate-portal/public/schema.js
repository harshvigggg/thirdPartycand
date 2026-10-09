// Single source of truth for the form: used by the candidate form, the review screen, the admin view and the API.
import { DEGREES, HOME_QUALIFICATIONS, CAREER_BREAKS, WORK_DEPARTMENTS, FACILITY_TYPES, EMPLOYMENT_TYPES, CHILDREN } from './catalogs.js';

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
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed', 'In a relationship', 'Engaged', 'Registered civil partnership', 'Prefer not to say'];
const isGerman = l => /^\s*(german|deutsch)\s*$/i.test(l.name || '');

// Field keys: k key, l label, t type, r required (bool or fn), if visibility fn, o options, ph placeholder, hint helper text.
// Groups with `timeline: 1` render as a dated timeline. The step flagged `pre: 1` (documents) is collected on the intro page, before step 1.
// Section order and field order follow the "Candidate Profile — 8 sections" sheet.
export const STEPS = [
  { key: 'basic', title: 'Basic Information', short: 'Basic', groups: [{ key: 'basic', fields: [
    { k: 'firstName', l: 'First Name', t: 'text', r: 1, name: 1, half: 1 },
    { k: 'lastName', l: 'Last Name', t: 'text', r: 1, name: 1, half: 1 },
    { k: 'nationality', l: 'Nationality', t: 'country', r: 1, half: 1, ph: 'Start typing a country' },
    { k: 'profession', l: 'Current Profession', t: 'text', r: 1, half: 1, ph: 'e.g. Registered Nurse' },
    { k: 'dateOfBirth', l: 'Date of Birth', t: 'date', r: 1, past: 1, half: 1 },
    { k: 'germanLevel', l: 'Current German Level', t: 'select', o: ['None', ...CEFR], half: 1 },
    { k: 'gender', l: 'Gender', t: 'radio', r: 1, o: ['Male', 'Female', 'Other', 'Prefer not to say'] },
  ] }] },
  { key: 'college', title: 'College / Higher Education', short: 'College', note: 'Add each degree, diploma or vocational training in the order you did them.', groups: [
    { key: 'college', timeline: 1, repeat: { min: 1, max: 10, item: 'College', add: 'Add College' }, fields: [
      { k: 'institutionOriginal', l: 'Name of College in English (original language)', t: 'text', r: 1, half: 1 },
      { k: 'institution', l: 'Name of College in German', t: 'text', half: 1, hint: 'Leave blank if you are not sure — we can translate it.' },
      { k: 'degree', l: 'Degree', t: 'select', r: 1, o: DEGREES },
      { k: 'degreeOther', l: 'Other degree', t: 'text', r: 1, if: e => e.degree === OTHER_DEGREE },
      { k: 'startDate', l: 'Start Date', t: 'date', r: 1, past: 1, half: 1 },
      { k: 'endDate', l: 'End Date', t: 'date', after: 'startDate', half: 1, hint: ONGOING },
      { k: 'city', l: 'City', t: 'text', half: 1 },
      { k: 'country', l: 'Country', t: 'country', r: 1, half: 1, ph: 'Start typing a country' },
      { k: 'diplomaDate', l: 'Diploma Date', t: 'date', past: 1, half: 1 },
      { k: 'homeQualification', l: 'Name of Qualification in Home Country', t: 'select', o: HOME_QUALIFICATIONS },
      { k: 'homeQualificationOther', l: 'Other Qualification - Name of the Qualification in the Home Country', t: 'text', r: 1, if: e => e.homeQualification === OTHER_QUALIFICATION },
    ] },
  ] },
  { key: 'personal', title: 'Personal Details / Contact', short: 'Personal', groups: [{ key: 'personal', fields: [
    { k: 'placeOfBirth', l: 'Place of Birth', t: 'text', r: 1, half: 1 },
    { k: 'countryOfBirth', l: 'Country of Birth', t: 'country', r: 1, half: 1, ph: 'Start typing a country' },
    { k: 'birthName', l: 'Birth Name', t: 'text', name: 1, half: 1, hint: 'Only if different from your current name.' },
    { k: 'maritalStatus', l: 'Marital Status', t: 'select', o: MARITAL, half: 1 },
    { k: 'children', l: 'Children', t: 'select', o: CHILDREN, half: 1 },
    { k: 'street', l: 'Street / House Address', t: 'text', r: 1 },
    { k: 'zip', l: 'Zip Code', t: 'text', r: 1, half: 1 },
    { k: 'city', l: 'City', t: 'text', r: 1, half: 1 },
    { k: 'phone', l: 'Phone Number', t: 'phone', r: 1, hint: 'We will use this number for calls and WhatsApp.' },
    { k: 'email', l: 'Email Address', t: 'email', r: 1 },
    { k: 'passportNumber', l: 'Passport Number', t: 'text', pattern: /^[A-Za-z0-9]{6,12}$/, msg: 'Use 6–12 letters or numbers, without spaces.', hint: 'Leave blank if you do not have a passport yet.', half: 1 },
  ] }] },
  { key: 'schooling', title: 'Schooling', short: 'Schooling', note: 'Your school education (high school / school-leaving qualification).', groups: [
    { key: 'schooling', timeline: 1, repeat: { min: 1, max: 5, item: 'School', add: 'Add Schooling' }, fields: [
      { k: 'institution', l: 'Name of School', t: 'text', r: 1, half: 1 },
      { k: 'institutionGerman', l: 'Name of School in German', t: 'text', half: 1, hint: 'Leave blank if you are not sure — we can translate it.' },
      { k: 'startDate', l: 'Start Date', t: 'date', r: 1, past: 1, half: 1 },
      { k: 'endDate', l: 'End Date', t: 'date', after: 'startDate', half: 1, hint: ONGOING },
      { k: 'city', l: 'City', t: 'text', half: 1 },
      { k: 'country', l: 'Country', t: 'country', r: 1, half: 1, ph: 'Start typing a country' },
      { k: 'diplomaDate', l: 'Diploma Date', t: 'date', past: 1, half: 1 },
    ] },
  ] },
  { key: 'employment', title: 'Work Experience', short: 'Work', note: 'Add every job and internship from your first to your current one. If there was a time when you were not working, add it as a career break so your timeline has no gaps.', groups: [
    { key: 'employment', title: '1. Jobs & Internships', timeline: 1, repeat: { min: 0, max: 15, item: 'Job', add: 'Add Job', none: 'Add your jobs, starting with the first one. If you have no work experience yet, just continue.' }, fields: [
      { k: 'jobTitle', l: 'Position', t: 'text', r: 1, half: 1, ph: 'e.g. Staff Nurse' },
      { k: 'employer', l: 'Name of Hospital', t: 'text', r: 1, half: 1 },
      { k: 'employerGerman', l: 'Name of Hospital in German', t: 'text', half: 1, hint: 'Leave blank if you are not sure — we can translate it.' },
      { k: 'facilityType', l: 'Type of Facility', t: 'select', r: 1, o: FACILITY_TYPES, half: 1 },
      { k: 'department', l: 'Department', t: 'select', r: 1, o: WORK_DEPARTMENTS },
      { k: 'startDate', l: 'Start Date', t: 'date', r: 1, past: 1, half: 1 },
      { k: 'current', l: 'Currently working here?', t: 'radio', r: 1, o: YN },
      { k: 'endDate', l: 'End Date', t: 'date', r: 1, if: e => e.current !== 'Yes', past: 1, after: 'startDate', half: 1 },
      { k: 'employmentType', l: 'Employment Type', t: 'select', r: 1, o: EMPLOYMENT_TYPES, half: 1 },
      { k: 'city', l: 'City', t: 'text', half: 1 },
      { k: 'country', l: 'Country', t: 'country', r: 1, half: 1, ph: 'Start typing a country' },
      { k: 'responsibilities', l: 'Tasks', t: 'textarea', r: 1, ph: 'Your main duties in this job' },
      { k: 'conditions', l: 'Conditions Treated', t: 'textarea', ph: 'e.g. post-operative care, sepsis, stroke' },
      { k: 'equipment', l: 'Equipment Used', t: 'textarea', ph: 'e.g. ventilator, infusion pump, ECG monitor' },
      { k: 'certificate', l: 'Experience letter for this job', fn: 'Job Experience Letter', t: 'file' },
    ] },
    { key: 'breaks', title: '2. Career Breaks', timeline: 1, repeat: { min: 0, max: 10, item: 'Career break', add: 'Add Career Break', none: 'Only needed if there was a time between studies and jobs when you were not working or studying.' }, fields: [
      { k: 'type', l: 'Type of career break', t: 'select', r: 1, o: CAREER_BREAKS },
      { k: 'purpose', l: 'Social or voluntary purpose', t: 'text', r: 1, if: e => e.type === VOLUNTARY },
      { k: 'startDate', l: 'Start date', t: 'date', r: 1, past: 1, half: 1 },
      { k: 'endDate', l: 'End date', t: 'date', past: 1, after: 'startDate', half: 1, hint: ONGOING },
    ] },
  ] },
  { key: 'skills', title: 'Skills and Certificates', short: 'Skills', groups: [
    { key: 'skills', fields: [
      { k: 'germanLevel', l: 'Current German Level', t: 'select', o: ['None', ...CEFR], half: 1, hint: 'Same as in Basic Information — change it here if needed.' },
      { k: 'additionalSkills', l: 'Additional Skills', t: 'textarea', ph: 'Certificates, trainings, special skills' },
      { k: 'drivingLicence', l: 'Driving License (car / four-wheeler)', t: 'radio', r: 1, o: YN },
      { k: 'itSkills', l: 'IT Skills', t: 'multi', o: ['MS Office', 'MCC', 'SAP', 'NetWeaver', 'OpenOffice'] },
    ] },
    { key: 'german', title: 'German Certificate', fields: [
      { k: 'learning', l: 'Have you taken a German exam?', t: 'radio', r: 1, o: YN },
      { k: 'examStatus', l: 'Exam Status', t: 'select', r: 1, o: ['Fully Passed', 'Partially Passed', 'Results Awaited', 'Not Passed'], if: german, half: 1 },
      { k: 'examProvider', l: 'Exam Provider', t: 'select', r: 1, o: PROVIDERS, if: german, half: 1 },
      { k: 'examLevel', l: 'Certified Level', t: 'select', r: 1, o: CEFR, if: german, half: 1 },
      { k: 'examDate', l: 'Exam Date', t: 'date', r: 1, past: 1, if: german, half: 1 },
      { k: 'nextBooked', l: 'Have you booked your next exam?', t: 'radio', o: YN, if: german, hint: 'Optional' },
      { k: 'nextLevel', l: 'Exam Level', t: 'select', r: 1, o: CEFR, if: booked, third: 1 },
      { k: 'nextProvider', l: 'Provider', t: 'select', r: 1, o: PROVIDERS, if: booked, third: 1 },
      { k: 'nextDate', l: 'Confirmed Date', t: 'date', r: 1, future: 1, if: booked, third: 1 },
    ] },
  ] },
  { key: 'language', title: 'Languages', short: 'Languages', groups: [
    { key: 'languages', repeat: { min: 1, max: 10, item: 'Language', add: 'Add Language' }, fields: [
      { k: 'name', l: 'Language', t: 'text', r: 1, ph: 'e.g. English', half: 1 },
      { k: 'fluency', l: 'Proficiency', t: 'select', r: 1, o: SKILL, half: 1, if: l => !isGerman(l) },
      { k: 'cefr', l: 'Proficiency', t: 'select', r: 1, o: CEFR, half: 1, if: isGerman, hint: 'German is rated on the A1–C2 scale.' },
    ] },
  ] },
  { key: 'preferences', title: 'Job Preferences', short: 'Preferences', note: 'Where you see boxes, you can choose more than one option.', groups: [{ key: 'preferences', fields: [
    { k: 'facilityTypes', l: 'Facility Type', t: 'multi', r: 1, o: FACILITIES, none: NP },
    { k: 'facilityOther', l: 'Other Facility Type', t: 'text', r: 1, if: picked('facilityTypes', 'Other') },
    { k: 'departments', l: 'Department', t: 'multi', r: 1, o: DEPARTMENTS, none: NP },
    { k: 'departmentOther', l: 'Other Department', t: 'text', r: 1, if: picked('departments', 'Other') },
    { k: 'states', l: 'State', t: 'multi', r: 1, o: STATES, none: NP },
    { k: 'region', l: 'Region', t: 'radio', r: 1, o: ['City', 'Rural', 'Both'] },
    { k: 'salaryBefore', l: 'Salary Before Recognition', t: 'text', r: 1, ph: 'e.g. €2,800 gross per month', half: 1 },
    { k: 'salaryAfter', l: 'Salary After Recognition', t: 'text', r: 1, ph: 'e.g. €3,400 gross per month', half: 1 },
    { k: 'adjustmentMeasures', l: 'Adjustment Measures', t: 'multi', r: 1, o: [NP, 'Adaptation course', 'Preparatory course for knowledge examination'], none: NP },
    { k: 'familyReunification', l: 'Family Reunification', t: 'radio', r: 1, o: ['Family reunification at job start', 'Family reunification after recognition', 'No family reunification (single, no children)', 'Other'] },
    { k: 'familyOther', l: 'Please specify', t: 'text', r: 1, if: s => s.familyReunification === 'Other' },
  ] }] },
  // Collected on the intro page. Each document is read to pre-fill the sections above (see DOC_KINDS).
  { key: 'documents', title: 'Documents', short: 'Documents', pre: 1, groups: [{ key: 'documents', fields: [
    { k: 'cv', l: 'CV / Resume', t: 'file', r: 1, hint: 'Used for your profession, schooling, work experience, languages and skills.' },
    { k: 'passport', l: 'Passport', t: 'file', hint: 'Used for nationality, date and place of birth, gender and passport number.' },
    { k: 'nationalId', l: 'National ID', t: 'file', hint: 'Used for your birth name, marital status and current address.' },
    { k: 'degree', l: "Bachelor's / Nursing Degree Certificate", fn: 'Degree Certificate', t: 'file', hint: 'Used for your college, degree, country and diploma date.' },
    { k: 'transcript', l: 'College Transcript', t: 'file', multi: 1, hint: 'Used for your college start and end dates.' },
    { k: 'germanCertificate', l: 'German Language Certificate', t: 'file', hint: 'Used for your German level.' },
    { k: 'experienceLetters', l: 'Internship / Job Experience Letters', fn: 'Experience Letter', t: 'file', multi: 1, hint: 'Used for your work experience: hospital, department, dates, tasks and equipment.' },
    { k: 'photo', l: 'Profile Photo', t: 'file' },
    { k: 'marksheets', l: 'Academic Marksheets', t: 'file', multi: 1 },
    { k: 'registration', l: 'Professional Registration', t: 'file' },
    { k: 'other', l: 'Other Supporting Documents', t: 'file', multi: 1 },
  ] }] },
];
// Document fields that are read to pre-fill the form, in priority order, with the label the reader sees.
export const DOC_KINDS = { cv: 'CV', passport: 'Passport', nationalId: 'National ID', degree: 'Degree certificate', transcript: 'College transcript', germanCertificate: 'German language certificate', experienceLetters: 'Internship / job experience letter' };
// Steps shown in the stepper (the document step is collected up front).
export const FORM_STEPS = STEPS.filter(s => !s.pre);
// Free-text notes per page, stored under `notes.<stepKey>`.
export const NOTES = { l: 'Notes', t: 'textarea', ph: 'Anything you would like to add or explain about this page (optional)' };

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
  for (const st of o.step ? [o.step] : STEPS) if (!st.pre) { const v = d.notes?.[st.key]; if (typeof v === 'string' && v.length > 2000) e[`notes.${st.key}`] = 'This answer is too long.'; }
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
  out.notes = {};
  for (const st of STEPS) if (!st.pre && typeof d.notes?.[st.key] === 'string' && d.notes[st.key].trim()) out.notes[st.key] = d.notes[st.key].trim();
  out.consent = { accurate: !!d.consent?.accurate, processing: !!d.consent?.processing };
  return out;
}

// Display / download names for uploaded files: "<Candidate name>'s <Field label>[ 2].<ext>".
export function fileNames(d) {
  const who = [d.basic?.firstName, d.basic?.lastName].filter(Boolean).join(' ').trim() || 'Candidate', out = {};
  for (const st of STEPS) for (const g of st.groups) (g.repeat ? d[g.key] || [] : [d[g.key] || {}]).forEach((s, i) => {
    for (const f of g.fields) if (f.t === 'file') (s[f.k] || []).forEach((x, j) => {
      const ext = (x.path || '').split('.').pop() || 'pdf', n = (g.repeat ? ` ${i + 1}` : '') + (j ? ` (${j + 1})` : '');
      out[x.path] = `${who}'s ${f.fn || f.l.replace(/\s*\/.*$/, '')}${n}.${ext}`;
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

const ym = s => /^\d{4}-\d{2}/.test(s || '') ? +s.slice(0, 4) * 12 + +s.slice(5, 7) - 1 : null;
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
export const fmtMonth = s => /^\d{4}-\d{2}/.test(s || '') ? `${MON[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}` : '';
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// "14 March 2017" for display; anything that is not a full date is returned unchanged.
export const fmtDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? `${+s.slice(8, 10)} ${MONTH[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}` : (s || '');
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
      const add = s => g.fields.forEach(f => f.t !== 'check' && s[f.k] !== undefined && items.push(f.t === 'file' ? { l: f.l, files: s[f.k] } : { l: f.l, v: f.t === 'multi' ? s[f.k].join(', ') : f.t === 'date' ? fmtDate(s[f.k]) : s[f.k] }));
      if (!g.repeat) { add(d[g.key]); continue; }
      if (!d[g.key].length) items.push({ l: g.repeat.item, v: 'None' });
      d[g.key].forEach((e, j) => { items.push({ h: `${g.repeat.item} ${j + 1}` }); add(e); });
      const m = g.key === 'employment' && experience(d.employment);
      if (m) items.push({ l: 'Total Professional Experience', v: months(m) });
    }
    if (d.notes[st.key]) items.push({ l: 'Notes', v: d.notes[st.key] });
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