/**
 * Centralized date formatting for the app.
 *
 * All functions use timeZone: "America/Argentina/Buenos_Aires" (UTC-3, no DST)
 * so dates render consistently whether called from server-side code (Vercel
 * runs in UTC) or client-side code.
 */

const TZ = "America/Argentina/Buenos_Aires";

/** DD/MM/YYYY  — most common format */
export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: TZ,
  });
}

/** DD de [mes largo] de YYYY  — for narrative contexts */
export function fmtDateLong(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit", month: "long", year: "numeric",
    timeZone: TZ,
  });
}

/** DD [mes corto] YYYY  — for compact displays */
export function fmtDateShort(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: TZ,
  });
}

/** DD/MM  — for same-year contexts where year is implied */
export function fmtDateMonthDay(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit",
    timeZone: TZ,
  });
}

/** DD/MM/YYYY HH:MM  — for audit logs, timestamps */
export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: TZ,
  });
}
