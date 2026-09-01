import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { MarketsTable } from "@/components/shop/markets-table";
import { readMarkets } from "@/lib/supabase/domain-markets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Markets — Korama",
  description:
    "Currency, language, launch phase and checkout availability for every Korama market.",
};

export default async function MarketsPage() {
  const markets = await readMarkets();
  const transacting = markets.filter((m) => m.checkoutEnabled);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Markets" }]}
        title="Markets"
        meta={`${markets.length} configured · ${transacting.length} accepting checkout`}
      />
      <MarketsTable markets={markets} />
      <p className="text-muted-foreground mt-4 max-w-[70ch] text-(length:--text-meta)">
        Each market carries its own currency, tax and duty treatment,
        localization, port of entry and launch review.{" "}
        {transacting.length > 0
          ? `Checkout is enabled in ${transacting.map((m) => m.name).join(" and ")}.`
          : "No market currently accepts checkout."}{" "}
        Every other market is catalogue-only.
      </p>
    </>
  );
}
