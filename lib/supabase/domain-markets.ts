import "server-only";

import { createNormalizedRepository } from "@/lib/supabase/normalized-repository";
import { adminClient } from "@/lib/supabase/admin-client";
import type { Market } from "@/lib/domain";

/**
 * Markets, read from the database rather than from a hardcoded array in a
 * client component. `checkoutEnabled` comes from market_configs, which the
 * schema has always carried and no code has ever read — it replaces the
 * literal string "Checkout is currently available in Nigeria."
 */
export async function readMarkets(): Promise<Market[]> {
  const repository = createNormalizedRepository(adminClient());
  const rows = await repository.listMarkets();
  return rows.map(({ market, configs }) => ({
    code: market.code,
    name: market.name,
    currency: market.currency,
    language: market.language,
    status: market.status,
    launchPhase: market.launch_phase,
    localizationRequired: market.localization_required,
    checkoutEnabled: configs.some((config) => config.checkout_enabled),
  }));
}
