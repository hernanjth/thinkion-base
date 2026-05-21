import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// RFC 7591 — Dynamic Client Registration
// Claude.ai self-registers before starting the OAuth flow.

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const redirect_uris = (body.redirect_uris as string[] | undefined) ?? [];
  const grant_types   = (body.grant_types   as string[] | undefined) ?? ["authorization_code"];
  const client_name   = (body.client_name   as string  | undefined) ?? "Unknown Client";
  const scopes_str    = (body.scope         as string  | undefined) ?? "";
  const scopes        = scopes_str ? scopes_str.split(" ").filter(Boolean) : [];

  if (redirect_uris.length === 0) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "redirect_uris is required" },
      { status: 400 }
    );
  }

  const client = await prisma.dynamicOauthClient.create({
    data: {
      client_name,
      redirect_uris,
      grant_types,
      scopes,
    },
  });

  return NextResponse.json(
    {
      client_id:              client.id,
      client_name:            client.client_name,
      redirect_uris:          client.redirect_uris,
      grant_types:            client.grant_types,
      token_endpoint_auth_method: "none",
      registration_client_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp/oauth/register/${client.id}`,
    },
    { status: 201 }
  );
}
