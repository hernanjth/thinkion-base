import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cookie flag set when a user is confirmed to exist in our DB.
const VERIFIED_COOKIE = "thinkion-verified";
const VERIFIED_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Cookie set by /api/mcp/oauth/authorize when the user needs to log in first.
// After successful login we redirect back to the authorize URL.
const MCP_OAUTH_PENDING_COOKIE = "mcp_oauth_pending";

// TODO: Update this to your actual Google Workspace domain
const ALLOWED_DOMAIN = "thinkion.com.ar";

// TODO: Update this to your app's home route after login
const HOME_ROUTE = "/dashboard";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteToken = searchParams.get("invite_token") ?? null;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const email = data.user.email ?? "";

  // Domain restriction — only allow configured Workspace domain
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=unauthorized_domain`);
  }

  // ── Check if user already exists in our DB ────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existing) {
    // Re-login of an existing user — check if we were in the middle of an OAuth flow
    const pendingOAuth = cookieStore.get(MCP_OAUTH_PENDING_COOKIE)?.value;
    if (pendingOAuth) {
      try {
        const params = JSON.parse(pendingOAuth) as Record<string, string>;
        const authorizeUrl = new URL(`${origin}/api/mcp/oauth/authorize`);
        Object.entries(params).forEach(([k, v]) => {
          if (v) authorizeUrl.searchParams.set(k, v);
        });
        const res = NextResponse.redirect(authorizeUrl.toString());
        res.cookies.set(VERIFIED_COOKIE, "1", VERIFIED_COOKIE_OPTS);
        res.cookies.set(MCP_OAUTH_PENDING_COOKIE, "", { maxAge: 0, path: "/" });
        return res;
      } catch {
        // Invalid/corrupt cookie — fall through to normal redirect
      }
    }
    const res = NextResponse.redirect(`${origin}${HOME_ROUTE}`);
    res.cookies.set(VERIFIED_COOKIE, "1", VERIFIED_COOKIE_OPTS);
    return res;
  }

  // ── New user — requires a valid invitation ────────────────────────────────
  if (!inviteToken) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/unauthorized`);
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { token: inviteToken },
  });

  if (
    !invitation ||
    invitation.used_at !== null ||
    invitation.expires_at < new Date()
  ) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/unauthorized`);
  }

  // Email must match exactly
  if (invitation.email.toLowerCase() !== email.toLowerCase()) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/invite/${inviteToken}?error=email_mismatch`
    );
  }

  // ── Create user + consume invitation atomically ───────────────────────────
  const name =
    (data.user.user_metadata?.full_name as string | undefined) ??
    email.split("@")[0];

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: data.user.id,
        email,
        name,
        role: invitation.role,
      },
    }),
    prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { used_at: new Date() },
    }),
  ]);

  // Check if we were in the middle of an OAuth flow (new user accepting invite)
  const pendingOAuth = cookieStore.get(MCP_OAUTH_PENDING_COOKIE)?.value;
  if (pendingOAuth) {
    try {
      const params = JSON.parse(pendingOAuth) as Record<string, string>;
      const authorizeUrl = new URL(`${origin}/api/mcp/oauth/authorize`);
      Object.entries(params).forEach(([k, v]) => {
        if (v) authorizeUrl.searchParams.set(k, v);
      });
      const res = NextResponse.redirect(authorizeUrl.toString());
      res.cookies.set(VERIFIED_COOKIE, "1", VERIFIED_COOKIE_OPTS);
      res.cookies.set(MCP_OAUTH_PENDING_COOKIE, "", { maxAge: 0, path: "/" });
      return res;
    } catch {
      // Invalid/corrupt cookie — fall through to normal redirect
    }
  }

  const res = NextResponse.redirect(`${origin}${HOME_ROUTE}`);
  res.cookies.set(VERIFIED_COOKIE, "1", VERIFIED_COOKIE_OPTS);
  return res;
}
