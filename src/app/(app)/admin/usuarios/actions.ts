"use server";

import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/get-db-user";
import { revalidatePath, revalidateTag } from "next/cache";
import { sendInvitationEmail } from "@/lib/email";
import type { UserRole } from "@prisma/client";

// TODO: Update ALLOWED_DOMAIN to your Google Workspace domain
const ALLOWED_DOMAIN = "thinkion.com.ar";

export async function updateUserRole(userId: string, role: UserRole) {
  const me = await getDbUser();
  if (me.role !== "ADMIN") throw new Error("Solo un admin puede cambiar roles");

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidateTag("user-permissions", "default");
  revalidatePath("/admin/usuarios");
}

// ── Invitations ───────────────────────────────────────────────────────────────

export async function createInvitation(email: string, role: UserRole) {
  const me = await getDbUser();
  if (me.role !== "ADMIN") throw new Error("Solo un admin puede invitar usuarios");

  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error(`Solo se pueden invitar cuentas @${ALLOWED_DOMAIN}`);
  }

  // Revoke any existing pending invitation for this email (auto-replace)
  await prisma.userInvitation.updateMany({
    where: { email, used_at: null },
    data: { expires_at: new Date() },
  });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.userInvitation.create({
    data: { token, email, role, created_by: me.id, expires_at: expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendInvitationEmail({
    to: email,
    inviterName: me.name,
    role,
    inviteUrl: `${appUrl}/invite/${token}`,
  });

  revalidatePath("/admin/usuarios");
}

export async function revokeInvitation(id: string) {
  const me = await getDbUser();
  if (me.role !== "ADMIN") throw new Error("Solo un admin puede revocar invitaciones");

  await prisma.userInvitation.update({
    where: { id },
    data: { expires_at: new Date() },
  });

  revalidatePath("/admin/usuarios");
}
