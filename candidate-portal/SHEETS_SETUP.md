# Google Sheet setup (service account — about 20 minutes, once)

Every submitted candidate becomes **one colour-coded row** on a tab called **Candidates**, written through the Google Sheets API by a
service account (a robot Google account that belongs to your Google Cloud project). It needs no web link, no login and no deployment,
so nothing expires. Re-sending a candidate replaces their row (matched on Ref ID).

Columns: Ref ID · Submitted · **Name** · **Age** · **Degree** · **Total Exp** · **Department** · **Currently Working?** · **B1/B2 Certificate** · **Timeline Gaps** · **CV** (link; the CV only).

## A. In Google Cloud (use your skillbee.com account)
1. Go to **console.cloud.google.com** → project picker (top bar) → **New project** → name it `candidate-sheet` → Create, then select it.
2. **APIs & Services → Library** → search **Google Sheets API** → **Enable**.
3. **IAM & Admin → Service accounts → Create service account** → name `candidate-sheet` → Create and continue → Done (no roles needed).
4. Click the new service account → **Keys → Add key → Create new key → JSON → Create.** A `.json` file downloads. Keep it private.
   Copy the account's email (looks like `candidate-sheet@candidate-sheet-123456.iam.gserviceaccount.com`).
   > If it says *"Service account key creation is disabled"*, your Workspace admin must turn off the organisation policy
   > `iam.disableServiceAccountKeyCreation` for this project. Ask them, or use a personal Gmail account instead.

## B. In Google Sheets
1. Create a blank sheet in your skillbee.com Drive.
2. **Share** → paste the service account email → role **Editor** → untick "Notify" → Share.
   (If Google refuses to share outside the company, your admin must allow sharing with that service account.)
3. Copy the **sheet ID**: the long text in the sheet's URL between `/d/` and `/edit`.

## C. Connect the website
Replace `PASTE_SHEET_ID` and the path of the downloaded key file, then run:
```bash
cd candidate-portal
KEY=$(base64 < ~/Downloads/YOUR-KEY-FILE.json | tr -d '\n')
printf 'GOOGLE_SERVICE_ACCOUNT_JSON=%s\nSHEET_ID=PASTE_SHEET_ID\n' "$KEY" >> .env
printf '%s' "$KEY" | npx vercel env add GOOGLE_SERVICE_ACCOUNT_JSON production
printf '%s' 'PASTE_SHEET_ID' | npx vercel env add SHEET_ID production
cd .. && git commit --allow-empty -m "Connect Google Sheet" && git push
```
Then delete the downloaded key file from Downloads.

## D. Send the candidates you already have
Open `/admin` → **Send all to Google Sheet** (or **Send to Google Sheet** on one candidate). The coloured layout builds itself on the first send.
New submissions are sent automatically; if Google is unreachable the candidate still submits and you can re-send from `/admin`.

## What each column means
| Column | Value |
|---|---|
| Age | from the date of birth, on the day of sending |
| Degree | every college degree, oldest first |
| Total Exp | all jobs, overlapping periods counted once |
| Department | every department worked in, current/latest first |
| Currently Working? | the candidate's own answer (cross-checked against their jobs) |
| B1/B2 Certificate | certified German level and status, e.g. `B2 – Fully Passed`; or `B1 (no certificate yet)`; or `No certificate` |
| Timeline Gaps | every full month with nothing entered between schooling, college, jobs and breaks; `None` if complete |
| CV | link that opens the CV (passport and other documents are never sent to the sheet) |

Colours: green = working / no gaps / B2 or higher · amber = B1 · pink-red = gaps or no certificate · cream and white stripes.

## Alternative: Apps Script web app
`google-apps-script/Code.gs` still works as a fallback (`SHEETS_WEBHOOK_URL` + `SHEETS_SECRET`), but its web app must allow "Anyone", which many Workspaces block. The service account route above is preferred and takes priority when both are set.
