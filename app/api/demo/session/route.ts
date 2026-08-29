import { currentRole, hasValidSession } from "@/lib/demo-auth";

export function GET(request: Request) { const authenticated = hasValidSession(request); return Response.json({ authenticated, role: authenticated ? currentRole(request) : null }); }
