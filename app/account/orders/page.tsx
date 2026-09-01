import Link from "next/link";
import { redirect } from "next/navigation";
import { authContext } from "@/lib/auth";
import { formatMoney } from "@/lib/domain";
import { readNormalizedState } from "@/lib/supabase/normalized-adapter";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const auth = await authContext();
  if (!auth) redirect("/auth/sign-in?next=/account/orders");
  const state = await readNormalizedState(auth.user.id, "consumer");
  return <main className="account-page">
    <header className="account-header"><Link href="/shop" className="brand-lockup"><span className="brand-mark">K</span><span>KORAMA</span></Link><Link href="/shop" className="text-link">Continue shopping</Link></header>
    <section className="account-content"><p className="eyebrow">Your account</p><h1>Orders</h1>
      {!state.order ? <div className="account-empty"><h2>No orders yet</h2><p>Products you check out with Paystack will appear here.</p><Link className="primary-button" href="/shop">Browse products</Link></div> : <Link className="order-list-item" href={`/account/orders/${state.order.reference}`}><span><strong>{state.order.reference}</strong><small>{state.order.status.replaceAll("_", " ")}</small></span><strong>{formatMoney(state.order.totalMinor, state.order.currency)}</strong></Link>}
    </section>
  </main>;
}
