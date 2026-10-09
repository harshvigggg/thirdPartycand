# Form Field Map

Mapping between the reference form and our candidate form (`public/schema.js`).
Reference evidence comes from the string catalog embedded in the exported reference page
(`hubspotFields.*`, `profile.candidateForm.*` and the option-catalog block). The export is the
*Documents* page, so it proves labels and option lists exist, **not** which fields sit on which
sub-form, their order, or which are required. Those are confirmed by screenshot (see
`DROPDOWN_VERIFICATION.md`).

Status: ✅ implemented & verified · 🟡 implemented, layout/required status unverified · ⛔ not yet implemented · ❓ existence verified, placement unknown

## Section priority / progress

| # | Section | Status |
|---|---------|--------|
| 1 | Education — Add College / Add Schooling | 🟡 done, awaiting screenshots |
| 2 | Employment / Work Experience | 🟡 timeline UX done; reference dropdowns (Position, Department, Employment relationship, Tasks) not yet adopted — awaiting screenshots |
| 3 | Career Breaks and Gaps | 🟡 implemented with verified type catalog; automatic gap detection across schooling/college/jobs/breaks |
| 4 | Personal Information | 🟡 simplified per Skillbee request (passport number only) |
| 5 | Remaining sections | 🟡 Contact (one phone), Languages (single fluency), Skills (car licence yes/no); Interview section removed |

## Education

Reference section note (verified): *"Please also add a school-leaving qualification in addition to your degree or vocational training so that the profile is 100% complete."*

Reference entry types (from the `type` catalog): `Ausbildung` → "Vocational training" (our **College**), `Allgemeiner Schulabschluss (Highschool)` → "General school leaving certificate (high school)" (our **Schooling**).

### Add College (`college[]`, min 1, max 10)

| Reference label (verified) | Our key | Type | Req | Status / notes |
|---|---|---|---|---|
| Degree | `degree` | select (`DEGREES`, 35) | ✅ | 🟡 options verified from catalog; required status assumed |
| Other degree | `degreeOther` | text | ✅ when Degree = "Other qualification" | 🟡 conditional inferred from catalog value "Anderer Abschluss" — confirm |
| Name of the Qualification in the Home Country | `homeQualification` | select (`HOME_QUALIFICATIONS`, 87) | – | 🟡 catalog verified; whether candidates see this field is unconfirmed |
| Other Qualification - Name of the Qualification in the Home Country | `homeQualificationOther` | text | ✅ when "Other qualification" | 🟡 |
| Name of the university, college or training institution (German) | `institution` | text | ✅ | 🟡 |
| Name of the university, college or training institution (original language) | `institutionOriginal` | text | – | 🟡 |
| Country | `country` | country | ✅ | 🟡 reference uses a fixed 196-country catalog (`land`); we use Intl country names |
| City | `city` | text | – | 🟡 |
| Start date | `startDate` | month | ✅ | 🟡 reference date granularity (day vs month) unknown |
| End date | `endDate` | month | – | ✅ hint verified: "If no date is entered, this experience is considered ongoing to date." |
| Diploma Date | `diplomaDate` | date | – | 🟡 |
| Degree certificate / transcript | `certificate` | file | – | ours (kept from previous form); reference collects documents separately |
| Recognition Eligibility in the Home Country | – | – | – | ❓ label exists (Eligible / Not eligible / Unknown / Not provided); looks like a staff-set field, not implemented |
| Name of the training institution (German / original language) | – | – | – | ❓ second institution label pair exists (`name_der_ausbildungseinrichtung`); may belong to a vocational-training variant — confirm |

### Add Schooling (`schooling[]`, min 0, max 5)

No schooling-specific field labels were found in the reference catalog, so this entry reuses our
generic fields. **Needs a screenshot of the empty Add Schooling form.**

| Our label | key | Type | Req | Status |
|---|---|---|---|---|
| Name of the school | `institution` | text | ✅ | 🟡 unverified |
| Name of the school (original language) | `institutionOriginal` | text | – | 🟡 |
| Country / City | `country`, `city` | country / text | ✅ / – | 🟡 |
| Start date / End date | `startDate`, `endDate` | month | ✅ / – | 🟡 |
| School-leaving certificate | `certificate` | file | – | ours |

### Removed from the old Education step
`level` (generic qualification level), `course`, `specialization`, `university` (board), `status` (Completed/Ongoing radio → replaced by the optional end date rule). Old saved drafts are migrated in `form.js` (`education` → `college`).

## Employment / Work Experience — reference labels found (⛔ not yet implemented)

| Reference label | Catalog | Notes |
|---|---|---|
| Position title/job title | `bezeichnung_der_position_jobtitel` (27) | includes "Other position" |
| Other position | text | conditional on "Other position" (inferred) |
| Name of the company or hospital (German) / (original language) | text | |
| Department | `abteilung` (92) | includes "Other department" |
| Employment relationship | `beschaftigungsverhaltnis` (8) | |
| Facility type | `art_der_einrichtung` → likely `einrichtungstyp` (10) | catalog to confirm |
| Number of beds (required for facility types with inpatient care) | number | conditional on facility type |
| Country / City | | |
| Start date / End date | | same ongoing hint |
| Tasks | `aufgaben_` (947) | multi-select, very large |
| Additional tasks not included in the dropdown | text | |
| Additional information on work experience | text | |
| Conditions treated (required for intensive care, N-ICU, K-ICU, operating theatre) | text | conditional on department |
| Equipment used (required for intensive care, N-ICU, K-ICU, operating theatre) | text | conditional on department |

## Career break — reference labels found (⛔ not yet implemented)

| Reference label | Catalog |
|---|---|
| Type of career break | `berufliche_auszeit_typ` (13) |
| Social or voluntary purpose | text (likely conditional on "Voluntary work") |
| Start date / End date | |

Other experience types in the reference (`type` catalog), not yet mapped: Further training (`Weiterbildung`), Certificates and attestations, Volunteering (`Ehrenamt`), Projects, Language skills.

## Personal Information — reference labels found (⛔ audit pending)

First name, Last name, Birth Name, Date of birth, Gender (`geschlecht`: Non-binary / Male / …), Nationality (`citizenship__new_`, 196), Country of birth, Place of birth, Marital status (`marital_status_new`, 7), Children (`children`, 6), Passport Number, Street and House Number / ZIP Code / City (Home Country), Street and House Number / ZIP Code / City (Germany), Phone, Whatsapp, Email, Current location (`current_location`, 195), City (home country).


## Skillbee product decisions (2026-10-09)

These deliberately diverge from the reference form and override earlier rows:

- **CV first:** the intro screen asks for the CV (optional, recommended). `api/parse-resume.js` reads it with Claude and pre-fills empty fields only; the same file is the required *CV / Resume* document.
- **Timeline UX:** Education = Schooling → College; Work = Jobs → Career Breaks. Entries show their date span and duration; any full month with no dated entry on the step shows a warning asking the candidate to fill it.
- **Personal:** only *Passport Number* (optional); issue/expiry dates and the yes/no question removed. Passport upload is required only when a number is given.
- **Contact:** one mobile number (used for WhatsApp too); alternate and WhatsApp numbers removed.
- **Languages:** one *Fluency* level per language (Native / Fluent / Advanced / Intermediate / Basic); per-language certificate removed.
- **German:** "Have you booked your next exam?" is optional.
- **Skills:** driving licence is a single yes/no for a car (four-wheeler); licence classes removed.
- **Interview Availability:** section removed.
- **Career breaks:** `breaks[]` with the verified 13-type catalog; *Social or voluntary purpose* shown for "Voluntary work" (placement of that conditional is inferred — confirm).
- **Admin candidate file:** opening a submission shows a *Timeline gaps* card (education, work, overall) and a **Download Candidate File** button producing `CAND-XXXX.txt` with every answer plus the gap list; *Copy Full Candidate Data* includes the same gap section.
