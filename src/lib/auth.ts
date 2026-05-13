/**
 * Auth re-exports.
 *
 * Convenience barrel file — import auth helpers from here
 * instead of from the specific files.
 *
 * Usage:
 *   import { getDbUser } from "@/lib/auth";
 */

export { getDbUser } from "./get-db-user";
export { createClient as createSupabaseServerClient } from "./supabase/server";
export { createClient as createSupabaseBrowserClient } from "./supabase/client";
