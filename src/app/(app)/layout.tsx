import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDbUser } from "@/lib/get-db-user";
import { AppShell } from "@/components/layout/app-shell";

// Routes restricted from FACTURACION role — update as needed
const FACTURACION_RESTRICTED = ["/admin"];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getDbUser() is wrapped with React.cache() — any child page that also calls
  // it within the same request gets the already-resolved value at zero extra cost.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await getDbUser();
  const role = dbUser.role;

  // FACTURACIÓN users can only access /facturacion and allowed routes
  if (role === "FACTURACION") {
    const { headers } = await import("next/headers");
    const hdrs = await headers();
    const pathname = hdrs.get("x-pathname") ?? "";
    const restricted = FACTURACION_RESTRICTED.some((p) => pathname.startsWith(p));
    if (restricted) redirect("/");
  }

  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Usuario";

  return (
    <AppShell
      role={role}
      userName={userName}
      userEmail={user.email ?? ""}
      userAvatar={user.user_metadata?.avatar_url as string | undefined}
    >
      {children}
    </AppShell>
  );
}
