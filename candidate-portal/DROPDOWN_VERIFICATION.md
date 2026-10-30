# Dropdown Verification

Every dropdown in the form, with where its options came from and what is still needed.
"Catalog" = the option catalog embedded in the exported reference page (German key → English label;
where the English label is blank the reference UI shows the German key, and so do we).
Catalog order is alphabetical by German key, which may differ from the on-screen order — ordering
is only confirmed by screenshot.

Legend: ✅ verified · 🟡 partially verified · ❌ missing / needs screenshot · ⚪ ours (not in reference)

## Education

| Dropdown | Options | Source | Status | Needs |
|---|---|---|---|---|
| Degree | 35 (`DEGREES` in `public/catalogs.js`) | catalog `abschluss` | 🟡 | screenshot of the open Degree dropdown on **Add College** to confirm display language, order and that all 35 appear (list is long — 2–3 screenshots scrolled) |
| Name of the Qualification in the Home Country | 87 (`HOME_QUALIFICATIONS`) | catalog `bezeichnung_des_abschlusses_im_heimatland_` (92 raw, 5 duplicate labels merged) | 🟡 | screenshot confirming the field is shown to candidates and whether it is filtered by country |
| Country (College / Schooling) | Intl country names (~250) | ⚪ ours; reference catalog `land` has 196 | 🟡 | optional: screenshot if the reference list should be matched exactly |
| Any dropdown on Add Schooling | – | none found | ❌ | screenshot of the empty **Add Schooling** form |

## Employment (queued)

| Dropdown | Options | Source | Status | Needs |
|---|---|---|---|---|
| Position title/job title | 27 | catalog `bezeichnung_der_position_jobtitel` | 🟡 | screenshot (order / language) |
| Department | 92 | catalog `abteilung` | 🟡 | screenshot; also confirm which departments trigger "Conditions treated / Equipment used" |
| Employment relationship | 8 | catalog `beschaftigungsverhaltnis` | 🟡 | screenshot |
| Facility type (work experience) | 10? | catalog `einrichtungstyp` (guess — `art_der_einrichtung` has no catalog of its own) | ❌ | screenshot |
| Tasks | 947 | catalog `aufgaben_` | 🟡 | screenshot of the control type (search/multi-select?) — full list cannot be screenshot-verified; will mark partially verified |

## Career break (queued)

| Dropdown | Options | Source | Status | Needs |
|---|---|---|---|---|
| Type of career break | 13 | catalog `berufliche_auszeit_typ` | 🟡 | screenshot |

## Personal Information (queued)

| Dropdown | Options | Source | Status | Needs |
|---|---|---|---|---|
| Gender | 4 | catalog `geschlecht` | 🟡 | screenshot |
| Marital status | 7 | catalog `marital_status_new` | 🟡 | screenshot |
| Children | 6 | catalog `children` | 🟡 | screenshot |
| Nationality / Country of birth / Current location | 196 | catalogs `citizenship__new_`, `geburtsland`, `current_location` | 🟡 | – |

## Other sections (queued)

| Dropdown | Options | Source | Status |
|---|---|---|---|
| Languages spoken | 78 / 96 | `gesprochene_sprachen__neu_` / `sprache` | 🟡 |
| Proficiency level | 6 (A1 – Basics … C2 – Native speaker) | `kenntnisstand` | 🟡 |
| Current German level | 14 | `german_language_level` | 🟡 |
| Certification body (German certificate) | 6 | `zertifizierungsstelle` | 🟡 |
| Exam status / Exam parts passed | 18 / 6 | `prufungsstatus`, `prufungsteile_bestanden` | 🟡 |
| Facility type (preferences) | 6 | `einrichtungs_typ` | 🟡 |
| Departments (preferences) | 77 | `abteilung_en` | 🟡 |
| States / Region / Adjustment measure / Family reunification | 17 / 3 / 3 / 13 | `praferiertes_bundesland`, `praferierte_region`, `praferierte_anpassungsma_nahme`, `familiennachzug` | 🟡 |
| Driver's license / IT skills | 3 / 8 | `fuhrerschein`, `it_kenntnisse` | 🟡 |
| Vaccinations | 16 | `impfung` | 🟡 |


## Verified from reference screenshots (2026-10-30)

| Dropdown | Options now used | Status |
|---|---|---|
| Nationality / Current location / Country of birth / Country | reference `land` list (196) | ✅ |
| Profession | `nurse_type` (17; "nicht benutzen – MTRA" dropped) | ✅ |
| Current German level / Proficiency Level | `kenntnisstand` (A1 – Basics … C2 – Native speaker) + "No German yet" (ours) | ✅ |
| Marital status | `marital_status_new` (7) | ✅ |
| Children | `children` (6) | ✅ |
| Position title/job title | `bezeichnung_der_position_jobtitel` (27, incl. "Other position" → free text) | ✅ |
| Facility type (work) | `einrichtungstyp` (+ Other) | 🟡 screenshot shows German label "Krankenhaus"; list itself unverified |
| Number of beds | free text (number) | ❌ reference is a dropdown; only "Weniger als 150" seen |
| Department (work) | `abteilung` (92) | ✅ |
| Employment relationship | `beschaftigungsverhaltnis` (8) | ✅ |
| Tasks | free text | ❌ reference is a 947-item multi-select; cannot be verified by screenshot |
| Driver's license | `fuhrerschein` (3) | ✅ |
| IT skills | `it_kenntnisse` (8) | ✅ |
| Language | `sprache` (96) | ✅ |
| Preferences: Facility type / Departments / States / Region / Adjustment measure / Family reunification | `einrichtungs_typ` (6) / `abteilung_en` (77) / `praferiertes_bundesland` (17) / `praferierte_region` (3) / `praferierte_anpassungsma_nahme` (3) / `familiennachzug` (13) | ✅ |
