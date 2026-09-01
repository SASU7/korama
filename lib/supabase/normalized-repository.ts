import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { OrderStatus } from "../domain";

type Client = SupabaseClient<Database>;
type TableName = keyof Database["public"]["Tables"];
export type Row<Name extends TableName> = Database["public"]["Tables"][Name]["Row"];
type SupabaseError = { code?: string | null; hint?: string | null; message: string };
export type NormalizedMutationResult = Database["public"]["Functions"]["korama_create_order"]["Returns"];

export type NormalizedCreateOrderInput = {
  profileId: string;
  reference: string;
  operatingCompanyId: string;
  marketId: string;
  productId: string;
  quantity: number;
  currency: string;
  subtotalMinor: number;
  taxMinor: number;
  deliveryMinor: number;
  totalMinor: number;
  deliveryAddress: {
    recipientName: string;
    addressLine: string;
    city: string;
    countryCode: "NG";
  };
};

export type NormalizedCatalogueItem = {
  listing: Row<"market_listings">;
  market: Row<"markets">;
  product: Row<"products">;
  price: Row<"market_prices"> | null;
  variant: Row<"variants"> | null;
  media: Row<"media">[];
};

export type NormalizedOperationalSnapshot = {
  operatingCompanyId: string;
  batches: Row<"inventory_batches">[];
  balances: Row<"inventory_balances">[];
  movements: Row<"inventory_movements">[];
  transfers: Row<"transfers">[];
  tasks: Row<"warehouse_tasks">[];
  originRecords: Row<"origin_records">[];
  transformations: Row<"transformation_records">[];
  originEvidence: Row<"origin_evidence">[];
  originAssessments: Row<"origin_assessments">[];
  dutyQuotes: Row<"duty_quotes">[];
  certificatePreviews: Row<"certificate_previews">[];
  shipments: Row<"shipments">[];
  deliveryLegs: Row<"delivery_legs">[];
  drones: Row<"drones">[];
  authorizations: Row<"authorizations">[];
  weatherSnapshots: Row<"weather_snapshots">[];
  geofences: Row<"geofences">[];
  sorties: Row<"sorties">[];
  sortieEvents: Row<"sortie_events">[];
};

export type NormalizedOrderView = {
  order: Row<"orders">;
  lines: Row<"order_lines">[];
  events: Row<"order_events">[];
  paymentAttempts: Row<"payment_attempts">[];
  tasks: Row<"warehouse_tasks">[];
  shipment: Row<"shipments"> | null;
  deliveryLegs: Row<"delivery_legs">[];
  sortie: Row<"sorties"> | null;
  sortieEvents: Row<"sortie_events">[];
};

async function checked<T>(operation: string, request: PromiseLike<{ data: T; error: SupabaseError | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) {
    const suffix = error.hint ? " Hint: " + error.hint : "";
    throw new Error("Supabase " + operation + " failed [" + (error.code ?? "unknown") + "]: " + error.message + "." + suffix);
  }
  return data;
}

async function checkedMany<T>(operation: string, request: PromiseLike<{ data: T[] | null; error: SupabaseError | null }>): Promise<T[]> {
  return (await checked(operation, request)) ?? [];
}

async function checkedRpc<T>(operation: string, request: PromiseLike<{ data: T | null; error: SupabaseError | null }>): Promise<T> {
  const data = await checked(operation, request);
  if (data === null) throw new Error("Supabase " + operation + " returned no result");
  return data;
}

function indexBy<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function createNormalizedRepository(client: Client) {
  return {
    async listCatalogue(marketCode: string): Promise<NormalizedCatalogueItem[]> {
      const market = await checked("market lookup", client.from("markets").select("*").eq("code", marketCode).maybeSingle());
      if (!market) throw new Error("Market " + marketCode + " was not found");

      const listings = await checkedMany("catalogue listings read", client.from("market_listings").select("*").eq("market_id", market.id).order("product_id"));
      const productIds = unique(listings.map((listing) => listing.product_id));
      if (!productIds.length) return [];

      const [products, prices, variants, media] = await Promise.all([
        checkedMany("catalogue products read", client.from("products").select("*").in("id", productIds)),
        checkedMany("market prices read", client.from("market_prices").select("*").eq("market_id", market.id).in("product_id", productIds)),
        checkedMany("catalogue variants read", client.from("variants").select("*").in("product_id", productIds).order("created_at")),
        checkedMany("catalogue media read", client.from("media").select("*").in("product_id", productIds).order("sort_order")),
      ]);
      const productsById = indexBy(products);
      const priceByProductId = new Map(prices.map((price) => [price.product_id, price]));
      const variantByProductId = new Map<string, Row<"variants">>();
      for (const variant of variants) if (!variantByProductId.has(variant.product_id)) variantByProductId.set(variant.product_id, variant);
      const mediaByProductId = new Map<string, Row<"media">[]>();
      for (const item of media) mediaByProductId.set(item.product_id, [...(mediaByProductId.get(item.product_id) ?? []), item]);

      return listings.map((listing) => {
        const product = productsById.get(listing.product_id);
        if (!product) throw new Error("Catalogue listing " + listing.id + " references a missing product");
        return {
          listing,
          market,
          product,
          price: priceByProductId.get(listing.product_id) ?? null,
          variant: variantByProductId.get(listing.product_id) ?? null,
          media: mediaByProductId.get(listing.product_id) ?? [],
        };
      });
    },

    async getOperationalSnapshot(operatingCompanyId: string): Promise<NormalizedOperationalSnapshot> {
      const [batches, balances, movements, transfers, tasks, originRecords, transformations, originEvidence, originAssessments, dutyQuotes, certificatePreviews, shipments, deliveryLegs, drones, authorizations, geofences, sorties, sortieEvents] = await Promise.all([
        checkedMany("inventory batches read", client.from("inventory_batches").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("inventory balances read", client.from("inventory_balances").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("inventory movements read", client.from("inventory_movements").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("transfers read", client.from("transfers").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("warehouse tasks read", client.from("warehouse_tasks").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("origin records read", client.from("origin_records").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("transformation records read", client.from("transformation_records").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("origin evidence read", client.from("origin_evidence").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("origin assessments read", client.from("origin_assessments").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("duty quotes read", client.from("duty_quotes").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("certificate previews read", client.from("certificate_previews").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("shipments read", client.from("shipments").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("delivery legs read", client.from("delivery_legs").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("drones read", client.from("drones").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("authorizations read", client.from("authorizations").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("geofences read", client.from("geofences").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("sorties read", client.from("sorties").select("*").eq("operating_company_id", operatingCompanyId)),
        checkedMany("sortie events read", client.from("sortie_events").select("*").eq("operating_company_id", operatingCompanyId)),
      ]);
      const sortieIds = sorties.map((sortie) => sortie.id);
      const weatherSnapshots = sortieIds.length
        ? await checkedMany("weather snapshots read", client.from("weather_snapshots").select("*").in("sortie_id", sortieIds))
        : [];
      return { operatingCompanyId, batches, balances, movements, transfers, tasks, originRecords, transformations, originEvidence, originAssessments, dutyQuotes, certificatePreviews, shipments, deliveryLegs, drones, authorizations, weatherSnapshots, geofences, sorties, sortieEvents };
    },

    async getOrderView(reference: string, profileId?: string, operatingCompanyId?: string): Promise<NormalizedOrderView | null> {
      let query = client.from("orders").select("*").eq("reference", reference);
      if (profileId) query = query.eq("profile_id", profileId);
      if (operatingCompanyId) query = query.eq("operating_company_id", operatingCompanyId);
      const order = await checked("order lookup", query.maybeSingle());
      if (!order) return null;

      const [lines, events, paymentAttempts, tasks, shipment] = await Promise.all([
        checkedMany("order lines read", client.from("order_lines").select("*").eq("order_id", order.id).order("id")),
        checkedMany("order events read", client.from("order_events").select("*").eq("order_id", order.id).order("created_at")),
        checkedMany("payment attempts read", client.from("payment_attempts").select("*").eq("order_id", order.id).order("created_at")),
        checkedMany("order tasks read", client.from("warehouse_tasks").select("*").eq("order_id", order.id).order("created_at")),
        checked("shipment lookup", client.from("shipments").select("*").eq("order_id", order.id).maybeSingle()),
      ]);
      const deliveryLegs = shipment ? await checkedMany("delivery legs read", client.from("delivery_legs").select("*").eq("shipment_id", shipment.id).order("sequence_no")) : [];
      const sortie = shipment ? await checked("sortie lookup", client.from("sorties").select("*").eq("shipment_id", shipment.id).maybeSingle()) : null;
      const sortieEvents = sortie ? await checkedMany("sortie events read", client.from("sortie_events").select("*").eq("sortie_id", sortie.id).order("created_at")) : [];
      return { order, lines, events, paymentAttempts, tasks, shipment, deliveryLegs, sortie, sortieEvents };
    },

    async getLatestOrderView(operatingCompanyId: string, profileId?: string): Promise<NormalizedOrderView | null> {
      let query = client.from("orders").select("reference").eq("operating_company_id", operatingCompanyId).order("created_at", { ascending: false }).limit(1);
      if (profileId) query = query.eq("profile_id", profileId);
      const latest = await checked("latest order lookup", query.maybeSingle());
      return latest ? this.getOrderView(latest.reference, profileId, operatingCompanyId) : null;
    },

    async createOrder(input: NormalizedCreateOrderInput): Promise<NormalizedMutationResult> {
      return checkedRpc("normalized order creation", client.rpc("korama_create_order", {
        p_profile_id: input.profileId,
        p_reference: input.reference,
        p_operating_company_id: input.operatingCompanyId,
        p_market_id: input.marketId,
        p_product_id: input.productId,
        p_quantity: input.quantity,
        p_currency: input.currency,
        p_subtotal_minor: input.subtotalMinor,
        p_tax_minor: input.taxMinor,
        p_delivery_minor: input.deliveryMinor,
        p_total_minor: input.totalMinor,
        p_delivery_address: input.deliveryAddress,
      }));
    },

    async verifyPayment(orderId: string, providerReference: string, amountMinor: number, currency: string, idempotencyKey: string): Promise<NormalizedMutationResult> {
      return checkedRpc("normalized payment verification", client.rpc("korama_verify_payment", {
        p_order_id: orderId,
        p_provider_reference: providerReference,
        p_amount_minor: amountMinor,
        p_currency: currency,
        p_idempotency_key: idempotencyKey,
      }));
    },

    async allocateOrderFefo(orderReference: string): Promise<NormalizedMutationResult> {
      return checkedRpc("normalized FEFO allocation", client.rpc("korama_allocate_order_fefo", { p_order_reference: orderReference }));
    },

    async advanceOrder(orderReference: string, nextStatus: Extract<OrderStatus, "picked" | "packed" | "dispatched">, weightGrams?: number): Promise<NormalizedMutationResult> {
      return checkedRpc("normalized order transition", client.rpc("korama_advance_order", { p_order_reference: orderReference, p_next_status: nextStatus, p_weight_grams: weightGrams }));
    },

    async commandSortie(orderReference: string, command: string): Promise<NormalizedMutationResult> {
      return checkedRpc("normalized sortie transition", client.rpc("korama_command_sortie", { p_order_reference: orderReference, p_command: command }));
    },

  };
}
