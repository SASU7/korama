import { authenticatedRole, hasValidSession } from "@/lib/demo-auth";

export async function GET(request: Request) { const authenticated = hasValidSession(request); return Response.json({ authenticated, role: authenticated ? await authenticatedRole(request) : null }); }
