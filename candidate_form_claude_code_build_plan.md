# Candidate Interview Data Collection Portal
## Claude Code Build Specification

> **Purpose**
>
> Build a neutral, candidate-facing web form used to collect all information required for interview scheduling and candidate profile submission.
>
> The page must **not mention, display, reference, expose, or imply the names "Skillbee" or "Careloop" anywhere** in the UI, source code comments, metadata, page title, file names, URLs, API payload labels, or confirmation messages.

---

# 1. Product Goal

Create a clean, professional, mobile-first candidate information form that:

1. Collects all candidate information required for interview scheduling.
2. Uses a neutral brand identity.
3. Is easy for candidates to complete on mobile.
4. Stores answers in a structured format.
5. Makes it easy for the operations team to copy candidate data into another internal/partner form.
6. Supports document uploads.
7. Supports conditional questions.
8. Prevents incomplete or invalid submissions.
9. Provides a final review screen before submission.
10. Does not expose any partner/company identity that should remain private.

---

# 2. High-Level User Journey

```text
Candidate receives private form link
            |
            v
+---------------------------+
| Landing / Introduction    |
| - Purpose of form         |
| - Estimated completion    |
| - Documents required      |
+---------------------------+
            |
            v
+---------------------------+
| Section 1                 |
| Personal Information      |
+---------------------------+
            |
            v
+---------------------------+
| Section 2                 |
| Contact Information       |
+---------------------------+
            |
            v
+---------------------------+
| Section 3                 |
| Education                 |
+---------------------------+
            |
            v
+---------------------------+
| Section 4                 |
| Professional Details      |
+---------------------------+
            |
            v
+---------------------------+
| Section 5                 |
| Language Details          |
+---------------------------+
            |
            v
+---------------------------+
| Section 6                 |
| Documents                 |
+---------------------------+
            |
            v
+---------------------------+
| Section 7                 |
| Interview Availability    |
+---------------------------+
            |
            v
+---------------------------+
| Review All Information    |
+---------------------------+
       |            |
   Edit section     |
       |            v
       +------> Submit
                    |
                    v
+--------------------------------+
| Submission Confirmation        |
| Candidate Reference ID         |
+--------------------------------+
```

---

# 3. Page Structure

Use a **single-page multi-step form**.

Recommended URL structure:

```text
/
└── candidate-form
```

Do not reveal internal or partner company names in the URL.

Preferred neutral page title:

```text
Candidate Information Form
```

Browser metadata:

```html
<title>Candidate Information Form</title>
<meta
  name="description"
  content="Complete your candidate information and document submission."
/>
```

---

# 4. Visual Layout

## Desktop

```text
┌──────────────────────────────────────────────────────────────┐
│                    Candidate Information                    │
│          Please complete the details below carefully.       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1 Personal   2 Contact   3 Education   4 Experience ...    │
│  ●────────────○───────────○─────────────○────────────────    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │                    FORM SECTION                        │  │
│  │                                                        │  │
│  │  Question                                              │  │
│  │  [_______________________________________________]     │  │
│  │                                                        │  │
│  │  Question                                              │  │
│  │  [ Select option ▼ ]                                   │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│                    [Back]      [Save & Continue]             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌───────────────────────┐
│ Candidate Information │
│ Step 2 of 7           │
│ ●●○○○○○               │
├───────────────────────┤
│                       │
│ Contact Information   │
│                       │
│ Mobile Number *       │
│ [_________________]   │
│                       │
│ Email Address *       │
│ [_________________]   │
│                       │
│ WhatsApp Number       │
│ [_________________]   │
│                       │
│ [ Back ]              │
│ [ Save & Continue ]   │
└───────────────────────┘
```

---

# 5. Branding Rules

The design must be neutral.

## Allowed

- Generic title such as:
  - Candidate Information Form
  - Candidate Profile
  - Interview Registration
  - Candidate Details
- Neutral blue, navy, grey, or white theme.
- Generic icons.

## Strictly prohibited

Do not use:

- Skillbee
- Careloop
- Their logos
- Their email addresses
- Their domains
- Their legal entity names
- Their partner names
- Hidden HTML references
- Source code comments containing those names
- Metadata containing those names
- Tracking labels containing those names

---

# 6. Form Navigation

Use a stepper.

```text
[1 Personal]
      ↓
[2 Contact]
      ↓
[3 Education]
      ↓
[4 Experience]
      ↓
[5 Language]
      ↓
[6 Documents]
      ↓
[7 Interview]
      ↓
[Review]
      ↓
[Submit]
```

Candidate must be able to move backward without losing entered data.

Forward navigation should require validation of mandatory fields in the current section.

---

# 7. Section 1 — Personal Information

Suggested structure:

```text
Personal Information
│
├── First Name *
├── Middle Name
├── Last Name *
├── Date of Birth *
├── Gender *
├── Nationality *
├── Country of Residence *
├── Current City *
├── Marital Status
└── Passport Status *
```

Recommended field formats:

| Field | Type |
|---|---|
| First Name | text |
| Middle Name | text |
| Last Name | text |
| Date of Birth | date |
| Gender | radio/dropdown |
| Nationality | searchable dropdown |
| Country of Residence | searchable dropdown |
| Current City | text |
| Marital Status | dropdown |
| Passport Status | radio |

Possible logic:

```text
Passport Status?
      |
      +---- Yes ----> Ask Passport Number
      |               Ask Issue Date
      |               Ask Expiry Date
      |
      +---- No -----> Skip passport details
```

---

# 8. Section 2 — Contact Information

```text
Contact Information
│
├── Primary Mobile Number *
├── WhatsApp Number *
├── Email Address *
├── Alternate Mobile Number
└── Current Address *
```

Validation:

```text
Mobile:
- country code supported
- digits only after code
- minimum/maximum length validation

Email:
- valid email format

WhatsApp:
- checkbox: "Same as primary mobile"
```

---

# 9. Section 3 — Education

Education must support repeatable entries.

```text
Education
    |
    +--> Add Qualification
              |
              ├── Qualification Level *
              ├── Degree / Course Name *
              ├── Specialization
              ├── Institution *
              ├── University / Board *
              ├── Country *
              ├── Start Date *
              ├── End Date *
              ├── Study Status *
              └── Certificate / Marksheet Upload
```

UI:

```text
Education 1
┌────────────────────────────┐
│ Degree / Course            │
│ Institution                │
│ Start Date     End Date    │
│                            │
│ [Edit]          [Delete]   │
└────────────────────────────┘

        [+ Add Education]
```

Conditional logic:

```text
Study Status
    |
    ├── Completed
    |      └── End date required
    |
    └── Ongoing
           └── End date hidden
```

Validation:

```text
Start Date <= End Date
```

---

# 10. Section 4 — Professional / Work Experience

Must support repeatable employment entries.

```text
Work Experience
      |
      +--> Add Employment
               |
               ├── Employer Name *
               ├── Job Title *
               ├── Department
               ├── Country *
               ├── City
               ├── Start Date *
               ├── Currently Working Here? *
               ├── End Date
               ├── Main Responsibilities *
               └── Experience Certificate Upload
```

Flow:

```text
Currently Working Here?
       |
       +--- Yes ---> Hide End Date
       |
       +--- No ----> Show End Date *
```

Total experience may be calculated automatically.

Example:

```text
Total Professional Experience:
3 Years 7 Months
```

---

# 11. Employment Gap Logic

If required by the source form, support employment/education gaps.

```text
Timeline
│
├── Education
├── Employment
└── Gap
     |
     ├── Gap Start
     ├── Gap End
     └── Reason
```

The system can optionally highlight periods where:

```text
Previous activity ends
        |
        | > allowed gap threshold
        v
Next activity begins
        |
        v
Ask candidate to explain gap
```

Do not implement automatic gap enforcement until the source HTML confirms this requirement.

---

# 12. Section 5 — Language Information

Structure should support multiple languages.

```text
Language Details
       |
       +--> Language
              |
              ├── Language Name *
              ├── Speaking Level *
              ├── Reading Level *
              ├── Writing Level *
              └── Certificate
```

If German language information is required:

```text
German Language
│
├── Current Level
├── Exam Status
├── Exam Provider
├── Exam Date
├── Certificate Upload
└── Next Exam Booking
```

Possible exam status options:

```text
Fully Passed
Partially Passed
Results Awaited
Not Passed
Exam Not Taken
```

Conditional logic:

```text
Have you booked your next exam?
        |
        +--- Yes
        |      ├── Exam level
        |      ├── Provider
        |      └── Confirmed date
        |
        +--- No
               └── Continue
```

---

# 13. Section 6 — Documents

Use large upload cards.

Example:

```text
┌─────────────────────────────────────┐
│ Passport                            │
│ PDF / JPG / PNG                     │
│                                     │
│ Drag file here or click to upload   │
└─────────────────────────────────────┘
```

Potential documents:

```text
Passport
Profile Photo
Degree Certificate
Academic Marksheets
Professional Registration
Language Certificate
Employment Certificate
CV / Resume
Other Supporting Documents
```

Final document list must be taken from the source form HTML.

Upload rules:

```text
Accepted:
PDF
JPG
JPEG
PNG

Recommended maximum:
10 MB per file

Features:
- upload progress
- preview
- replace
- delete
- filename display
```

---

# 14. Section 7 — Interview Information

Possible structure:

```text
Interview Details
│
├── Preferred Interview Date
├── Preferred Time Slot
├── Current Time Zone
├── Available on Short Notice?
├── Video Interview Availability
└── Notes
```

Only include fields confirmed by the source form.

---

# 15. Review Screen

Before submission show:

```text
Review Your Information

Personal Information
[Edit]

Contact Information
[Edit]

Education
[Edit]

Experience
[Edit]

Language
[Edit]

Documents
[Edit]

Interview Details
[Edit]
```

Candidate should not need to navigate manually through every step to edit a section.

---

# 16. Consent

Before submission:

```text
☐ I confirm that the information provided above is correct.

☐ I consent to the use of my information and documents
   for recruitment, interview coordination, candidate
   evaluation, and related processing.
```

Avoid naming specific partner companies.

---

# 17. Submission Flow

```text
Candidate clicks Submit
          |
          v
Validate all required data
          |
     +----+----+
     |         |
 Invalid     Valid
     |         |
     v         v
Show errors   Upload documents
               |
               v
          Save candidate
               |
               v
      Generate reference ID
               |
               v
       Confirmation page
```

---

# 18. Confirmation Page

Display:

```text
Submission Successful

Thank you.

Your information has been received successfully.

Reference ID:
CAND-XXXXXXXX

Our recruitment team will contact you if any
additional information is required.
```

Do not show internal company or partner identity.

---

# 19. Save Progress

Recommended:

```text
Candidate enters:
Mobile + Email

        |
        v
Form session created
        |
        v
Answers autosaved
```

Autosave:
- on field blur
- on section change
- every 30 seconds

If backend auth is not required, use a secure unique session token.

---

# 20. Operations-Friendly Data Format

The backend must save answers using stable keys.

Example:

```json
{
  "personal": {
    "firstName": "",
    "middleName": "",
    "lastName": "",
    "dateOfBirth": "",
    "nationality": ""
  },
  "contact": {
    "phone": "",
    "whatsapp": "",
    "email": ""
  },
  "education": [],
  "employment": [],
  "languages": [],
  "documents": [],
  "interview": {}
}
```

Do not encode partner/company names in object keys.

---

# 21. Admin / Submission View

Recommended internal view:

```text
Candidate
│
├── Personal
├── Contact
├── Education
├── Experience
├── Language
├── Documents
└── Interview
```

Operations team should have:

```text
[Copy]
```

beside important values.

Example:

```text
First Name
Rahul                    [Copy]

Passport Number
XXXXXXXX                  [Copy]

German Level
B1                        [Copy]
```

Optional:

```text
[Copy Full Candidate Data]
```

---

# 22. Source Form Mapping Layer

When the source form HTML is supplied, create a mapping file:

```text
source-field-map.json
```

Example:

```json
[
  {
    "sourceQuestion": "First name",
    "localKey": "personal.firstName",
    "inputType": "text",
    "required": true,
    "order": 1
  }
]
```

This mapping should become the single source of truth.

---

# 23. Exact Source Form Reverse-Engineering Checklist

When HTML is available, Claude Code must inspect:

```text
HTML
 |
 +--> labels
 |
 +--> inputs
 |
 +--> selects
 |      |
 |      +--> all options
 |
 +--> textareas
 |
 +--> required attributes
 |
 +--> placeholder values
 |
 +--> min/max rules
 |
 +--> regex/pattern rules
 |
 +--> hidden fields
 |
 +--> JavaScript listeners
 |
 +--> conditional rendering logic
 |
 +--> repeatable sections
 |
 +--> file upload restrictions
 |
 +--> API schemas where locally visible
 |
 +--> section ordering
```

Output:

```text
SOURCE_FORM_SCHEMA.json
```

---

# 24. Source Form Analysis Output Format

For each field capture:

```json
{
  "id": "field_001",
  "section": "Personal Information",
  "sourceLabel": "First Name",
  "displayLabel": "First Name",
  "type": "text",
  "required": true,
  "placeholder": "",
  "options": [],
  "validation": {},
  "conditionalOn": null,
  "repeatableGroup": null,
  "order": 1
}
```

---

# 25. Dynamic Form Rendering

Preferred implementation:

```text
SOURCE_FORM_SCHEMA.json
             |
             v
      Form Renderer
             |
             +--> text
             +--> date
             +--> dropdown
             +--> radio
             +--> checkbox
             +--> textarea
             +--> upload
             +--> repeatable block
```

This allows the final form to be changed without rewriting the whole UI.

---

# 26. Recommended Tech Stack

Claude Code may use:

```text
Frontend:
Next.js
React
TypeScript
Tailwind CSS

Forms:
React Hook Form
Zod validation

Storage:
Supabase / PostgreSQL

Files:
Supabase Storage / S3-compatible storage

Deployment:
Vercel
```

Simpler version:

```text
Next.js
+
Supabase
```

---

# 27. Suggested Folder Structure

```text
candidate-portal/
│
├── app/
│   ├── candidate-form/
│   │   ├── page.tsx
│   │   └── success/
│   │       └── page.tsx
│   │
│   ├── admin/
│   │   └── submissions/
│   │
│   └── api/
│
├── components/
│   ├── FormStepper.tsx
│   ├── FormSection.tsx
│   ├── DynamicField.tsx
│   ├── FileUpload.tsx
│   ├── RepeatableGroup.tsx
│   └── ReviewSection.tsx
│
├── schemas/
│   ├── candidateSchema.ts
│   └── source-form-schema.json
│
├── lib/
│   ├── validation.ts
│   ├── storage.ts
│   └── formMapping.ts
│
└── types/
    └── candidate.ts
```

---

# 28. Responsive Rules

Target devices:

```text
Mobile: 360px+
Tablet: 768px+
Desktop: 1280px+
```

Design mobile-first.

Buttons on mobile:

```text
width: 100%
minimum height: 48px
```

Form fields:

```text
minimum height: 44px
```

---

# 29. Error Handling

Inline error example:

```text
Passport Expiry Date *

[ 12/03/2025 ]

⚠ Passport expiry date cannot be in the past.
```

Do not clear valid entered information when one field fails validation.

---

# 30. Security and Privacy

Required:

```text
HTTPS
Secure upload storage
Randomized file names
Server-side validation
File MIME validation
No public document URLs
Restricted admin access
CSRF protection where applicable
Rate limiting
```

Do not store sensitive documents in the frontend bundle or public directory.

---

# 31. Partner Identity Isolation

Search the entire codebase before deployment for:

```text
Skillbee
skillbee
Careloop
careloop
```

There should be **zero matches**.

Also inspect:

```text
package metadata
HTML metadata
alt text
comments
environment variable names
API route labels
database table names
analytics labels
email templates
upload paths
browser title
Open Graph tags
```

---

# 32. Candidate Experience Rules

The form should feel:

```text
Professional
Simple
Trustworthy
Fast
Neutral
Mobile-friendly
```

Avoid:

```text
Long paragraphs
Technical terminology
Internal recruitment terminology
Partner references
Unnecessary fields
Excessive page reloads
```

---

# 33. Completion Progress

Show:

```text
Step 4 of 7
57% Complete
```

This reduces abandonment on long forms.

---

# 34. Final Build Flow

```text
Partner HTML received
        |
        v
Extract every field
        |
        v
Create SOURCE_FORM_SCHEMA.json
        |
        v
Verify dropdown values
        |
        v
Verify conditional rules
        |
        v
Build neutral candidate UI
        |
        v
Add validation
        |
        v
Add uploads
        |
        v
Add review screen
        |
        v
Add database
        |
        v
Add internal submission view
        |
        v
Check codebase for prohibited names
        |
        v
Test mobile + desktop
        |
        v
Deploy
```

---

# 35. QA Checklist

Before launch:

```text
[ ] Every source question exists
[ ] Question order matches source requirements
[ ] Required fields match
[ ] Dropdown values match exactly
[ ] Radio options match
[ ] Conditional fields work
[ ] Repeatable education works
[ ] Repeatable employment works
[ ] Upload limits work
[ ] Date validation works
[ ] Mobile layout works
[ ] Back button preserves data
[ ] Review screen works
[ ] Successful submission creates reference ID
[ ] Operations can access submissions
[ ] Copy buttons work
[ ] No prohibited company/partner names are visible
[ ] Search of codebase returns zero prohibited-name matches
```

---

# 36. IMPORTANT — Information Still Required

This specification defines the architecture and experience.

To make the implementation **exactly match the source partner form**, supply the saved partner form HTML or "Webpage, Complete" ZIP.

Once supplied, replace the provisional sections above with the extracted:

```text
Exact section names
Exact field labels
Exact field order
Exact field types
Exact dropdown options
Exact required/optional status
Exact validation
Exact conditional logic
Exact document requirements
```

The candidate-facing UI may use cleaner wording where necessary, but the underlying data model should map one-to-one to the source form.

---

# 37. Instruction to Claude Code

Use this document as the build specification.

Priority order:

```text
1. Functional accuracy
2. One-to-one source form data mapping
3. Privacy / partner identity isolation
4. Mobile usability
5. Data validation
6. Operations copy-paste speed
7. Visual polish
```

Do not invent fields once the source HTML has been analyzed.

If the source form contains a field or validation rule, preserve its meaning.

If the source form contains partner branding or identifying information, remove it from the candidate-facing implementation.

Build the UI as a neutral candidate information portal.
