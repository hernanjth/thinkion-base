import { NextResponse } from "next/server";

// RFC 9728 — OAuth Protected Resource Metadata
// Included in WWW-Authenticate header so clients can discover the auth server.

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET() {
  return NextResponse.json({
    resource:               BASE_URL,
    authorization_servers: [`${BASE_URL}/.well-known/oauth-authorization-server`],
    bearer_methods_supported: ["header"],
    scopes_supported: [
      "data:read",
      "data:write",
      "admin:read",
      "admin:write",
    ],
  });
}
