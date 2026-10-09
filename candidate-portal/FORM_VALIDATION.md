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

## Schooling (`schooling[]`) — at least 1, up to 5
Institution, Country, Start date required; End date optional ≥ start (blank = ongoing).

## Work Experience
### Jobs (`employment[]`) — optional, up to 15
Employer, Job Title, Country, "Currently working here?", Start date, Main Responsibilities required; End date required unless current; dates not in the future, end ≥ start.
### Career breaks (`breaks[]`) — optional, up to 10
Type (catalog) and Start date required; *Social or voluntary purpose* required only when Type = "Voluntary work"; End date optional ≥ start.
### Timeline gaps (soft check)
`gaps()` merges every dated entry on the step (schooling + college, or jobs + breaks) and lists every full month with no entry (a single empty month counts). It is a warning, not a blocker — the candidate can still continue.

## Personal / Contact / Languages / Skills (simplified)
- Passport Number optional; when given it must be 6–12 letters/digits and the passport upload becomes required.
- One mobile number (`+<code> <6–14 digits>`), email, address required.
- Each language: name + fluency required. German: "next exam booked" optional; follow-up fields required only when "Yes".
- Driving licence: yes/no required.

## CV pre-fill
Values from the CV are written only into empty fields and then validated exactly like typed input, so a wrong extraction is caught by the same rules. Lists (schooling, college, jobs, languages) are filled only when the candidate has not typed any entry yet.

## Employment / Personal reference dropdowns — pending screenshots.
Reference conditional hints already known: "Conditions treated" and "Equipment used" are *required for intensive care, N-ICU, K-ICU, operating theatre*; "Number of beds" is *required for facility types with inpatient care*; blank end date = ongoing.
