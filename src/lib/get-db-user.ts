import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserWithPermissions } from "@/lib/permissions";

/**
 * Cached DB lookup for user + permissions by email.
 * Caches across requests for 5 minutes with tag "user-permissions".
 * Call revalidateTag("user-permissions") after any role or permission change.
 */
const getCachedUserByEmail = unstable_cache(
  async (email: string): Promise<UserWithPermissions | null> => {
    return prisma.user.findUnique({
      where: { email },
      include: { permissions: true },
    });
  },
  ["user-permissions"],
  { revalidate: 300, tags: ["user-permissions"] },
);

/**
 * Returns the authenticated user (with permissions) from our DB.
 * Two-layer caching:
 *  1. React.cache() — deduplicates within a single request (zero extra DB calls
 *     when multiple server components / actions call this in the same request)
 *  2. unstable_cache — caches the DB row across requests for 5 minutes
 *
 * Users MUST exist in our DB (created via invitation flow).
 * If a Supabase session exists but no DB record is found, the orphaned
 * session is signed out and the user is redirected to /unauthorized.
 * Redirects to /login if not authenticated at all.
 */
export const getDbUser = cache(async (): Promise<UserWithPermissions> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) redirect("/login");

  const existing = await getCachedUserByEmail(user.email);
  if (existing) return existing;

  // No DB record — invitation-only system. Sign out the orphaned Supabase
  // session so the user can't retry from an authenticated state.
  await supabase.auth.signOut();
  redirect("/unauthorized");
});
