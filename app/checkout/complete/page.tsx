import { redirect } from "next/navigation";
import CheckoutResult from "@/components/CheckoutResult";
import { authContext } from "@/lib/auth";
export const dynamic = "force-dynamic";

export default async function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  if (!(await authContext())) redirect("/auth/sign-in?next=/checkout/complete");
  const params = await searchParams;
  const reference = params.reference || params.trxref;
  return (
    <main className="result-page">
      <CheckoutResult reference={reference} />
    </main>
  );
}
