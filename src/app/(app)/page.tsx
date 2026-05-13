import { PageHeader } from "@/components/layout/page-header";
import { getDbUser } from "@/lib/get-db-user";

const ROLE_LABELS: Record<string, string> = {
  VIEWER:      "Viewer",
  EJECUTIVO:   "Ejecutivo",
  SUPERVISOR:  "Supervisor",
  FACTURACION: "Facturación",
  ADMIN:       "Administrador",
};

export default async function HomePage() {
  const dbUser = await getDbUser();
  const firstName = dbUser.name.split(" ")[0];

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={`Hola, ${firstName}`}
        description="Bienvenido al sistema. Seleccioná una sección del menú para comenzar."
      />

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-medium text-gray-700">Tu cuenta</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-400">Nombre</dt>
          <dd className="text-gray-900">{dbUser.name}</dd>
          <dt className="text-gray-400">Email</dt>
          <dd className="text-gray-900">{dbUser.email}</dd>
          <dt className="text-gray-400">Rol</dt>
          <dd>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
              {ROLE_LABELS[dbUser.role] ?? dbUser.role}
            </span>
          </dd>
        </dl>
      </div>
    </div>
  );
}
