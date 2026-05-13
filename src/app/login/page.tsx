import { signInWithGoogle } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized_domain:
    "Solo se permite el acceso con cuentas del dominio autorizado.",
  auth_failed: "Hubo un problema al iniciar sesión. Intentá de nuevo.",
  no_invitation:
    "Tu cuenta no tiene acceso. Pedile una invitación al administrador.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-6">
          {/* Logo / title — TODO: Update app name */}
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: "#6B4EFF" }}
            >
              T
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mt-2">
              {/* TODO: Update with your app name */}
              App Thinkion
            </h1>
            <p className="text-sm text-gray-500 text-center">
              Ingresá con tu cuenta de Google corporativa
            </p>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 text-center">
              {errorMessage}
            </div>
          )}

          {/* Google button */}
          <form action={signInWithGoogle} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <GoogleIcon />
              Continuar con Google
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center">
            El acceso requiere una invitación del administrador.
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
      />
      <path
        fill="#34A853"
        d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
      />
      <path
        fill="#FBBC05"
        d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"
      />
      <path
        fill="#EA4335"
        d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"
      />
    </svg>
  );
}
