# Feedback

People send feedback from **settings → help + feedback**: a bug, a feature request, or something else, plus a message, and optionally an email if they'd like a reply. It's saved to the `feedback` table (write-only from the app, like reports), along with their app version and platform.

Each new row is also copied to a Google Sheet, which is where we read and triage it. Columns: sent, kind, message, username, name, email (if they left one), app version, platform, **status** (new / seen / doing / done / won't do, a dropdown), **notes**, id. Status and notes are ours to fill in.

## How it gets to the sheet

```
app ──insert──▶ feedback table ──trigger (pg_net)──▶ Apps Script web app ──▶ Google Sheet
```

The trigger posts in the background after the row is saved, so if the sheet is down or misconfigured, feedback is still kept in the table. Failed posts show up in `net._http_response` (SQL editor: `select * from net._http_response order by created desc limit 20;`).

## One-time setup

1. **Make the sheet.** Create a Google Sheet (e.g. "list feedback") and share it with each other.
2. **Add the script.** In the sheet: Extensions → Apps Script. Replace `Code.gs` with [`feedback-sheet.gs`](feedback-sheet.gs).
3. **Set the secret.** Make up a long random string (`openssl rand -hex 24`). In Apps Script: Project Settings (gear) → Script properties → add `SECRET` = that string.
4. **Deploy.** Deploy → New deployment → type **Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy, authorize, and copy the web app URL (ends in `/exec`).
   "Anyone" only means the URL can be called; without the secret it does nothing.
5. **Tell Supabase.** After the migration is applied, run this in the Supabase SQL editor:
   ```sql
   select vault.create_secret('https://script.google.com/macros/s/…/exec', 'feedback_sheet_url');
   select vault.create_secret('<the same string as SECRET>', 'feedback_sheet_secret');
   ```
6. **Test.** Send feedback from the app. A `feedback` tab appears in the sheet with headers and the new row.

**Changing the script later:** Deploy → Manage deployments → edit (pencil) → Version: New version. This keeps the same URL. A "New deployment" gives a new URL, which you'd then need to update in Vault (`select vault.update_secret(id, '<new url>') from vault.secrets where name = 'feedback_sheet_url';`).

## Moving off the sheet later

The table is the source of truth, so switching to another tool (Notion, Linear…) only means changing where the trigger posts. Rows already in the table can be backfilled.
