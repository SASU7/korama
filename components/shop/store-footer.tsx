import Link from "next/link";
import { STORE_NAV } from "@/lib/navigation";

export function StoreFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="text-muted-foreground mx-auto flex max-w-[1240px] flex-col gap-4 px-(--gutter) py-8 text-(length:--text-meta) sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-4" aria-label="Footer">
          {STORE_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
          <Link href="/account/orders" className="hover:underline">
            Orders
          </Link>
        </nav>
        {/* One honest line, in one place, instead of "illustrative" and
            "simulated" scattered through every screen. */}
        <p>
          Prototype. Paystack runs in test mode; no live charges. Delivery is
          simulated.
        </p>
      </div>
    </footer>
  );
}
