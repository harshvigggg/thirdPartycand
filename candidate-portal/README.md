# Candidate Information Form

A mobile-first, multi-step candidate form with document uploads, a review screen, and an internal submissions view with copy buttons.

- Candidate link: `https://<your-domain>/candidate-form`
- Internal view: `https://<your-domain>/admin` (asks for the access key)

## Setup (about 10 minutes)

1. **Supabase** (free plan works): create a project, open **SQL Editor**, paste `supabase.sql` and run it.
   This creates the `submissions` table and a private `candidate-files` bucket.
2. In Supabase, go to **Project Settings → API** and copy:
   - the Project URL
   - the `service_role` / secret key (keep this private)
3. **Vercel**: import this folder as a new project (framework preset: *Other*) and add these environment variables:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | Project URL from step 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | secret key from step 2 |
   | `ADMIN_KEY` | any long random password (12+ characters) for the internal view |

4. Deploy. Share `/candidate-form` with candidates.

## Changing questions

All sections, fields, options, required rules and conditions live in `public/schema.js`.
The form, review screen, admin view and server validation all read from it, so edit it in one place.

## How it works

- Answers autosave in the candidate's browser (on blur, on step change, every 30 s) and survive a reload.
- Files upload straight to private storage through one-time signed URLs (PDF/JPG/PNG, 10 MB max, enforced by the bucket).
- On submit the server re-validates everything, stores the answers as JSON with stable keys, and returns a `CAND-XXXXXXXX` reference.
- The internal view lists submissions, shows each one section by section with **Copy** buttons, **Copy Full Candidate Data**, and 15-minute download links for documents.
