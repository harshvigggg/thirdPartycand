# Form Validation

Rules live in `public/schema.js` (`check()` / `validate()`) and run identically in the browser and
in `api/submit.js`, so nothing the client skips gets past the server.

## Global rules (unchanged)

- Required fields: "This field is required." / "Please choose an option." / "Please upload this document."
- Select / radio values must be in the field's option list; multi-selects must have no duplicates.
- Text ≤ 200 chars, textarea ≤ 2000. Name fields: letters, spaces, `.'-` only.
- Dates: `date` = `YYYY-MM-DD`, `month` = `YYYY-MM`, not before 1900. `past` ⇒ not after today, `future` ⇒ not before today (server allows 1 day of time-zone slack). `after: <key>` ⇒ must be on/after that sibling field.
- Hidden conditional fields are never validated and are dropped by `normalize()` on submit, so stale values from a previous choice cannot leak into the submission. Values are kept in the draft while hidden, so toggling a choice back restores what the candidate typed.
- Repeat groups: `min`/`max` entries enforced; each entry validated with the same rules.
- Files: PDF/JPG/PNG ≤ 10 MB, path must belong to the candidate's upload session.
- Drafts auto-save to `localStorage` on change/blur/every 30 s; all steps keep their data when navigating.

## Education

### College (`college[]`) — at least 1 entry, up to 10
| Field | Rule |
|---|---|
| Degree | required, must be one of `DEGREES` |
| Other degree | shown **only** when Degree = "Other qualification"; then required |
| Name of the Qualification in the Home Country | optional, must be one of `HOME_QUALIFICATIONS` |
| Other Qualification – Name… | shown only when the above = "Other qualification"; then required |
| Institution (German) | required |
| Institution (original language) | optional |
| Country | required, must match the country list (client) |
| City | optional |
| Start date | required, month, not in the future |
| End date | optional, month, ≥ start date; blank = ongoing (hint shown) |
| Diploma Date | optional, date, not in the future |
| Certificate | optional file |

### Schooling (`schooling[]`) — optional, up to 5
Institution + Country + Start date required; End date optional ≥ start; other fields optional.

### Known gaps / assumptions to confirm by screenshot
- Which College fields are marked `*` in the reference.
- Whether the reference uses full dates or month/year for start/end.
- Whether "Diploma Date" and "Name of the Qualification in the Home Country" are candidate-editable.
- Schooling field list (currently generic).
- The reference also stores "Recognition Eligibility in the Home Country" — assumed staff-only, not collected.

## Employment / Career break / Personal — to be filled in as each section is updated.
Reference conditional hints already known: "Conditions treated" and "Equipment used" are *required for intensive care, N-ICU, K-ICU, operating theatre*; "Number of beds" is *required for facility types with inpatient care*; blank end date = ongoing.
