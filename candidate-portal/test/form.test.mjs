import test from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, FORM_STEPS, DOC_KINDS, COUNTRIES, validate, normalize, sections, gaps, spanLabel, fileNames, timelineGaps } from '../public/schema.js';
import { DEGREES } from '../public/catalogs.js';

const step = k => STEPS.find(s => s.key === k), errs = (k, d) => validate(d, { step: step(k), client: 1 });
const fields = (k, g = k) => step(k).groups.find(x => x.key === g).fields;
const F = (k, g) => fields(k, g).map(f => f.k);

test('8 sections in sheet order, then documents last', () => {
  assert.equal(FORM_STEPS.map(s => s.key).join(), 'basic,college,personal,schooling,employment,skills,language,preferences,documents');
});
test('only the CV is collected up front', () => assert.equal(fields('documents').filter(f => f.intro).map(f => f.k).join(), 'cv'));
test('field order follows the sheet', () => {
  assert.equal(F('basic').slice(2).join(), 'nationality,profession,dateOfBirth,germanLevel,plannedB2,gender');
  assert.equal(F('college').filter(k => !k.endsWith('Other')).join(), 'institutionOriginal,institution,degree,startDate,endDate,city,country,diplomaDate,homeQualification');
  assert.equal(F('personal').join(), 'placeOfBirth,countryOfBirth,birthName,maritalStatus,children,street,zip,city,phone,email,passportNumber');
  assert.equal(F('schooling').join(), 'institution,institutionGerman,startDate,endDate,city,country,diplomaDate');
  assert.equal(F('skills').join(), 'germanLevel,additionalSkills,drivingLicence,itSkills');
});
test('countries: curated list of 196, no territories, used by every country field', () => {
  assert.equal(COUNTRIES.length, 196);
  assert.ok(COUNTRIES.includes('India') && !COUNTRIES.some(c => /british indian ocean|territor/i.test(c)));
  for (const [k, g] of [['basic', 'basic'], ['college', 'college'], ['personal', 'personal'], ['schooling', 'schooling'], ['employment', 'employment']])
    for (const f of fields(k, g)) if (/country|nationality/i.test(f.k)) assert.equal(f.o, COUNTRIES, `${g}.${f.k}`);
});
test('nationality accepts a listed country and rejects anything else', () => {
  const ok = { basic: { firstName: 'A', lastName: 'B', nationality: 'India', profession: 'Nurse', dateOfBirth: '1990-01-01', gender: 'Female' } };
  assert.equal(errs('basic', ok)['basic.nationality'], undefined);
  assert.ok(errs('basic', { basic: { ...ok.basic, nationality: 'British Indian Ocean Territory' } })['basic.nationality']);
});
test('schooling: exactly one school, labelled Class 12 / +2', () => {
  const g = step('schooling').groups[0];
  assert.equal(g.repeat.max, 1);
  assert.match(g.fields[0].l, /Class 12 \/ \+2/);
});
test('languages: at most 2', () => assert.equal(step('language').groups[0].repeat.max, 2));
test('diploma date labels explain the date', () => {
  assert.match(fields('college').find(f => f.k === 'diplomaDate').l, /received your degree \/ convocation date/);
  assert.match(fields('schooling').find(f => f.k === 'diplomaDate').l, /received your certificate/);
});
test('conditionals: other degree, voluntary break, German CEFR', () => {
  const base = { degree: DEGREES[0], institutionOriginal: 'X', country: 'India', startDate: '2015-06-01' };
  assert.ok(errs('college', { college: [{ ...base, degree: 'Other qualification' }] })['college.0.degreeOther']);
  assert.ok(errs('employment', { employment: [], breaks: [{ type: 'Voluntary work', startDate: '2020-01-01' }] })['breaks.0.purpose']);
  assert.equal(Object.keys(errs('language', { languages: [{ name: 'German' }] })).join(), 'languages.0.cefr');
});
test('job requires the sheet fields', () => {
  const e = errs('employment', { employment: [{}], breaks: [] });
  for (const k of ['jobTitle', 'employer', 'facilityType', 'department', 'employmentType', 'country', 'responsibilities', 'startDate']) assert.ok(e[`employment.0.${k}`], k);
  assert.equal(e['employment.0.conditions'], undefined);
});
test('notes are optional and length-checked', () => {
  assert.ok(errs('basic', { basic: {}, notes: { basic: 'x'.repeat(2001) } })['notes.basic']);
  assert.equal(normalize({ notes: { basic: ' hi ', college: '' } }).notes.basic, 'hi');
});
test('timeline gaps: one empty month counts; ongoing closes gaps', () => {
  assert.deepEqual(gaps([[{ startDate: '2010-06-01', endDate: '2012-03-31' }], [{ startDate: '2012-05-01', endDate: '2013-01-01' }]]), ['Apr 2012 – Apr 2012']);
  assert.equal(gaps([[{ startDate: '2010-06-01', endDate: '2012-03-01' }, { startDate: '2012-04-01', current: 'Yes' }]]).length, 0);
  assert.equal(spanLabel({ startDate: '2015-06-01', endDate: '2019-05-01' }), 'Jun 2015 – May 2019 · 4 yr');
});
test('file names and admin sections', () => {
  const raw = { basic: { firstName: 'Priya', lastName: 'Sharma' }, documents: { cv: [{ path: 'a/b.pdf', name: 'x.pdf' }], experienceLetters: [{ path: 'a/c.pdf' }, { path: 'a/d.pdf' }] },
    notes: { basic: 'hello' }, college: [{ degree: DEGREES[0], startDate: '2013-06-01', endDate: '2017-05-01' }], schooling: [{ startDate: '2008-06-01', endDate: '2012-03-01' }], employment: [], breaks: [], languages: [] };
  assert.equal(fileNames(raw)['a/b.pdf'], "Priya Sharma's CV.pdf");
  assert.equal(fileNames(raw)['a/d.pdf'], "Priya Sharma's Experience Letter (2).pdf");
  assert.ok(sections(raw).find(s => s.title === 'Basic Information').items.some(i => i.l === 'Notes' && i.v === 'hello'));
  assert.equal(timelineGaps(raw)[2].gaps[0], 'Apr 2012 – May 2013');
  assert.equal(Object.keys(DOC_KINDS).join(), 'cv,passport,nationalId,degree,transcript,germanCertificate,experienceLetters');
});

import { candidateSummary, months } from '../public/schema.js';
test('"Are you currently working?" is required and cross-checked against the jobs', () => {
  const job = { current: 'Yes', startDate: '2021-03-01' };
  assert.ok(errs('employment', { work: {}, employment: [], breaks: [] })['work.workNow']);
  assert.match(errs('employment', { work: { workNow: 'Yes' }, employment: [], breaks: [] })['work.workNow'], /current job/);
  assert.match(errs('employment', { work: { workNow: 'No' }, employment: [job], breaks: [] })['work.workNow'], /marked as current/);
  assert.equal(errs('employment', { work: { workNow: 'Yes' }, employment: [job], breaks: [] })['work.workNow'], undefined);
  assert.equal(errs('employment', { work: { workNow: 'No' }, employment: [], breaks: [] })['work.workNow'], undefined);
});
test('months() pluralises', () => assert.equal(months(13), '1 Year 1 Month'));
test('sheet summary: one row with the requested fields', () => {
  const sm = candidateSummary({
    basic: { firstName: 'Priya', lastName: 'Sharma', dateOfBirth: '1995-03-14' },
    college: [{ degree: DEGREES[0], startDate: '2013-06-01', endDate: '2017-05-01' }], schooling: [{ startDate: '2011-06-01', endDate: '2013-03-01' }],
    employment: [{ department: 'ICU', startDate: '2017-08-01', endDate: '2020-12-01', current: 'No' }, { department: 'Emergency', startDate: '2021-03-01', current: 'Yes' }],
    work: { workNow: 'Yes' }, german: { learning: 'Yes', examLevel: 'B1', examStatus: 'Fully Passed' }, breaks: [], languages: [],
    documents: { cv: [{ path: 'a/b.pdf' }], passport: [{ path: 'a/p.pdf' }] },
  });
  assert.equal(sm.name, 'Priya Sharma');
  assert.ok(sm.age >= 30);
  assert.equal(sm.degree, DEGREES[0]);
  assert.equal(sm.department, 'Emergency · ICU');            // current job first
  assert.equal(sm.currentlyWorking, 'Yes');
  assert.equal(sm.germanCert, 'B1 – Fully Passed');
  assert.match(sm.gaps, /Apr 2013 – May 2013/);
  assert.equal(sm.cvName, "Priya Sharma's CV.pdf");           // CV only, never the passport
  assert.equal(candidateSummary({}).germanCert, 'No certificate');
  assert.equal(candidateSummary({}).gaps, 'None');
});
test('planned first B2 attempt is asked on page 1 and required unless B2+ already held', () => {
  const f = fields('basic').find(x => x.k === 'plannedB2');
  assert.ok(f && f.t === 'date');
  assert.equal(F('basic').indexOf('plannedB2'), F('basic').indexOf('germanLevel') + 1);
  const base = { firstName: 'A', lastName: 'B', nationality: 'India', profession: 'Nurse', dateOfBirth: '1990-01-01', gender: 'Female' };
  assert.ok(errs('basic', { basic: { ...base, germanLevel: 'A2' } })['basic.plannedB2']);
  assert.equal(errs('basic', { basic: { ...base, germanLevel: 'B2' } })['basic.plannedB2'], undefined);
});
test('a Word CV is accepted and named like any other document', () => {
  const cv = fields('documents').find(x => x.k === 'cv');
  assert.equal(cv.word, 1);
  const path = '00000000-0000-4000-8000-000000000000/11111111-1111-4111-8111-111111111111.docx';
  const raw = { basic: { firstName: 'Anita', lastName: 'Verma' }, documents: { cv: [{ path, name: 'cv.docx' }] }, college: [], schooling: [], employment: [], breaks: [], languages: [] };
  assert.equal(fileNames(raw)[path], "Anita Verma's CV.docx");
  assert.equal(validate(normalize(raw))['documents.cv'], undefined);
});
