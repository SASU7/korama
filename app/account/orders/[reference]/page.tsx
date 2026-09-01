import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authContext } from "@/lib/auth";
import { formatMoney } from "@/lib/domain";
import { readNormalizedOrder } from "@/lib/supabase/normalized-adapter";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const auth = await authContext();
  if (!auth) redirect("/auth/sign-in?next=/account/orders");
  const { reference } = await params;
  const result = await readNormalizedOrder(reference, auth.user.id, "consumer");
  if (!result?.state.order) notFound();
  const { order, orderEvents } = result.state;
  return <main className="account-page"><header className="account-header"><Link href="/shop" className="brand-lockup"><span className="brand-mark">K</span><span>KORAMA</span></Link><Link href="/account/orders" className="text-link">All orders</Link></header>
    <section className="account-content"><p className="eyebrow">Order {order.reference}</p><div className="account-title-row"><h1>{order.status.replaceAll("_", " ")}</h1><strong>{formatMoney(order.totalMinor, order.currency)}</strong></div>
      <div className="account-order-grid"><div className="panel"><h2>Delivery</h2><p>{order.address ? `${order.address.recipientName} · ${order.address.addressLine}, ${order.address.city}` : "Delivery address pending"}</p></div><div className="panel"><h2>Progress</h2>{orderEvents.map(event => <div key={event.status} className={event.complete ? "account-event complete" : "account-event"}><span /><div><strong>{event.label}</strong><small>{event.detail}</small></div></div>)}</div></div>
    </section>
  </main>;
}
