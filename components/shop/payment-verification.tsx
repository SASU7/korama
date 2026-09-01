"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/shared/spinner";
import { Identifier } from "@/components/shared/identifier";
import { clearCartAction } from "@/app/(shop)/actions";

type State = "checking" | "confirmed" | "pending";

const RETRY_MS = 3000;
const MAX_ATTEMPTS = 5;

/**
 * Confirms a Paystack test payment.
 *
 * The previous version fired exactly one request and gave up, and both of its
 * links — including the one labelled "View order" — pointed at /shop. It now
 * retries while Paystack settles and links to the real order.
 */
export function PaymentVerification({ reference, fulfilmentSiteName }: { reference: string; fulfilmentSiteName: string }) {
  const [state, setState] = useState<State>("checking");
  const [orderReference, setOrderReference] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const verify = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return false;
      const body = (await response.json()) as {
        verified?: boolean;
        order?: { reference?: string };
      };
      if (!body.verified) return false;
      setOrderReference(body.order?.reference ?? reference.replace(/^KOR-/, ""));
      setState("confirmed");
      // The order exists now; the cart has served its purpose.
      void clearCartAction();
      return true;
    } catch {
      return false;
    }
  }, [reference]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (await verify()) return;
      if (cancelled) return;
      if (attempt + 1 >= MAX_ATTEMPTS) {
        setState("pending");
        return;
      }
      const timer = window.setTimeout(() => {
        if (!cancelled) setAttempt((value) => value + 1);
      }, RETRY_MS);
      return () => window.clearTimeout(timer);
    })();
    return () => {
      cancelled = true;
    };
  }, [verify, attempt]);

  const target = orderReference ?? reference.replace(/^KOR-/, "");

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardHeader className="items-center text-center">
          {state === "checking" && <Spinner />}
          {state === "confirmed" && (
            <CircleCheck className="text-success size-7" aria-hidden />
          )}
          {state === "pending" && (
            <Clock className="text-muted-foreground size-7" aria-hidden />
          )}
          <CardTitle>
            {state === "checking" && "Confirming your payment…"}
            {state === "confirmed" && "Payment confirmed"}
            {state === "pending" && "Payment is still processing"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground text-(length:--text-meta)" role="status">
            {state === "checking" &&
              "This usually takes a few seconds."}
            {state === "confirmed" && (
              <>
                Order <Identifier value={target} /> is with the {fulfilmentSiteName}.
              </>
            )}
            {state === "pending" &&
              "Paystack hasn’t confirmed yet. The webhook reconciles it automatically — your order will appear once it does."}
          </p>

          {state === "confirmed" && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href={`/account/orders/${target}`}>Track order</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/shop">Continue shopping</Link>
              </Button>
            </div>
          )}
          {state === "pending" && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  setState("checking");
                  setAttempt(0);
                }}
              >
                Check again
              </Button>
              <Button variant="outline" asChild>
                <Link href="/account/orders">View your orders</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
