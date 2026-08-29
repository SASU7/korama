import { demoStore } from "@/lib/demo-store";
import { requireDemoSession } from "@/lib/demo-auth";

export function GET(request: Request) { try { requireDemoSession(request); return Response.json(demoStore()); } catch (error) { return error instanceof Response ? error : Response.json({ error: "Demo session required" }, { status: 401 }); } }
