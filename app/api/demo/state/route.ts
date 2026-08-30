import { hydrateDemoStore } from "@/lib/demo-store";
import { requireDemoSession } from "@/lib/demo-auth";

export async function GET(request: Request) { try { requireDemoSession(request); return Response.json(await hydrateDemoStore()); } catch (error) { return error instanceof Response ? error : Response.json({ error: error instanceof Error ? error.message : "Demo session required" }, { status: 401 }); } }
