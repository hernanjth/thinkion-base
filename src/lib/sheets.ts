import { google } from "googleapis";

/**
 * Google Sheets / Drive helpers.
 *
 * Requires a Service Account with:
 *   - Viewer access to any Sheet you want to read
 *   - "Content Manager" role in the Shared Drive for exports
 *
 * Environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY  (with literal \n between sections, wrapped in double quotes in Vercel)
 *   GOOGLE_EXPORT_DRIVE_ID  (Shared Drive ID for createExportSheet)
 */

function getCredentials() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "")
    .replace(/\\n/g, "\n")   // literal \n → real newlines
    .replace(/^"|"$/g, "")   // strip surrounding quotes if Vercel added them
    .trim();

  return {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: privateKey,
  };
}

export function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

function getWriteAuth() {
  return new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

/**
 * Create a new Google Spreadsheet in the Shared Drive with the given data,
 * formatted with bold headers, frozen row 1, and auto-resized columns.
 * The sheet is shared publicly (anyone with link can view).
 *
 * @param title - Spreadsheet title (visible in Drive)
 * @param headers - Column headers for row 1
 * @param rows - Data rows (null values become empty strings)
 * @returns Direct edit URL of the created spreadsheet
 */
export async function createExportSheet(
  title: string,
  headers: string[],
  rows: (string | number | null)[][]
): Promise<string> {
  const driveId = process.env.GOOGLE_EXPORT_DRIVE_ID;
  if (!driveId) throw new Error("GOOGLE_EXPORT_DRIVE_ID no está configurado.");

  const auth = getWriteAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  // 1. Create spreadsheet in the Shared Drive (avoids SA's personal quota limits)
  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: title,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [driveId],
    },
    fields: "id",
  });
  const spreadsheetId = created.data.id!;
  const sheetId = 0;

  // 2. Write headers + data in one call
  const values = [headers, ...rows.map((r) => r.map((v) => v ?? ""))];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "A1",
    valueInputOption: "RAW",
    requestBody: { values },
  });

  // 3. Format: bold header, freeze row 1, auto-resize columns
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Bold header row
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
        // Freeze row 1
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
        // Auto-resize all columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: headers.length,
            },
          },
        },
      ],
    },
  });

  // 4. Share: anyone with the link can view
  await drive.permissions.create({
    fileId: spreadsheetId,
    supportsAllDrives: true,
    requestBody: { type: "anyone", role: "reader" },
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
