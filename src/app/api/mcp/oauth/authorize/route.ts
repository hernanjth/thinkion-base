import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scopesForRole } from "@/lib/api-auth";

const MCP_OAUTH_PENDING_COOKIE = "mcp_oauth_pending";

// ─── GET — show consent page ───────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const response_type     = searchParams.get("response_type");
  const client_id         = searchParams.get("client_id");
  const redirect_uri      = searchParams.get("redirect_uri");
  const scope             = searchParams.get("scope")             ?? "";
  const state             = searchParams.get("state")             ?? "";
  const code_challenge        = searchParams.get("code_challenge");
  const code_challenge_method = searchParams.get("code_challenge_method") ?? "S256";

  if (response_type !== "code" || !client_id || !redirect_uri) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing required parameters" },
      { status: 400 }
    );
  }

  // Validate client
  const client = await prisma.dynamicOauthClient.findUnique({ where: { id: client_id } });
  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }
  if (!client.redirect_uris.includes(redirect_uri)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "redirect_uri not registered" },
      { status: 400 }
    );
  }

  // Check session using Supabase directly (getDbUser uses redirect(), incompatible here)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()              { return cookieStore.getAll(); },
        setAll(cookiesToSet)  { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  const { data: { user: supaUser } } = await supabase.auth.getUser();

  if (!supaUser) {
    // Not logged in — save OAuth params in a cookie and redirect to login
    const pending = JSON.stringify({
      response_type, client_id, redirect_uri, scope, state,
      ...(code_challenge        ? { code_challenge }        : {}),
      ...(code_challenge_method ? { code_challenge_method } : {}),
    });
    const res = NextResponse.redirect(`${origin}/login`);
    res.cookies.set(MCP_OAUTH_PENDING_COOKIE, pending, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   600, // 10 minutes
    });
    return res;
  }

  // User is logged in — must exist in DB
  const dbUser = await prisma.user.findUnique({
    where:  { id: supaUser.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!dbUser) {
    // Supabase session exists but no DB record — reject
    return NextResponse.redirect(`${origin}/unauthorized`);
  }

  // Filter requested scopes by user's role
  const requestedScopes = scope ? scope.split(" ").filter(Boolean) : [];
  const allowedScopes   = scopesForRole(dbUser.role, requestedScopes);
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Thinkion App";

  // ── Render consent page ────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Autorizar acceso — ${appName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f3f4f6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: white; border-radius: 12px; padding: 2rem; max-width: 420px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,.1); }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: .25rem; }
    .subtitle { font-size: .875rem; color: #6b7280; margin-bottom: 1.5rem; }
    .scope-list { list-style: none; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: .5rem; }
    .scope-list li { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: .6rem .875rem; font-size: .875rem; display: flex; gap: .5rem; align-items: center; }
    .scope-list li::before { content: "✓"; color: #7c3aed; font-weight: 700; }
    .actions { display: flex; gap: .75rem; }
    .btn { flex: 1; padding: .625rem 1rem; border-radius: 8px; font-size: .875rem; font-weight: 600; cursor: pointer; border: none; }
    .btn-primary { background: #7c3aed; color: white; }
    .btn-primary:hover { background: #6d28d9; }
    .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-secondary:hover { background: #e5e7eb; }
    .user-info { font-size: .75rem; color: #9ca3af; text-align: center; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Autorizar acceso</h1>
    <p class="subtitle"><strong>${client.client_name ?? "Una aplicación"}</strong> quiere acceder a <strong>${appName}</strong> con los siguientes permisos:</p>
    <ul class="scope-list">
      ${allowedScopes.map((s) => `<li>${s}</li>`).join("\n      ")}
    </ul>
    <form method="POST">
      <input type="hidden" name="client_id"             value="${client_id}" />
      <input type="hidden" name="redirect_uri"          value="${encodeURIComponent(redirect_uri)}" />
      <input type="hidden" name="scope"                 value="${allowedScopes.join(" ")}" />
      <input type="hidden" name="state"                 value="${state}" />
      <input type="hidden" name="code_challenge"        value="${code_challenge ?? ""}" />
      <input type="hidden" name="code_challenge_method" value="${code_challenge_method}" />
      <div class="actions">
        <button class="btn btn-secondary" type="submit" name="action" value="deny">Denegar</button>
        <button class="btn btn-primary"   type="submit" name="action" value="approve">Autorizar</button>
      </div>
    </form>
    <p class="user-info">Sesión iniciada como ${dbUser.email}</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// ─── POST — user approved or denied ───────────────────────────────────────────

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const formData   = await request.formData();

  const action              = formData.get("action")              as string;
  const client_id           = formData.get("client_id")           as string;
  const redirect_uri_enc    = formData.get("redirect_uri")        as string;
  const scope               = formData.get("scope")               as string;
  const state               = formData.get("state")               as string;
  const code_challenge      = formData.get("code_challenge")      as string;
  const code_challenge_method = formData.get("code_challenge_method") as string;

  const redirect_uri = decodeURIComponent(redirect_uri_enc ?? "");

  // Re-validate client
  const client = await prisma.dynamicOauthClient.findUnique({ where: { id: client_id } });
  if (!client || !client.redirect_uris.includes(redirect_uri)) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }

  if (action === "deny") {
    const url = new URL(redirect_uri);
    url.searchParams.set("error", "access_denied");
    if (state) url.searchParams.set("state", state);
    return NextResponse.redirect(url.toString());
  }

  // Re-check session
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()             { return cookieStore.getAll(); },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );
  const { data: { user: supaUser } } = await supabase.auth.getUser();
  if (!supaUser) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const dbUser = await prisma.user.findUnique({
    where:  { id: supaUser.id },
    select: { id: true, role: true },
  });
  if (!dbUser) return NextResponse.redirect(`${origin}/unauthorized`);

  // Re-apply role gate on scopes (prevent hidden field tampering)
  const requestedScopes = scope ? scope.split(" ").filter(Boolean) : [];
  const approvedScopes  = scopesForRole(dbUser.role, requestedScopes);

  // Generate authorization code
  const code     = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.oauthCode.create({
    data: {
      code,
      redirect_uri,
      state:                state || null,
      expires_at:           expiresAt,
      code_challenge:       code_challenge || null,
      code_challenge_method: code_challenge_method || "S256",
      client_id,
      user_id:              dbUser.id,
      scopes:               approvedScopes,
    },
  });

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);

  return NextResponse.redirect(redirectUrl.toString());
}
