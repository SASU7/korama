import { hydrateDemoStore, persistDemoStore, recordDemoAudit, verifyDemoPayment } from "@/lib/demo-store";
import { apiError, validatedBusinessReference } from "@/lib/api";
import { authenticatedRole, authenticatedUserId, trustedRequestOrigin, unauthorizedUnlessSession } from "@/lib/demo-auth";
import { normalizedRepositoryEnabled, normalizedVerifyPayment, readNormalizedOrder } from "@/lib/supabase/normalized-adapter";

export async function GET(request: Request) {
    const originError = trustedRequestOrigin(request); if (originError) return originError;
    const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  try {
    const url = new URL(request.url);
    const reference = validatedBusinessReference(url.searchParams.get("reference"), "PSK-DEMO-KOR-NG-240829-001");
    if (normalizedRepositoryEnabled()) {
      const orderReference = reference.startsWith("PSK-DEMO-") ? reference.slice("PSK-DEMO-".length) : reference.replace(/^KOR-/, "");
      const role = await authenticatedRole(request) ?? "consumer";
      const current = await readNormalizedOrder(orderReference, await authenticatedUserId() ?? undefined, role);
      if (!current?.state.order) throw new Error("No pending order exists");
      let amount = current.state.order.totalMinor;
      let currency = current.state.order.currency;
      if (process.env.PAYSTACK_SECRET_KEY) {
        const upstream = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { redirect: "error", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
        const payload = await upstream.json() as { status?: boolean; message?: string; data?: { status?: string; amount?: number; currency?: string } };
        if (!upstream.ok || !payload.status || payload.data?.status !== "success") throw new Error(payload.message ?? "Paystack payment is not successful");
        amount = Number(payload.data.amount ?? 0);
        if (String(payload.data.currency ?? "") !== current.state.order.currency) throw new Error("Paystack currency does not match the server quote");
        currency = current.state.order.currency;
      }
      const result = await normalizedVerifyPayment(current.view.order.id, reference, amount, currency);
      const refreshed = await readNormalizedOrder(orderReference, await authenticatedUserId() ?? undefined, role);
      if (!refreshed?.state.order) throw new Error("Verified order could not be read back");
      await recordDemoAudit("payment_verified", "order", { reference: refreshed.state.order.reference, paymentReference: reference, amount, currency, adapter: "normalized" });
      return Response.json({ verified: true, idempotent: Boolean(objectValue(result, "idempotent")), order: refreshed.state.order, serverChecked: true });
    }
    const state = await hydrateDemoStore();
    if (!state.order) throw new Error("No pending order exists");
    let amount = state.order.totalMinor;
    let currency = state.order.currency;
    if (process.env.PAYSTACK_SECRET_KEY) {
      const upstream = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { redirect: "error", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
      const payload = await upstream.json() as { status?: boolean; message?: string; data?: { status?: string; amount?: number; currency?: string } };
      if (!upstream.ok || !payload.status || payload.data?.status !== "success") throw new Error(payload.message ?? "Paystack payment is not successful");
      amount = Number(payload.data.amount ?? 0);
      if (String(payload.data.currency ?? "") !== state.order.currency) throw new Error("Paystack currency does not match the server quote");
      currency = state.order.currency;
    }
    const order = verifyDemoPayment(reference, amount, currency);
    await persistDemoStore();
    await recordDemoAudit("payment_verified", "order", { reference: order.reference, paymentReference: reference, amount, currency });
    return Response.json({ verified: true, order, serverChecked: true });
  } catch (error) { return apiError(error, request); }
}

function objectValue(value: unknown, key: string) { return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : undefined; }
