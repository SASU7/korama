import { allocateFefo } from "@/lib/domain";
import { demoStore } from "@/lib/demo-store";
import { apiError } from "@/lib/api";
import { unauthorizedUnlessRole } from "@/lib/demo-auth";

export async function POST(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const unauthorized = unauthorizedUnlessRole(_request, ["warehouse_operator"]); if (unauthorized) return unauthorized;
  try {
    const { reference } = await params;
    const state = demoStore();
    if (!state.order || state.order.reference !== reference) throw new Error("Order not found in operator scope");
    const batch = allocateFefo(state);
    return Response.json({ order: state.order, batch, task: state.tasks[1] });
  } catch (error) { return apiError(error, _request); }
}
