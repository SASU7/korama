import { markOrder, OrderStatus } from "@/lib/domain";
import { demoStore } from "@/lib/demo-store";
import { apiError, jsonBody } from "@/lib/api";
import { unauthorizedUnlessRole } from "@/lib/demo-auth";

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const unauthorized = unauthorizedUnlessRole(request, ["warehouse_operator"]); if (unauthorized) return unauthorized;
  try {
    const { reference } = await params;
    const body = await jsonBody(request);
    const state = demoStore();
    if (!state.order || state.order.reference !== reference) throw new Error("Order not found");
    const next = String(body.status) as OrderStatus;
    markOrder(state, next);
    const taskIndex = { picked: 2, packed: 3, dispatched: 4 }[next as "picked" | "packed" | "dispatched"];
    if (taskIndex !== undefined) state.tasks[taskIndex].done = true;
    return Response.json({ order: state.order, events: state.orderEvents, tasks: state.tasks });
  } catch (error) { return apiError(error); }
}
