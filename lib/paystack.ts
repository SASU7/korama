import "server-only";

export function paystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret?.startsWith("sk_test_")) {
    throw new Error("PAYSTACK_SECRET_KEY must be a Paystack test key");
  }
  return secret;
}
