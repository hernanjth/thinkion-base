import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sha256, generateApiToken, generateRefreshToken } from "@/lib/api-auth";

// ─── PKCE S256 verification ───────────────────────────────────────────────────

function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const digest   = crypto.createHash("sha256").update(codeVerifier).digest();
  const computed = Buffer.from(digest).toString("base64url");
  return computed === codeChallenge;
}

// ─── Token endpoint ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: Record<string, string>;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text   = await request.text();
    const params = new URLSearchParams(text);
    body = Object.fromEntries(params.entries());
  } else {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
  }

  const { grant_type } = body;

  // ── authorization_code ────────────────────────────────────────────────────
  if (grant_type === "authorization_code") {
    const { code, redirect_uri, client_id, code_verifier } = body;

    if (!code || !redirect_uri || !client_id) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing required parameters" },
        { status: 400 }
      );
    }

    const oauthCode = await prisma.oauthCode.findUnique({ where: { code } });

    if (!oauthCode) {
      return NextResponse.json({ error: "invalid_grant", error_description: "Code not found" }, { status: 400 });
    }
    if (oauthCode.used) {
      return NextResponse.json({ error: "invalid_grant", error_description: "Code already used" }, { status: 400 });
    }
    if (oauthCode.expires_at < new Date()) {
      return NextResponse.json({ error: "invalid_grant", error_description: "Code expired" }, { status: 400 });
    }
    if (oauthCode.redirect_uri !== redirect_uri) {
      return NextResponse.json({ error: "invalid_grant", error_description: "redirect_uri mismatch" }, { status: 400 });
    }
    if (oauthCode.client_id !== client_id) {
      return NextResponse.json({ error: "invalid_grant", error_description: "client_id mismatch" }, { status: 400 });
    }

    // PKCE S256 validation
    if (oauthCode.code_challenge) {
      if (!code_verifier) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "code_verifier required" },
          { status: 400 }
        );
      }
      if (!verifyPkce(code_verifier, oauthCode.code_challenge)) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: "PKCE verification failed" },
          { status: 400 }
        );
      }
    }

    // Mark code as used
    await prisma.oauthCode.update({ where: { code }, data: { used: true } });

    // Issue short-lived access token (1 hour) + refresh token (30 days)
    const { raw: accessRaw, hash: accessHash, prefix: accessPrefix } = await generateApiToken();
    const { raw: refreshRaw, hash: refreshHash, prefix: refreshPrefix } = await generateRefreshToken();

    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Thinkion App";
    const clientRecord = oauthCode.client_id
      ? await prisma.dynamicOauthClient.findUnique({ where: { id: oauthCode.client_id } })
      : null;

    await prisma.apiToken.create({
      data: {
        name:                  `MCP OAuth — ${clientRecord?.client_name ?? "claude.ai"}`,
        key_hash:              accessHash,
        key_prefix:            accessPrefix,
        scopes:                oauthCode.scopes,
        created_by:            oauthCode.user_id!,
        expires_at:            new Date(Date.now() + 60 * 60 * 1000),         // 1h
        refresh_token_hash:    refreshHash,
        refresh_token_prefix:  refreshPrefix,
      },
    });

    return NextResponse.json({
      access_token:  accessRaw,
      token_type:    "Bearer",
      expires_in:    3600,
      refresh_token: refreshRaw,
      scope:         oauthCode.scopes.join(" "),
    });
  }

  // ── refresh_token ─────────────────────────────────────────────────────────
  if (grant_type === "refresh_token") {
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing refresh_token" },
        { status: 400 }
      );
    }

    const refreshHash = await sha256(refresh_token);
    const existing    = await prisma.apiToken.findUnique({
      where: { refresh_token_hash: refreshHash },
    });

    if (!existing) {
      return NextResponse.json({ error: "invalid_grant", error_description: "Refresh token not found" }, { status: 400 });
    }
    if (existing.revoked_at) {
      return NextResponse.json({ error: "invalid_grant", error_description: "Token revoked" }, { status: 400 });
    }

    // Rotate: revoke old, issue new access + refresh pair
    const { raw: newAccessRaw, hash: newAccessHash, prefix: newAccessPrefix } = await generateApiToken();
    const { raw: newRefreshRaw, hash: newRefreshHash, prefix: newRefreshPrefix } = await generateRefreshToken();

    await prisma.$transaction([
      prisma.apiToken.update({
        where: { id: existing.id },
        data:  { revoked_at: new Date() },
      }),
      prisma.apiToken.create({
        data: {
          name:                 existing.name,
          key_hash:             newAccessHash,
          key_prefix:           newAccessPrefix,
          scopes:               existing.scopes,
          created_by:           existing.created_by,
          expires_at:           new Date(Date.now() + 60 * 60 * 1000),
          refresh_token_hash:   newRefreshHash,
          refresh_token_prefix: newRefreshPrefix,
        },
      }),
    ]);

    return NextResponse.json({
      access_token:  newAccessRaw,
      token_type:    "Bearer",
      expires_in:    3600,
      refresh_token: newRefreshRaw,
      scope:         existing.scopes.join(" "),
    });
  }

  return NextResponse.json(
    { error: "unsupported_grant_type" },
    { status: 400 }
  );
}
