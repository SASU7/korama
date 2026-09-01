"use client";

import { useState } from "react";
import { Plane, Truck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/shared/money";
import { OrderSummary } from "@/components/shop/order-summary";
import {
  DRONE_PAYLOAD_LIMIT_GRAMS,
  type CartLine,
  type DeliveryAddress,
  type Quote,
} from "@/lib/domain";

type Errors = Partial<Record<keyof DeliveryAddress, string>>;

function validate(address: DeliveryAddress): Errors {
  return {
    recipientName:
      address.recipientName.trim().length < 2 ? "Enter the recipient name" : undefined,
    addressLine:
      address.addressLine.trim().length < 5 ? "Enter a delivery address" : undefined,
    city: address.city.trim().length < 2 ? "Enter the delivery city" : undefined,
  };
}

function Field({
  id,
  label,
  value,
  error,
  autoComplete,
  onChange,
}: {
  id: keyof DeliveryAddress;
  label: string;
  value: string;
  error?: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-(length:--text-meta)">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({
  email,
  cart,
  quote,
  weightGrams,
  destinationName,
}: {
  email: string;
  cart: CartLine[];
  quote: Quote;
  weightGrams: number;
  destinationName: string;
}) {
  const [address, setAddress] = useState<DeliveryAddress>({
    recipientName: "",
    addressLine: "",
    city: "",
    countryCode: "GH",
  });
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The weight router the developer brief specifies: over the payload limit,
  // the drone option is not offered and the parcel goes by ground courier.
  const droneEligible = weightGrams <= DRONE_PAYLOAD_LIMIT_GRAMS;
  const [method, setMethod] = useState(droneEligible ? "drone" : "courier");

  const errors = validate(address);
  const valid = !errors.recipientName && !errors.addressLine && !errors.city;

  async function pay() {
    setAttempted(true);
    if (!valid) return;
    if (!navigator.onLine) {
      setError("You are offline. Reconnect before starting a test payment.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // Server-side idempotency: a double submit reuses the first order.
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ lines: cart, address, deliveryMethod: method }),
      });
      const body = (await response.json()) as {
        authorizationUrl?: string;
        error?: string;
      };
      if (!response.ok || !body.authorizationUrl)
        throw new Error(body.error ?? "Payment could not be started");
      window.location.assign(body.authorizationUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment could not be started");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-[0.9375rem]">1 · Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-(length:--text-meta)">{email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[0.9375rem]">2 · Delivery address</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field
              id="recipientName"
              label="Recipient name"
              value={address.recipientName}
              error={attempted ? errors.recipientName : undefined}
              autoComplete="name"
              onChange={(value) => setAddress({ ...address, recipientName: value })}
            />
            <Field
              id="addressLine"
              label="Address"
              value={address.addressLine}
              error={attempted ? errors.addressLine : undefined}
              autoComplete="street-address"
              onChange={(value) => setAddress({ ...address, addressLine: value })}
            />
            <Field
              id="city"
              label="City"
              value={address.city}
              error={attempted ? errors.city : undefined}
              autoComplete="address-level2"
              onChange={(value) => setAddress({ ...address, city: value })}
            />
            <p className="text-muted-foreground text-(length:--text-meta)">
              Delivery is available to Ghanaian addresses only.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[0.9375rem]">3 · Delivery method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={method} onValueChange={setMethod} className="gap-3">
              {droneEligible && (
                <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                  <RadioGroupItem value="drone" className="mt-0.5" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 font-medium">
                      <Plane className="size-4" aria-hidden />
                      Simulated drone · {destinationName}
                    </span>
                    <span className="text-muted-foreground block text-(length:--text-meta)">
                      Parcel is {weightGrams} g, within the {DRONE_PAYLOAD_LIMIT_GRAMS} g payload limit.
                    </span>
                  </span>
                </label>
              )}
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                <RadioGroupItem value="courier" className="mt-0.5" />
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    <Truck className="size-4" aria-hidden />
                    Ground courier
                  </span>
                  <span className="text-muted-foreground block text-(length:--text-meta)">
                    Always available, and the automatic fallback if a flight is
                    blocked.
                  </span>
                </span>
              </label>
            </RadioGroup>
            {!droneEligible && (
              <Alert className="mt-3">
                <Truck />
                <AlertDescription>
                  This {weightGrams} g parcel exceeds the {DRONE_PAYLOAD_LIMIT_GRAMS} g simulated payload limit, so ground courier is required.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-muted-foreground mt-3 text-(length:--text-meta)">
              Delivery is charged at{" "}
              <Money minor={quote.deliveryMinor} currency={quote.currency} /> for
              this order regardless of method.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[0.9375rem]">
              4 · Payment
              <Badge variant="outline">Test mode</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-(length:--text-meta)">
              You&rsquo;ll be taken to Paystack to complete a test payment. No
              live charge is made.
            </p>
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <OrderSummary
          quote={quote}
          action={
            <Button
              size="lg"
              className="w-full"
              onClick={pay}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? "Opening Paystack…" : "Continue to Paystack"}
            </Button>
          }
        />
      </div>
    </div>
  );
}
