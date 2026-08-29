import { configuredAccessCode, sessionCookie } from "@/lib/demo-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { code?: unknown };
    if (String(body.code ?? "").trim().toUpperCase() !== configuredAccessCode().toUpperCase()) return Response.json({ error: "That code did not match" }, { status: 401 });
    return Response.json({ authenticated: true }, { headers: { "set-cookie": sessionCookie() } });
  } catch { return Response.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
}
