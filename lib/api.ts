export async function jsonBody(request: Request) {
  try { return await request.json() as Record<string, unknown>; } catch { throw new Error("Request body must be valid JSON"); }
}
export function apiError(error: unknown) { return Response.json({ error: error instanceof Error ? error.message : "Unexpected demo error" }, { status: 400 }); }
