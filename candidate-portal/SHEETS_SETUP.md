# Google Sheet setup (about 5 minutes)

Every submitted candidate becomes **one colour-coded row** in a sheet tab called **Candidates**.
Columns, in the order of a candidate's story: Ref ID · Submitted · **Name** · **Age** · **Degree** · **Total Exp** · **Department** · **Currently Working?** · **B1/B2 Certificate** · **Timeline Gaps** · **CV** (link, CV only).
Re-sending a candidate replaces their row (matched on Ref ID), so there are never duplicates.

## 1. Make the secret
Run this once. It saves `SHEETS_SECRET` in your local `.env` and prints it so you can paste it into Google:
```bash
cd candidate-portal && S=$(openssl rand -hex 16) && printf 'SHEETS_SECRET=%s\n' "$S" >> .env && echo "$S"
```

## 2. Create the sheet
1. Create a blank Google Sheet (any name). Share it only with the people who may see candidate data.
2. **Extensions → Apps Script**, delete the sample code, paste all of `google-apps-script/Code.gs`, click Save.
3. **Project Settings (gear) → Script properties → Add**: name `SECRET`, value = the secret from step 1.
4. Pick the function **setup** in the toolbar and press **Run**. Accept the permission prompt. The coloured layout appears.
5. **Deploy → New deployment → Web app**: Execute as *Me*, Who has access *Anyone* → Deploy. Copy the **Web app URL**.

## 3. Connect the website
Replace the two placeholders and run (also adds the settings to Vercel):
```bash
cd candidate-portal
printf 'SHEETS_WEBHOOK_URL=PASTE_WEB_APP_URL\n' >> .env
printf '%s' 'PASTE_WEB_APP_URL' | npx vercel env add SHEETS_WEBHOOK_URL production
grep '^SHEETS_SECRET=' .env | cut -d= -f2- | tr -d '\n' | npx vercel env add SHEETS_SECRET production
git commit --allow-empty -m "Connect Google Sheet" && git push   # redeploys with the new settings
```

## 4. Send the candidates you already have
Open `/admin` → **Send all to Google Sheet**. Each candidate page also has **Send to Google Sheet**.
New submissions are sent automatically; if Google is unreachable the candidate still submits and you can re-send from `/admin`.

## What each column means
| Column | Value |
|---|---|
| Age | from the date of birth, on the day of sending |
| Degree | every college degree, oldest first |
| Total Exp | all jobs, overlapping periods counted once |
| Department | every department worked in, current/latest first |
| Currently Working? | the candidate's own answer (cross-checked against their jobs) |
| B1/B2 Certificate | certified German level and exam status, e.g. `B2 – Fully Passed`; or `B1 (no certificate yet)`, or `No certificate` |
| Timeline Gaps | every full month with nothing entered between schooling, college, jobs and breaks; `None` if complete |
| CV | link that opens the CV (the passport and other documents are never sent to the sheet) |

Colours: green = working / no gaps / B2 or higher, amber = B1, red-pink = gaps or no certificate, soft cream/white stripes for readability.
