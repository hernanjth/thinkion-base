"use client";

import { useState, useTransition } from "react";
import { UserPlus, X, Send, Loader2 } from "lucide-react";
import { createInvitation } from "./actions";
import type { UserRole } from "@prisma/client";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "EJECUTIVO",   label: "Ejecutivo" },
  { value: "SUPERVISOR",  label: "Supervisor" },
  { value: "FACTURACION", label: "Facturación" },
  { value: "VIEWER",      label: "Viewer" },
  { value: "ADMIN",       label: "Admin" },
];

export function InviteForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("EJECUTIVO");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setOpen(false);
    setEmail("");
    setRole("EJECUTIVO");
    setError(null);
    setSuccess(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await createInvitation(email.trim(), role);
        setSuccess(`Invitación enviada a ${email.trim()}`);
        setEmail("");
        setRole("EJECUTIVO");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar la invitación");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: "#6B4EFF" }}
      >
        <UserPlus size={14} />
        Invitar usuario
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-violet-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-violet-50/50">
        <div className="flex items-center gap-2">
          <UserPlus size={14} className="text-violet-600" />
          <span className="text-sm font-medium text-gray-900">Nueva invitación</span>
        </div>
        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={14} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-500 mb-1">Email corporativo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@thinkion.com.ar"
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 bg-white"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        {success && (
          <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">✓ {success}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !email}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#6B4EFF" }}
          >
            {isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            {isPending ? "Enviando…" : "Enviar invitación"}
          </button>
        </div>
      </form>
    </div>
  );
}
