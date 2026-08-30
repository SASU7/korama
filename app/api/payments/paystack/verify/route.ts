import { hydrateDemoStore, persistDemoStore, recordDemoAudit, verifyDemoPayment } from "@/lib/demo-store";
import { apiError } from "@/lib/api";
import { unauthorizedUnlessSession } from "@/lib/demo-auth";

export async function GET(request: Request) {
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  try {
    const url = new URL(request.url);
    const reference = url.searchParams.get("reference") ?? "PSK-DEMO-KOR-NG-240829-001";
    const state = await hydrateDemoStore();
    if (!state.order) throw new Error("No pending order exists");
    let amount = state.order.totalMinor;
    let currency = state.order.currency;
    if (process.env.PAYSTACK_SECRET_KEY) {
      const upstream = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
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
