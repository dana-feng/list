// Appends each piece of feedback from the app to this spreadsheet.
//
// Lives in the feedback Google Sheet (Extensions → Apps Script), deployed as a web app.
// The database posts every new row here (supabase/migrations/…_feedback.sql). Setup is in
// docs/FEEDBACK.md.
//
// SECRET must match the `feedback_sheet_secret` Vault secret in Supabase. It's set in
// Project Settings → Script properties, not here, so it never ends up in the repo.

const SHEET_NAME = 'feedback';
// how each kind reads in the sheet, matching the app's labels
const KINDS = { bug: 'bug', idea: 'feature request', other: 'something else' };
const HEADERS = ['sent', 'kind', 'message', 'username', 'name', 'email', 'app version', 'platform', 'status', 'notes', 'id'];

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!secret || body.secret !== secret) {
    return ContentService.createTextOutput('no');
  }

  const sheet = feedbackSheet();
  // Never let a duplicate delivery add the same feedback twice.
  const ids = sheet.getRange(2, HEADERS.length, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
  if (ids.includes(body.id)) return ContentService.createTextOutput('ok');

  sheet.appendRow([
    body.sent,
    KINDS[body.kind] || body.kind,
    plain(body.message),
    body.username ? '@' + body.username : '',
    plain(body.name),
    plain(body.email),
    body.app_version,
    body.platform,
    'new',
    '',
    body.id,
  ]);
  return ContentService.createTextOutput('ok');
}

// Text starting with = + - @ would be read as a formula; a leading ' keeps it as plain text.
function plain(text) {
  const s = String(text || '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function feedbackSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setColumnWidth(3, 420);
    sheet.getRange('C:C').setWrap(true);
    const status = SpreadsheetApp.newDataValidation().requireValueInList(['new', 'seen', 'doing', 'done', "won't do"]).build();
    sheet.getRange('H2:H').setDataValidation(status);
  }
  return sheet;
}
