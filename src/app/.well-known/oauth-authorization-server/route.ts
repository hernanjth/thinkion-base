import { NextResponse } from "next/server";

// RFC 8414 — OAuth Authorization Server Metadata
// Claude.ai fetches this to discover the authorization / token endpoints.

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET() {
  return NextResponse.json({
    issuer:                                BASE_URL,
    authorization_endpoint:               `${BASE_URL}/api/mcp/oauth/authorize`,
    token_endpoint:                        `${BASE_URL}/api/mcp/oauth/token`,
    registration_endpoint:                 `${BASE_URL}/api/mcp/oauth/register`,
    response_types_supported:             ["code"],
    grant_types_supported:                ["authorization_code", "refresh_token"],
    code_challenge_methods_supported:     ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [
      "data:read",
      "data:write",
      "admin:read",
      "admin:write",
    ],
  });
}
