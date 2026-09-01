"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CheckoutResult({ reference }: { reference?: string }) {
  const [status, setStatus] = useState<"checking" | "confirmed" | "pending">(reference ? "checking" : "pending");
  useEffect(() => {
    if (!reference) return;
    fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`, { cache: "no-store" })
      .then((response) => setStatus(response.ok ? "confirmed" : "pending"))
      .catch(() => setStatus("pending"));
  }, [reference]);
  return <section className="result-card">
    <p className="eyebrow">Payment status</p>
    <h1>{status === "checking" ? "Confirming your payment…" : status === "confirmed" ? "Payment confirmed." : "Payment is still processing."}</h1>
    <p>{status === "checking" ? "This normally takes a few seconds." : status === "confirmed" ? "Your order has been created and is ready for fulfilment." : "Paystack has not confirmed this transaction yet. The webhook will safely reconcile it when confirmation arrives."}</p>
    <div className="result-actions"><Link className="primary-button" href="/shop">View order</Link><Link className="text-link" href="/shop">Return to shop</Link></div>
  </section>;
}
