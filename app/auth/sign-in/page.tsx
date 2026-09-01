import Link from "next/link";
import { redirect } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { authContext } from "@/lib/auth";
export const dynamic = "force-dynamic";

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
  return (
    <main className="auth-page">
      <Link href="/shop" className="auth-brand">
        <span className="brand-mark">K</span>
        <span>KORAMA</span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow">Your Korama account</p>
        <h1>Welcome back.</h1>
        <p>
          Sign in to complete checkout, follow your orders, or access an
          assigned operations role.
        </p>
        <GoogleSignInButton next={next} />
        {params.error && (
          <p className="auth-error" role="alert">
            Sign-in could not be completed. Please try again.
          </p>
        )}
        <p className="auth-note">
          Payments run in test mode. No live charges are made.
        </p>
      </section>
    </main>
  );
}
