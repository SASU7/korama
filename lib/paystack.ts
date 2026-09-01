import "server-only";

const TEST_KEY_PREFIX = "sk_test_";

/**
 * The prototype talks only to Paystack test mode: a live key here would take
 * real money from a demo checkout, so it is rejected rather than trusted.
 */
export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim().startsWith(TEST_KEY_PREFIX));
}

export function paystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret?.startsWith(TEST_KEY_PREFIX)) {
    throw new Error("PAYSTACK_SECRET_KEY must be a Paystack test key");
  }
  return secret;
}
