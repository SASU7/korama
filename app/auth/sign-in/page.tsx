import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { Wordmark } from "@/components/shared/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in — Korama" };

const RETURNING_TO: Record<string, string> = {
  "/operations": "Operations",
  "/compliance": "Compliance",
  "/delivery": "Delivery",
  "/cart": "your cart",
  "/checkout": "checkout",
  "/account/orders": "your orders",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/shop";
  if (await authContext()) redirect(next);

  const destination = RETURNING_TO[next];
  console.log("Auth Error =>", params.error)

  return (
    <main className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Wordmark />
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-(length:--text-meta)">
            Use your Google account to check out, track orders, and open any
            operations role assigned to you.
          </p>
          <GoogleSignInButton next={next} />
          {destination && (
            <p className="text-muted-foreground text-(length:--text-meta)">
              You&rsquo;ll return to {destination} after signing in.
            </p>
          )}
          {params.error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                Sign-in could not be completed. Please try again.
              </AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>
    </main>
  );
}
