"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// TODO: Update ALLOWED_DOMAIN to match your Google Workspace domain
const ALLOWED_DOMAIN = "thinkion.com.ar";

export async function signInWithInvite(token: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?invite_token=${encodeURIComponent(token)}`,
      queryParams: {
        hd: ALLOWED_DOMAIN,
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    redirect(`/invite/${token}?error=auth_failed`);
  }

  redirect(data.url);
}
