import "server-only";
import { createClient } from "@supabase/supabase-js";
import { badRequest, notFound } from "@/lib/errors";
import { buildTelemetry, calculateQuote, MAX_CART_LINES, MAX_CART_QUANTITY, MAX_LINE_QUANTITY, type Batch, type BatchStatus, type CartLine, type ComplianceSnapshot, type OrderLine, type DeliveryAddress, type DemoState, type DeliveryLeg, type OrderEvent, type OrderStatus, type Product, type Shipment, type Sortie, type TransferStep, type UserRole } from "@/lib/domain";
import { createNormalizedRepository, type NormalizedCatalogueItem, type NormalizedOrderView, type NormalizedOperationalSnapshot, type Row } from "@/lib/supabase/normalized-repository";
import { adminClient } from "@/lib/supabase/admin-client";

export const NIGERIA_OPERATING_COMPANY_ID = "10000000-0000-0000-0000-000000000002";
export const NIGERIA_MARKET_ID = "20000000-0000-0000-0000-000000000002";

type JsonObject = Record<string, unknown>;
type NormalizedRepository = ReturnType<typeof createNormalizedRepository>;
type NormalizedContext = {
  repository: NormalizedRepository;
  items: NormalizedCatalogueItem[];
  operations: NormalizedOperationalSnapshot;
  ghanaOperations: NormalizedOperationalSnapshot;
  products: Product[];
};

function runtimeEnv(name: string) { return globalThis.process?.env?.[name]; }

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function stringList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

const stableProductIds: Record<string, string> = {
  "NK-SHEA-BALM": "shea-balm",
  "NK-SHEA-OIL": "shea-oil",
  "AW-KENTE-TOTE": "kente-tote",
  "AF-COCOA-GRANOLA": "cocoa-granola",
  "DI-NG-BLENDER": "direct-blender",
  "DI-NG-SCARF": "direct-scarf",
  "TB-BOLGA-BASKET": "ghana-basket",
  "VCW-COCOA-POWDER": "ghana-cocoa",
  "DI-GH-LAMP": "direct-lamp",
  "FM-ROADMAP-LISTING": "future-marketplace",
};

function productId(item: NormalizedCatalogueItem) {
  return stableProductIds[item.product.reference] ?? item.product.reference.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function complianceForProduct(productIdValue: string, context: { batches: Row<"inventory_batches">[]; assessments: Row<"origin_assessments">[]; dutyQuotes: Row<"duty_quotes">[]; certificates: Row<"certificate_previews">[]; products?: Row<"products">[] }) {
  const productBatches = context.batches.filter((batch) => batch.product_id === productIdValue);
  const batchIds = new Set(productBatches.map((batch) => batch.id));
  const assessment = context.assessments.find((candidate) => batchIds.has(candidate.batch_id) && candidate.status === "provisionally_eligible");
  if (!assessment) return undefined;
  const duty = context.dutyQuotes.find((candidate) => candidate.origin_assessment_id === assessment.id);
  const certificate = context.certificates.find((candidate) => candidate.origin_assessment_id === assessment.id);
  const product = context.products?.find((candidate) => candidate.id === productIdValue);
  const assessedBatch = productBatches.find((batch) => batch.id === assessment.batch_id);
  return {
    assessment: "provisionally_eligible",
    evidence: stringList(assessment.evidence),
    transformation: assessment.transformation_summary,
    dutyQuote: duty?.quote ?? assessment.duty_quote,
    certificateWatermark: certificate?.watermark ?? "PREVIEW — NOT A VALID CERTIFICATE",
    // Real values, so the certificate stops hardcoding one product's details.
    productName: product?.name,
    productReference: product?.reference,
    batchReference: assessedBatch?.reference,
    assessedAt: assessment.created_at,
  } satisfies ComplianceSnapshot;
}

function toProduct(item: NormalizedCatalogueItem, operations: NormalizedOperationalSnapshot, ghanaOperations: NormalizedOperationalSnapshot): Product {
  const allBatches = [...operations.batches, ...ghanaOperations.batches];
  const batches = allBatches.filter((batch) => batch.product_id === item.product.id);
  // Mirror the FEFO predicate in korama_allocate_order_fefo. Sorting by expiry
  // alone surfaced the *expired* batch on the product page — the storefront
  // named NK-SB-2401 (expired 2026-08-02) while allocation would ship
  // NK-SB-2407. A shopper must see the batch they will actually receive.
  const today = new Date().toISOString().slice(0, 10);
  const allocatable = batches.filter(
    (batch) =>
      !batch.quarantined &&
      batch.customs_cleared &&
      (batch.inventory_class !== "ghana_origin_export" || batch.origin_supported) &&
      (batch.expiry_date === null || batch.expiry_date >= today) &&
      batch.quantity - batch.allocated > 0,
  );
  const byExpiry = (list: typeof batches) =>
    [...list].sort(
      (left, right) =>
        (left.expiry_date ?? "9999-12-31").localeCompare(right.expiry_date ?? "9999-12-31") ||
        left.id.localeCompare(right.id),
    )[0];
  const firstBatch = byExpiry(allocatable) ?? byExpiry(batches);
  const metadata = object(item.product.attributes);
  const compliance = complianceForProduct(item.product.id, {
    batches: allBatches,
    assessments: [...operations.originAssessments, ...ghanaOperations.originAssessments],
    dutyQuotes: [...operations.dutyQuotes, ...ghanaOperations.dutyQuotes],
    certificates: [...operations.certificatePreviews, ...ghanaOperations.certificatePreviews],
    products: [item.product],
  });
  const available = allocatable.reduce((total, batch) => total + Math.max(0, batch.quantity - batch.allocated), 0);
  const category = ["Beauty", "Fashion", "Pantry", "Home & craft"].includes(item.product.category) ? item.product.category as Product["category"] : "Home & craft";
  const currency = (item.listing.currency === "GHS" ? "GHS" : "NGN") as Product["currency"];
  return {
    id: productId(item),
    name: item.product.name,
    category,
    producer: item.product.producer,
    origin: item.product.inventory_class,
    description: item.product.description,
    priceMinor: item.listing.price_minor,
    currency,
    weightGrams: item.product.weight_grams,
    market: item.market.code === "GH" ? "GH" : "NG",
    purchasable: item.listing.purchasable,
    stockLabel: `${item.market.code === "GH" ? "Tema" : "Lekki"} · ${available} units`,
    batch: firstBatch?.reference ?? "Not assigned",
    expiry: firstBatch?.expiry_date ?? "No expiry",
    ingredients: text(metadata.ingredients),
    transformation: text(metadata.transformation) || compliance?.transformation,
    // listCatalogue already fetches these; toProduct used to drop them, which
    // is why the catalogue had no imagery and no specification tab.
    images: item.media.map((row) => ({
      path: row.storage_path,
      alt: row.alt_text,
    })),
    variantName: item.variant?.name ?? undefined,
    sku: item.variant?.sku ?? undefined,
  };
}

async function loadContext(): Promise<NormalizedContext> {
  const client = adminClient();
  const repository = createNormalizedRepository(client);
  const [ngItems, ghItems, operations, ghanaOperations] = await Promise.all([
    repository.listCatalogue("NG"),
    repository.listCatalogue("GH"),
    repository.getOperationalSnapshot(NIGERIA_OPERATING_COMPANY_ID),
    repository.getOperationalSnapshot("10000000-0000-0000-0000-000000000001"),
  ]);
  const items = [...ngItems, ...ghItems];
  const products = [...new Map(items.map((item) => [item.product.id, toProduct(item, operations, ghanaOperations)])).values()];
  return { repository, items, operations, ghanaOperations, products };
}

function baseCompliance(context: NormalizedContext): ComplianceSnapshot {
  return complianceForProduct("30000000-0000-0000-0000-000000000001", {
    batches: [...context.operations.batches, ...context.ghanaOperations.batches],
    assessments: [...context.operations.originAssessments, ...context.ghanaOperations.originAssessments],
    dutyQuotes: [...context.operations.dutyQuotes, ...context.ghanaOperations.dutyQuotes],
    certificates: [...context.operations.certificatePreviews, ...context.ghanaOperations.certificatePreviews],
    products: context.items.map((item) => item.product),
  }) ?? {
    assessment: "provisionally_eligible",
    evidence: [],
    transformation: "Transformation evidence is awaiting normalized assessment data.",
    dutyQuote: "Illustrative: duty treatment awaiting pilot validation",
    certificateWatermark: "PREVIEW — NOT A VALID CERTIFICATE",
  };
}

const eventLabels: Record<OrderStatus, { label: string; detail: string }> = {
  pending_payment: { label: "Order created", detail: "Awaiting server-confirmed Paystack test payment" },
  paid: { label: "Payment verified", detail: "Amount and currency match the server quote" },
  allocated: { label: "Batch allocated", detail: "FEFO selected the earliest valid Lekki batch" },
  picked: { label: "Picked", detail: "Warehouse operator confirms scan" },
  packed: { label: "Packed", detail: "Weight captured for delivery routing" },
  dispatched: { label: "Dispatched", detail: "Handover to simulated last-mile delivery" },
  delivered: { label: "Delivered", detail: "Fictional micro-hub drop confirmation" },
};
const orderStatuses: OrderStatus[] = ["pending_payment", "paid", "allocated", "picked", "packed", "dispatched", "delivered"];

function toOrderEvents(events: Row<"order_events">[], status: OrderStatus): OrderEvent[] {
  const byStatus = new Map(events.map((event) => [event.status, event]));
  const statusIndex = orderStatuses.indexOf(status);
  return orderStatuses.map((eventStatus, index) => {
    const event = byStatus.get(eventStatus);
    return { status: eventStatus, label: eventLabels[eventStatus].label, detail: event?.detail ?? eventLabels[eventStatus].detail, at: event?.created_at ?? "", complete: Boolean(event) || index <= statusIndex };
  });
}

function deliveryAddress(value: unknown): DeliveryAddress | undefined {
  const address = object(value);
  const countryCode = text(address.countryCode || address.country_code).toUpperCase();
  if (!address.recipientName || !address.addressLine || !address.city || countryCode !== "NG") return undefined;
  return { recipientName: text(address.recipientName), addressLine: text(address.addressLine), city: text(address.city), countryCode: "NG" };
}

function toShipment(view: NormalizedOrderView, compliance: ComplianceSnapshot): Shipment | null {
  if (!view.shipment) return null;
  const legs: DeliveryLeg[] = view.deliveryLegs.filter((leg) => leg.mode !== "bulk_export").map((leg) => ({
    sequenceNo: leg.sequence_no,
    mode: leg.mode === "ground_courier" ? "ground_courier" : "simulated_drone",
    origin: "Lekki warehouse",
    destination: "Fictional Lekki micro-hub",
    status: ["planned", "in_transit", "complete", "fallback"].includes(leg.status) ? leg.status as DeliveryLeg["status"] : "planned",
  }));
  return { reference: view.shipment.reference, status: view.shipment.status as Shipment["status"], legs, compliance };
}

function toSortie(view: NormalizedOrderView, context: NormalizedContext): Sortie {
  const row = view.sortie;
  const drone = row ? context.operations.drones.find((candidate) => candidate.id === row.drone_id) : undefined;
  const authorization = context.operations.authorizations.find((candidate) => candidate.status === "approved");
  const geofence = context.operations.geofences.find((candidate) => candidate.status === "active");
  const weather = row?.weather_status === "unsafe" ? "unsafe" : "clear";
  const weight = view.shipment?.weight_grams ?? 180;
  const gates = [
    { key: "payload", label: "Payload", detail: `${weight}g / ${drone?.payload_limit_grams ?? 2000}g simulated limit`, passed: weight <= (drone?.payload_limit_grams ?? 2000) },
    { key: "aircraft", label: "Aircraft condition", detail: `${drone?.reference ?? "KOR-D01"} · airworthiness current`, passed: drone?.airworthiness_current ?? true },
    { key: "authorization", label: "Authorization window", detail: "Simulated Nigerian authorization on file", passed: Boolean(authorization) },
    { key: "weather", label: "Weather", detail: weather === "clear" ? "Wind and rain below the configured threshold" : "Unsafe weather injected · flight locked out", passed: weather === "clear", ...(weather === "unsafe" ? { severity: "danger" as const } : {}) },
    { key: "geofence", label: "Geofence", detail: "Route avoids restricted corridors", passed: Boolean(geofence) },
    { key: "battery", label: "Battery", detail: `${drone?.battery_percent ?? 94}% · reserve protected`, passed: (drone?.battery_percent ?? 94) >= 20 },
    { key: "override", label: "Manual override", detail: "Safety officer control available", passed: true },
  ];
  const status = row?.status;
  const allowed = ["draft", "preflight", "cleared", "launched", "en_route", "delivered", "lockout", "courier_fallback"].includes(status ?? "draft") ? status as Sortie["status"] : "draft";
  const telemetry = allowed === "launched" ? [buildTelemetry()[0]] : ["en_route", "delivered"].includes(allowed) ? buildTelemetry() : [];
  const latestEvent = view.sortieEvents.at(-1);
  return { status: allowed, weather, telemetry, gates, fallbackReason: latestEvent?.status === "courier_fallback" || allowed === "lockout" ? latestEvent?.detail ?? "Unsafe weather automatically created a ground-courier leg" : undefined };
}

function taskState(view: NormalizedOrderView | null) {
  const byType = new Map(view?.tasks.map((task) => [task.task_type, task.status === "complete"]) ?? []);
  return [
    { label: "Receive batch", detail: "NK-SB-2407 · 42 units at Lekki", done: true },
    { label: "Allocate FEFO", detail: "Choose earliest valid, non-quarantined batch", done: byType.get("allocate") ?? false },
    { label: "Pick + scan", detail: "Confirm one unit against the pick list", done: byType.get("pick") ?? false },
    { label: "Pack + weigh", detail: "Capture 180g parcel weight", done: byType.get("pack") ?? false },
    { label: "Dispatch", detail: "Hand parcel to delivery router", done: byType.get("dispatch") ?? false },
  ];
}

function transferState(context: NormalizedContext): TransferStep[] {
  const complete = context.operations.transfers.some((transfer) => transfer.status === "warehouse_received");
  // The batch reference used to be a literal here too.
  const originBatch = context.operations.batches.find(
    (batch) => batch.inventory_class === "ghana_origin_export" && batch.origin_supported,
  );
  return [
    {
      label: "Ghana production",
      detail: originBatch
        ? `Transformation record linked to ${originBatch.reference}`
        : "Transformation record on file",
      complete,
    },
    { label: "Tema staging", detail: "Received into Ghana export staging", complete },
    { label: "Bulk export", detail: "Cleared for export with provisional evidence", complete },
    { label: "Lekki receipt", detail: "Destination stock received and reconciled", complete },
  ];
}

function toState(context: NormalizedContext, view: NormalizedOrderView | null, role?: UserRole): DemoState {
  const staffView = role !== "consumer";
  const asOf = new Date().toISOString();
  const lineCompliance = view?.lines[0] ? object(view.lines[0].compliance_snapshot) : {};
  const complianceBase = Object.keys(lineCompliance).length ? lineCompliance as unknown as ComplianceSnapshot : baseCompliance(context);
  // "Tema → Lekki" was a string literal in the certificate. Derive it.
  const transferSteps = transferState(context);
  const place = (step?: TransferStep) => step?.label.split(" ")[0];
  const movement =
    transferSteps.length >= 4
      ? `${place(transferSteps[1])} → ${place(transferSteps[3])}`
      : undefined;
  const compliance: ComplianceSnapshot = { ...complianceBase, movement: complianceBase.movement ?? movement };
  const line = view?.lines[0];
  const product = line ? context.products.find((candidate) => candidate.id === productIdFromUuid(context.items, line.product_id)) : undefined;

  // Order lines, in line_no order. Ordering matters now: getOrderView used to
  // sort on a random uuid, which is invisible with one line and shuffles the
  // display on every request with three.
  const batchByUuid = new Map(context.operations.batches.map((batch) => [batch.id, batch]));
  const orderLines: OrderLine[] = [...(view?.lines ?? [])]
    .sort((left, right) => (left.line_no ?? 1) - (right.line_no ?? 1))
    .map((row, index) => {
      const slug = productIdFromUuid(context.items, row.product_id) ?? row.product_id;
      const catalogueProduct = context.products.find((candidate) => candidate.id === slug);
      const snapshot = object(row.compliance_snapshot);
      return {
        lineNo: row.line_no ?? index + 1,
        productId: slug,
        name: catalogueProduct?.name ?? text(object(row.product_snapshot).name) ?? slug,
        producer: catalogueProduct?.producer ?? row.seller_snapshot ?? "",
        origin: (row.origin_snapshot ?? "direct_import") as OrderLine["origin"],
        quantity: row.quantity,
        unitPriceMinor: row.price_minor,
        subtotalMinor: row.subtotal_minor ?? row.price_minor * row.quantity,
        taxMinor: row.tax_minor,
        deliveryMinor: row.delivery_minor ?? 0,
        batch: row.allocated_batch_id
          ? batchByUuid.get(row.allocated_batch_id)?.reference
          : undefined,
        allocatedQuantity: row.allocated_quantity ?? 0,
        compliance: Object.keys(snapshot).length
          ? (snapshot as unknown as ComplianceSnapshot)
          : undefined,
      };
    });

  const order = view ? {
    reference: view.order.reference,
    status: view.order.status as OrderStatus,
    lines: orderLines,
    subtotalMinor: view.order.subtotal_minor,
    taxMinor: view.order.tax_minor,
    deliveryMinor: view.order.delivery_minor,
    totalMinor: view.order.total_minor,
    currency: "NGN" as const,
    itemCount: orderLines.reduce((sum, l) => sum + l.quantity, 0),
    address: deliveryAddress(view.order.delivery_address_snapshot),
    compliance,
    paymentReference: view.paymentAttempts.find((attempt) => attempt.status === "paid")?.provider_reference,
    // Deprecated single-line shims, still read by the legacy workspace
    // component. Remove with it.
    productId: orderLines[0]?.productId ?? product?.id ?? "shea-balm",
    quantity: orderLines[0]?.quantity ?? line?.quantity ?? 1,
  } : null;
  const shipment = toShipment(view ?? emptyOrderView(), compliance);
  return {
    products: context.products,
    selectedProductId: context.products.some((candidate) => candidate.id === "shea-balm") ? "shea-balm" : context.products[0]?.id ?? "",
    cart: [],
    order,
    shipment,
    orderEvents: view ? toOrderEvents(view.events, view.order.status as OrderStatus) : toOrderEvents([], "pending_payment"),
    batches: staffView ? context.operations.batches.map((batch) => toBatch(batch, context, asOf)) : [],
    transfer: staffView ? transferState(context) : [],
    tasks: staffView ? taskState(view) : [],
    compliance,
    sortie: view ? toSortie(view, context) : emptySortie(),
    asOf,
    lastMutation: view?.order.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Batch eligibility, decided here rather than in the UI, and using the same
 * predicate as korama_allocate_order_fefo so the console never shows a status
 * the allocator would disagree with.
 */
function toBatch(batch: Row<"inventory_batches">, context: NormalizedContext, asOf: string): Batch {
  const today = asOf.slice(0, 10);
  const remaining = batch.quantity - batch.allocated;
  const status: BatchStatus = batch.quarantined
    ? "quarantined"
    : !batch.customs_cleared
      ? "not_cleared"
      : batch.inventory_class === "ghana_origin_export" && !batch.origin_supported
        ? "origin_unsupported"
        : batch.expiry_date !== null && batch.expiry_date < today
          ? "expired"
          : remaining <= 0
            ? "depleted"
            : batch.allocated > 0
              ? "allocated"
              : "eligible";
  return {
    id: batch.id,
    batch: batch.reference,
    productId: productIdFromUuid(context.items, batch.product_id) ?? batch.product_id,
    productName: context.products.find(
      (product) => product.id === productIdFromUuid(context.items, batch.product_id),
    )?.name,
    site: batch.operating_company_id === NIGERIA_OPERATING_COMPANY_ID ? "Lekki warehouse" : "Tema staging",
    expiry: batch.expiry_date ?? "No expiry",
    quantity: batch.quantity,
    allocated: batch.allocated,
    quarantined: batch.quarantined,
    cleared: batch.customs_cleared,
    originSupported: batch.origin_supported,
    inventoryClass: batch.inventory_class,
    status,
  };
}

function productIdFromUuid(items: NormalizedCatalogueItem[], uuid: string) { const item = items.find((candidate) => candidate.product.id === uuid); return item ? productId(item) : undefined; }
function emptySortie(): Sortie { return { status: "draft", weather: "clear", telemetry: [], gates: [] }; }
function emptyOrderView(): NormalizedOrderView { return { order: {} as Row<"orders">, lines: [], events: [], paymentAttempts: [], tasks: [], shipment: null, deliveryLegs: [], sortie: null, sortieEvents: [] }; }

export async function readNormalizedState(profileId?: string, role?: UserRole) {
  const context = await loadContext();
  const view = role === "consumer" && !profileId
    ? null
    : await context.repository.getLatestOrderView(NIGERIA_OPERATING_COMPANY_ID, role === "consumer" ? profileId : undefined);
  return toState(context, view, role);
}

export async function readNormalizedOrder(reference: string, profileId?: string, role?: UserRole) {
  if (role === "consumer" && !profileId) return null;
  const context = await loadContext();
  const view = await context.repository.getOrderView(reference, role === "consumer" ? profileId : undefined, NIGERIA_OPERATING_COMPANY_ID);
  return view ? { view, state: toState(context, view, role) } : null;
}

/**
 * Resolve catalogue slugs to purchasable Nigerian listings, with a per-line
 * message so the caller can say which item is the problem.
 */
function resolveNigerianLines(context: NormalizedContext, cart: CartLine[]) {
  return cart.map((line, index) => {
    const item = context.items.find(
      (candidate) =>
        candidate.market.code === "NG" &&
        (productId(candidate) === line.productId || candidate.product.id === line.productId),
    );
    if (!item || !item.listing.purchasable)
      throw badRequest(`Line ${index + 1}: this listing is not purchasable in Nigeria`);
    const product = context.products.find((candidate) => candidate.id === productId(item));
    if (!product) throw badRequest(`Line ${index + 1}: the product was not found`);
    return { item, product, quantity: line.quantity };
  });
}

/**
 * Server-priced quote. The arithmetic lives in lib/domain.ts so there is
 * exactly one TypeScript definition to keep in step with the SQL.
 */
export async function normalizedQuote(cart: CartLine[]) {
  const context = await loadContext();
  const resolved = resolveNigerianLines(context, cart);
  const state = { products: context.products } as DemoState;
  const quote = calculateQuote(
    state,
    resolved.map((entry) => ({ productId: entry.product.id, quantity: entry.quantity })),
  );
  return {
    lines: resolved.map((entry, index) => ({
      ...quote.lines[index],
      product: entry.product,
    })),
    quote,
    weightGrams: resolved.reduce(
      (grams, entry) => grams + entry.product.weightGrams * entry.quantity,
      0,
    ),
    limits: {
      maxLines: MAX_CART_LINES,
      maxLineQuantity: MAX_LINE_QUANTITY,
      maxCartQuantity: MAX_CART_QUANTITY,
    },
  };
}

export async function normalizedCreateOrder(
  profileId: string,
  reference: string,
  cart: CartLine[],
  address: DeliveryAddress,
) {
  const context = await loadContext();
  const resolved = resolveNigerianLines(context, cart);
  // No money crosses this boundary: korama_create_order prices every line
  // from market_listings itself.
  const result = await context.repository.createOrder({
    profileId,
    reference,
    operatingCompanyId: NIGERIA_OPERATING_COMPANY_ID,
    marketId: NIGERIA_MARKET_ID,
    lines: resolved.map((entry) => ({
      productId: entry.item.product.id,
      quantity: entry.quantity,
    })),
    deliveryAddress: address,
  });
  const view = await context.repository.getOrderView(reference, profileId);
  if (!view) throw new Error("Normalized order was created but could not be read back");
  return { result, state: toState(context, view) };
}

export async function normalizedVerifyPayment(orderId: string, providerReference: string, amountMinor: number, currency: string) {
  const context = await loadContext();
  const result = await context.repository.verifyPayment(orderId, providerReference, amountMinor, currency, `korama-http-payment:${providerReference}`);
  return result;
}

export async function normalizedAllocate(reference: string) {
  const context = await loadContext();
  if (!await context.repository.getOrderView(reference, undefined, NIGERIA_OPERATING_COMPANY_ID)) throw notFound("Order not found in operator scope");
  return context.repository.allocateOrderFefo(reference);
}
export async function normalizedAdvance(reference: string, status: Extract<OrderStatus, "picked" | "packed" | "dispatched">, weightGrams?: number) {
  const context = await loadContext();
  if (!await context.repository.getOrderView(reference, undefined, NIGERIA_OPERATING_COMPANY_ID)) throw notFound("Order not found in operator scope");
  return context.repository.advanceOrder(reference, status, weightGrams);
}
export async function normalizedCommand(reference: string, command: string) {
  const context = await loadContext();
  if (!await context.repository.getOrderView(reference, undefined, NIGERIA_OPERATING_COMPANY_ID)) throw notFound("Shipment not found in safety scope");
  return context.repository.commandSortie(reference, command);
}

/** Catalogue slug -> products.id, for the cart store. */
export async function productUuidForSlug(slug: string) {
  const context = await loadContext();
  const item = context.items.find(
    (candidate) => productId(candidate) === slug || candidate.product.id === slug,
  );
  return item?.product.id;
}

/**
 * products.id -> catalogue slug. Looked up rather than cached: a warm-on-read
 * cache would silently return undefined whenever the cart is read before the
 * catalogue, which is exactly what happens on a cold request.
 */
export async function slugForProductUuid(uuid: string) {
  const context = await loadContext();
  const item = context.items.find((candidate) => candidate.product.id === uuid);
  return item ? productId(item) : undefined;
}

export type OrderSummaryRow = {
  reference: string;
  status: OrderStatus;
  placedAt: string;
  itemCount: number;
  lineCount: number;
  headline: string;
  totalMinor: number;
  currency: string;
};

/** Every order a customer has placed, newest first. */
export async function readNormalizedOrders(profileId: string): Promise<OrderSummaryRow[]> {
  const context = await loadContext();
  const rows = await context.repository.listOrders(profileId);
  return rows.map(({ order, lines }) => {
    const first = lines[0];
    const slug = first ? productIdFromUuid(context.items, first.product_id) : undefined;
    const name =
      context.products.find((product) => product.id === slug)?.name ??
      text(object(first?.product_snapshot).name) ??
      "Order";
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    return {
      reference: order.reference,
      status: order.status as OrderStatus,
      placedAt: order.created_at,
      itemCount,
      lineCount: lines.length,
      headline: lines.length > 1 ? `${name} +${lines.length - 1} more` : name,
      totalMinor: order.total_minor,
      currency: order.currency,
    };
  });
}
