import { Resend } from "resend";
import { prisma } from "./prisma";

let _resend: Resend | null = null;
function resend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@thinkion.com.ar";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── Logging ───────────────────────────────────────────────────────────────────

async function logEmail(to: string, subject: string, template: string, error?: string) {
  await prisma.emailLog.create({
    data: { to, subject, template, status: error ? "error" : "sent", error: error ?? null },
  });
}

// ── Core send ─────────────────────────────────────────────────────────────────

async function send(to: string | string[], subject: string, html: string, template: string) {
  const recipients = Array.isArray(to) ? to : [to];
  for (const email of recipients) {
    try {
      const { data, error } = await resend().emails.send({ from: FROM, to: email, subject, html });
      if (error) {
        const msg = typeof error === "object" && "message" in error ? String((error as { message: string }).message) : JSON.stringify(error);
        await logEmail(email, subject, template, msg).catch(() => {});
        console.error(`[email] Resend error for ${email}:`, error);
      } else {
        await logEmail(email, subject, template);
        console.log(`[email] Sent to ${email}, id:`, data?.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logEmail(email, subject, template, msg).catch(() => {});
      console.error(`[email] Exception sending to ${email}:`, msg);
    }
  }
}

// ── Template helpers ──────────────────────────────────────────────────────────

/**
 * Replace {key} placeholders in a template string with values from vars.
 * Usage: fillTemplate("Hola {name}", { name: "Juan" }) → "Hola Juan"
 */
export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

/**
 * Base HTML wrapper for all transactional emails.
 * Uses Thinkion violet brand color (#7B61FF) in the heading.
 */
export function baseHtml(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Language" content="es">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="font-family:sans-serif;color:#1f2937;max-width:560px;margin:0 auto;padding:24px">
<h2 style="color:#7B61FF;margin-bottom:4px">${title}</h2>
${body}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
<p style="font-size:12px;color:#9ca3af">Thinkion · <a href="${APP_URL}" style="color:#7B61FF">Abrir sistema</a></p>
</body>
</html>`;
}

// ── Generic email sender ──────────────────────────────────────────────────────

/**
 * Send a generic transactional email.
 * For simple use cases where you don't need a specific template function.
 *
 * @param to - Recipient email or array of emails
 * @param subject - Email subject line
 * @param html - Full HTML body (use baseHtml() for consistent branding)
 * @param template - Template identifier for logging (e.g. "welcome", "reset_password")
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  template = "generic"
) {
  await send(to, subject, html, template);
}

// ── Invitation email ──────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  VIEWER:      "Viewer",
  EJECUTIVO:   "Ejecutivo",
  SUPERVISOR:  "Supervisor",
  FACTURACION: "Facturación",
  ADMIN:       "Admin",
};

export async function sendInvitationEmail({
  to,
  inviterName,
  role,
  inviteUrl,
  appName = "Thinkion",
}: {
  to: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  appName?: string;
}) {
  const rolLabel = ROLE_LABEL[role] ?? role;
  const subject = `Te invitaron a ${appName}`;
  const html = baseHtml(
    `Invitación a ${appName}`,
    `
    <p><strong>${inviterName}</strong> te invitó a acceder a ${appName} con el rol <strong>${rolLabel}</strong>.</p>
    <p style="margin:24px 0">
      <a href="${inviteUrl}" style="display:inline-block;background:#6B4EFF;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Aceptar invitación
      </a>
    </p>
    <p style="color:#6b7280;font-size:13px">Este link expira en 48 horas.</p>
    <p style="color:#6b7280;font-size:13px">Debés ingresar con la cuenta <strong>${to}</strong>.</p>
    `
  );
  await send(to, subject, html, "invitation");
}
