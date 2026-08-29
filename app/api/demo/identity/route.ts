import { roleCookie, unauthorizedUnlessSession } from "@/lib/demo-auth";

export async function POST(request: Request) {
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as { role?: string };
    if (!["consumer", "warehouse_operator", "safety_officer"].includes(String(body.role))) return Response.json({ error: "Unsupported guided identity" }, { status: 400 });
    return Response.json({ role: body.role }, { headers: { "set-cookie": roleCookie(body.role as "consumer" | "warehouse_operator" | "safety_officer") } });
  } catch { return Response.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
}
