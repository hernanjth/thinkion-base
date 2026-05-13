import Link from "next/link";
import { ShieldX } from "lucide-react";
import { signOut } from "@/app/login/actions";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-5 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#FFF1F2" }}
          >
            <ShieldX size={22} className="text-red-500" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-gray-900">
              Acceso no autorizado
            </h1>
            <p className="text-sm text-gray-500">
              Tu cuenta no tiene acceso al sistema.
              <br />
              Contactá al administrador para solicitar una invitación.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full pt-1">
            <form action={signOut}>
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: "#6B4EFF" }}
              >
                Cerrar sesión
              </button>
            </form>
            <Link
              href="/login"
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors text-center"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
