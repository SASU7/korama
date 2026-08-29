import { resetDemoStore } from "@/lib/demo-store";
import { configuredAccessCode, hasValidSession, sessionCookie } from "@/lib/demo-auth";

export async function POST(request: Request) {
  const code = request.headers.get("x-korama-demo-code");
  if (!hasValidSession(request) && code?.toUpperCase() !== configuredAccessCode().toUpperCase()) return Response.json({ error: "Demo reset requires an authenticated session" }, { status: 403 });
  return Response.json(resetDemoStore(), { headers: { "set-cookie": sessionCookie() } });
}
