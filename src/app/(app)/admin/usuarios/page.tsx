import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/get-db-user";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { InviteForm } from "./invite-form";
import { fmtDateTime } from "@/lib/dates";
import { Clock, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RevokeButton } from "./revoke-button";

const ROLE_LABELS: Record<string, string> = {
  VIEWER:      "Viewer",
  EJECUTIVO:   "Ejecutivo",
  SUPERVISOR:  "Supervisor",
  FACTURACION: "Facturación",
  ADMIN:       "Admin",
};

export default async function UsuariosPage() {
  const me = await getDbUser();
  if (!hasPermission(me, "administracion", "ver")) redirect("/");

  const isAdmin = me.role === "ADMIN";

  const [users, pendingInvitations] = await Promise.all([
    prisma.user.findMany({
      orderBy: { created_at: "asc" },
      include: { permissions: true },
    }),
    isAdmin
      ? prisma.userInvitation.findMany({
          where: {
            used_at: null,
            expires_at: { gt: new Date() },
          },
          include: { creator: { select: { name: true } } },
          orderBy: { created_at: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestioná accesos, roles e invitaciones."
        stat={{ label: "total", value: users.length }}
        actions={isAdmin ? <InviteForm /> : undefined}
      />

      {/* ── Registered users ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-sm text-gray-500">
          {isAdmin
            ? "Podés cambiar roles directamente en la tabla."
            : "Solo los admins pueden cambiar roles y permisos."}
        </p>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Rol</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50/50 ${u.id === me.id ? "bg-violet-50/30" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.name}
                    {u.id === me.id && (
                      <span className="ml-2 text-xs text-violet-500">(vos)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">
                    {fmtDateTime(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pending invitations (admin only) ───────────────────────────── */}
      {isAdmin && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-700">Invitaciones pendientes</h2>
            {pendingInvitations.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
                {pendingInvitations.length}
              </span>
            )}
          </div>

          {pendingInvitations.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-6 py-8 text-center">
              <p className="text-sm text-gray-400">No hay invitaciones pendientes.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      <span className="inline-flex items-center gap-1.5"><Mail size={12} />Email</span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Rol</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Invitado por</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      <span className="inline-flex items-center gap-1.5"><Clock size={12} />Expira</span>
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendingInvitations.map((inv) => {
                    const hoursLeft = Math.ceil((inv.expires_at.getTime() - Date.now()) / 3600000);
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-900 font-medium">{inv.email}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                            {ROLE_LABELS[inv.role] ?? inv.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{inv.creator.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs tabular-nums ${hoursLeft <= 6 ? "text-amber-600 font-medium" : "text-gray-500"}`}>
                            {fmtDateTime(inv.expires_at)}
                            {hoursLeft <= 6 && <span className="ml-1">({hoursLeft}h)</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <RevokeButton id={inv.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
