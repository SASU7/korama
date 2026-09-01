import "server-only";
import { createClient } from "@supabase/supabase-js";
import { buildTelemetry, type ComplianceSnapshot, type DeliveryAddress, type DemoState, type DeliveryLeg, type OrderEvent, type OrderStatus, type Product, type Shipment, type Sortie, type TransferStep, type UserRole } from "@/lib/domain";
import { createNormalizedRepository, type NormalizedCatalogueItem, type NormalizedOrderView, type NormalizedOperationalSnapshot, type Row } from "@/lib/supabase/normalized-repository";
import type { Database } from "@/lib/supabase/database.types";

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
function adminClient() {
  const url = runtimeEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = runtimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Normalized Supabase mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

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

function complianceForProduct(productIdValue: string, context: { batches: Row<"inventory_batches">[]; assessments: Row<"origin_assessments">[]; dutyQuotes: Row<"duty_quotes">[]; certificates: Row<"certificate_previews">[] }) {
  const batchIds = new Set(context.batches.filter((batch) => batch.product_id === productIdValue).map((batch) => batch.id));
  const assessment = context.assessments.find((candidate) => batchIds.has(candidate.batch_id) && candidate.status === "provisionally_eligible");
  if (!assessment) return undefined;
  const duty = context.dutyQuotes.find((candidate) => candidate.origin_assessment_id === assessment.id);
  const certificate = context.certificates.find((candidate) => candidate.origin_assessment_id === assessment.id);
  return {
    assessment: "provisionally_eligible",
    evidence: stringList(assessment.evidence),
    transformation: assessment.transformation_summary,
    dutyQuote: duty?.quote ?? assessment.duty_quote,
    certificateWatermark: certificate?.watermark ?? "PREVIEW — NOT A VALID CERTIFICATE",
  } satisfies ComplianceSnapshot;
}

function toProduct(item: NormalizedCatalogueItem, operations: NormalizedOperationalSnapshot, ghanaOperations: NormalizedOperationalSnapshot): Product {
  const allBatches = [...operations.batches, ...ghanaOperations.batches];
  const batches = allBatches.filter((batch) => batch.product_id === item.product.id);
  const firstBatch = [...batches].sort((left, right) => (left.expiry_date ?? "9999-12-31").localeCompare(right.expiry_date ?? "9999-12-31") || left.id.localeCompare(right.id))[0];
  const metadata = object(item.product.attributes);
  const compliance = complianceForProduct(item.product.id, {
    batches: allBatches,
    assessments: [...operations.originAssessments, ...ghanaOperations.originAssessments],
    dutyQuotes: [...operations.dutyQuotes, ...ghanaOperations.dutyQuotes],
    certificates: [...operations.certificatePreviews, ...ghanaOperations.certificatePreviews],
  });
  const available = batches.reduce((total, batch) => total + Math.max(0, batch.quantity - batch.allocated), 0);
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
  return [
    { label: "Ghana production", detail: "Transformation record linked to NK-SB-2407", complete },
    { label: "Tema staging", detail: "Received into Ghana export staging", complete },
    { label: "Bulk export", detail: "Cleared for export with provisional evidence", complete },
    { label: "Lekki receipt", detail: "Destination stock received and reconciled", complete },
  ];
}

function toState(context: NormalizedContext, view: NormalizedOrderView | null, role?: UserRole): DemoState {
  const staffView = role !== "consumer";
  const lineCompliance = view?.lines[0] ? object(view.lines[0].compliance_snapshot) : {};
  const compliance = Object.keys(lineCompliance).length ? lineCompliance as unknown as ComplianceSnapshot : baseCompliance(context);
  const line = view?.lines[0];
  const product = line ? context.products.find((candidate) => candidate.id === productIdFromUuid(context.items, line.product_id)) : undefined;
  const order = view ? {
    reference: view.order.reference,
    status: view.order.status as OrderStatus,
    productId: product?.id ?? "shea-balm",
    quantity: line?.quantity ?? 1,
    subtotalMinor: view.order.subtotal_minor,
    taxMinor: view.order.tax_minor,
    deliveryMinor: view.order.delivery_minor,
    totalMinor: view.order.total_minor,
    currency: "NGN" as const,
    address: deliveryAddress(view.order.delivery_address_snapshot),
    compliance,
    paymentReference: view.paymentAttempts.find((attempt) => attempt.status === "paid")?.provider_reference,
  } : null;
  const shipment = toShipment(view ?? emptyOrderView(), compliance);
  return {
    products: context.products,
    selectedProductId: context.products.some((candidate) => candidate.id === "shea-balm") ? "shea-balm" : context.products[0]?.id ?? "",
    cart: line ? [{ productId: product?.id ?? "shea-balm", quantity: line.quantity }] : [],
    order,
    shipment,
    orderEvents: view ? toOrderEvents(view.events, view.order.status as OrderStatus) : toOrderEvents([], "pending_payment"),
    batches: staffView ? context.operations.batches.map((batch) => ({ id: batch.id, batch: batch.reference, productId: productIdFromUuid(context.items, batch.product_id) ?? batch.product_id, site: "Lekki warehouse", expiry: batch.expiry_date ?? "No expiry", quantity: batch.quantity, allocated: batch.allocated, quarantined: batch.quarantined, cleared: batch.customs_cleared, originSupported: batch.origin_supported })) : [],
    transfer: staffView ? transferState(context) : [],
    tasks: staffView ? taskState(view) : [],
    compliance,
    sortie: view ? toSortie(view, context) : emptySortie(),
    lastMutation: view?.order.updated_at ?? new Date().toISOString(),
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

export async function normalizedQuote(productIdValue: string, quantity: number) {
  const context = await loadContext();
  const item = context.items.find((candidate) => candidate.market.code === "NG" && (productId(candidate) === productIdValue || candidate.product.id === productIdValue));
  if (!item || !item.listing.purchasable) throw new Error("This listing is not purchasable in Nigeria");
  const product = context.products.find((candidate) => candidate.id === productId(item));
  if (!product) throw new Error("The requested normalized product was not found");
  const subtotalMinor = product.priceMinor * quantity;
  const taxMinor = Math.round(subtotalMinor * 0.075);
  const deliveryMinor = product.origin === "ghana_origin_export" ? 450000 : 550000;
  return { product, quote: { subtotalMinor, taxMinor, deliveryMinor, totalMinor: subtotalMinor + taxMinor + deliveryMinor, currency: "NGN" as const } };
}

export async function normalizedCreateOrder(profileId: string, reference: string, productIdValue: string, quantity: number, address: DeliveryAddress) {
  const context = await loadContext();
  const item = context.items.find((candidate) => candidate.market.code === "NG" && (productId(candidate) === productIdValue || candidate.product.id === productIdValue));
  if (!item || !item.listing.purchasable) throw new Error("This listing is not purchasable in Nigeria");
  const product = context.products.find((candidate) => candidate.id === productId(item));
  if (!product) throw new Error("The requested normalized product was not found");
  const subtotalMinor = product.priceMinor * quantity;
  const taxMinor = Math.round(subtotalMinor * 0.075);
  const deliveryMinor = product.origin === "ghana_origin_export" ? 450000 : 550000;
  const result = await context.repository.createOrder({ profileId, reference, operatingCompanyId: NIGERIA_OPERATING_COMPANY_ID, marketId: NIGERIA_MARKET_ID, productId: item.product.id, quantity, currency: "NGN", subtotalMinor, taxMinor, deliveryMinor, totalMinor: subtotalMinor + taxMinor + deliveryMinor, deliveryAddress: address });
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
  if (!await context.repository.getOrderView(reference, undefined, NIGERIA_OPERATING_COMPANY_ID)) throw new Error("Order not found in operator scope");
  return context.repository.allocateOrderFefo(reference);
}
export async function normalizedAdvance(reference: string, status: Extract<OrderStatus, "picked" | "packed" | "dispatched">, weightGrams?: number) {
  const context = await loadContext();
  if (!await context.repository.getOrderView(reference, undefined, NIGERIA_OPERATING_COMPANY_ID)) throw new Error("Order not found in operator scope");
  return context.repository.advanceOrder(reference, status, weightGrams);
}
export async function normalizedCommand(reference: string, command: string) {
  const context = await loadContext();
  if (!await context.repository.getOrderView(reference, undefined, NIGERIA_OPERATING_COMPANY_ID)) throw new Error("Shipment not found in safety scope");
  return context.repository.commandSortie(reference, command);
}
