import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaymentVerification } from "@/components/shop/payment-verification";
import { requireConsumer } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Payment — Korama" };

export default async function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  await requireConsumer("/account/orders");
  const params = await searchParams;
  // Paystack sends `trxref`, and `reference` on some callbacks.
  const reference = params.reference ?? params.trxref;
  if (!reference) redirect("/account/orders");
  return <PaymentVerification reference={reference} />;
}
