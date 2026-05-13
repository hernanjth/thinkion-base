import { prisma } from "@/lib/prisma";
import { signInWithInvite } from "./actions";
import { ShieldX, Mail } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  VIEWER:      "Viewer",
  EJECUTIVO:   "Ejecutivo",
  SUPERVISOR:  "Supervisor",
  FACTURACION: "Facturación",
  ADMIN:       "Admin",
};

// TODO: Update with your app name
const APP_NAME = "App Thinkion";

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;

  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    include: { creator: { select: { name: true } } },
  });

  // ── Error states ──────────────────────────────────────────────────────────
  if (!invitation) {
    return <ErrorCard title="Link inválido" message="Este link de invitación no existe o fue eliminado." />;
  }
  if (invitation.used_at) {
    return <ErrorCard title="Link ya utilizado" message="Esta invitación ya fue usada. Si necesitás acceso, pedí una nueva invitación al administrador." />;
  }
  if (invitation.expires_at < new Date()) {
    return <ErrorCard title="Link expirado" message="Este link de invitación expiró. Pedí una nueva invitación al administrador." />;
  }

  // ── Valid invitation ──────────────────────────────────────────────────────
  const signInAction = signInWithInvite.bind(null, token);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: "#6B4EFF" }}
            >
              T
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mt-2">
              {APP_NAME}
            </h1>
            <p className="text-sm text-gray-500 text-center">
              Fuiste invitado por <span className="font-medium text-gray-700">{invitation.creator.name}</span>
            </p>
          </div>

          {/* Invitation details */}
          <div className="w-full bg-violet-50 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-violet-500 shrink-0" />
              <span className="text-sm text-violet-900 font-medium truncate">{invitation.email}</span>
            </div>
            <p className="text-xs text-violet-600 pl-5">
              Rol asignado: <span className="font-semibold">{ROLE_LABELS[invitation.role] ?? invitation.role}</span>
            </p>
          </div>

          {/* Error banners */}
          {error === "auth_failed" && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 text-center">
              Hubo un problema al iniciar sesión. Intentá de nuevo.
            </div>
          )}
          {error === "email_mismatch" && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 text-center">
              La cuenta de Google no coincide con el email de la invitación. Usá la cuenta <strong>{invitation.email}</strong>.
            </div>
          )}

          {/* Sign in button */}
          <form action={signInAction} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <GoogleIcon />
              Ingresar con Google
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center">
            Debés ingresar con la cuenta <strong>{invitation.email}</strong>
          </p>
        </div>
      </div>
    </main>
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-5 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-50">
            <ShieldX size={22} className="text-red-500" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z" />
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
    </svg>
  );
}
