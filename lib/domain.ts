export type MarketCode = "GH" | "NG";
export type InventoryClass = "direct_import" | "ghana_origin_export" | "marketplace_future";
export type UserRole = "consumer" | "warehouse_operator" | "safety_officer";
export type MarketStatus = "active" | "roadmap" | "future";

/** A configured market, as the markets screen renders it. */
export type Market = {
  code: string;
  name: string;
  currency: string;
  language: string;
  status: MarketStatus;
  launchPhase: number;
  localizationRequired: string | null;
  checkoutEnabled: boolean;
};
export type OrderStatus = "pending_payment" | "paid" | "allocated" | "picked" | "packed" | "dispatched" | "delivered";
export type SortieStatus = "draft" | "preflight" | "cleared" | "launched" | "en_route" | "delivered" | "lockout" | "courier_fallback";

export type Product = {
  id: string;
  name: string;
  category: "Beauty" | "Fashion" | "Pantry" | "Home & craft";
  producer: string;
  origin: InventoryClass;
  description: string;
  priceMinor: number;
  currency: "NGN" | "GHS";
  weightGrams: number;
  market: MarketCode;
  purchasable: boolean;
  stockLabel: string;
  batch: string;
  expiry: string;
  ingredients?: string;
  transformation?: string;
};

export type Batch = {
  id: string;
  batch: string;
  productId: string;
  site: string;
  expiry: string;
  quantity: number;
  allocated: number;
  quarantined: boolean;
  cleared: boolean;
  originSupported: boolean;
};

export type OrderEvent = { status: OrderStatus; label: string; detail: string; at: string; complete: boolean };
export type DeliveryAddress = { recipientName: string; addressLine: string; city: string; countryCode: "NG" };
export type TransferStep = { label: string; detail: string; complete: boolean };
export type ComplianceSnapshot = { assessment: "provisionally_eligible"; evidence: string[]; transformation: string; dutyQuote: string; certificateWatermark: string };
export type ComplianceState = ComplianceSnapshot;
export type Gate = { key: string; label: string; detail: string; passed: boolean; severity?: "warning" | "danger" };
export type Sortie = { status: SortieStatus; weather: "clear" | "unsafe"; telemetry: { point: string; altitude: number; speed: number; battery: number; link: string }[]; gates: Gate[]; fallbackReason?: string };
export type OriginAssessment = { status: "provisionally_eligible" | "rejected"; reason: string };
export type DeliveryLeg = { sequenceNo: number; mode: "simulated_drone" | "ground_courier"; origin: string; destination: string; status: "planned" | "in_transit" | "complete" | "fallback" };
export type Shipment = { reference: string; status: "planned" | "in_transit" | "delivered" | "fallback"; legs: DeliveryLeg[]; compliance?: ComplianceSnapshot };

export type DemoState = {
  products: Product[];
  selectedProductId: string;
  cart: { productId: string; quantity: number }[];
  order: { reference: string; status: OrderStatus; productId: string; quantity: number; subtotalMinor: number; taxMinor: number; deliveryMinor: number; totalMinor: number; currency: "NGN"; address?: DeliveryAddress; compliance?: ComplianceSnapshot; paymentReference?: string } | null;
  shipment: Shipment | null;
  orderEvents: OrderEvent[];
  batches: Batch[];
  transfer: TransferStep[];
  tasks: { label: string; detail: string; done: boolean }[];
  compliance: ComplianceState;
  sortie: Sortie;
  lastMutation: string;
};

const now = "2026-08-29T10:00:00.000Z";
const money = (value: number) => Math.round(value);

export const seedDemoState = (): DemoState => {
  const products: Product[] = [
    { id: "shea-balm", name: "Nokware shea repair balm", category: "Beauty", producer: "Nokware Skincare · Ghana", origin: "ghana_origin_export", description: "A rich, fragrance-free shea balm made in Accra and pre-positioned at Lekki.", priceMinor: 485000, currency: "NGN", weightGrams: 180, market: "NG", purchasable: true, stockLabel: "Lekki · 42 units", batch: "NK-SB-2407", expiry: "2027-01-07", ingredients: "Shea butter, baobab oil, vitamin E", transformation: "Blended, filled, labelled, and batch-tested in Ghana" },
    { id: "shea-oil", name: "Nokware daily body oil", category: "Beauty", producer: "Nokware Skincare · Ghana", origin: "ghana_origin_export", description: "Lightweight Ghana-origin body oil for the everyday ritual.", priceMinor: 620000, currency: "NGN", weightGrams: 220, market: "NG", purchasable: true, stockLabel: "Lekki · 18 units", batch: "NK-DO-2408", expiry: "2027-04-12", ingredients: "Baobab, moringa, sunflower oil", transformation: "Pressed, blended, filled, and batch-tested in Ghana" },
    { id: "kente-tote", name: "Handwoven Kente market tote", category: "Fashion", producer: "Ahenema Weavers · Kumasi", origin: "ghana_origin_export", description: "A structured tote woven and finished by a small Kumasi workshop.", priceMinor: 950000, currency: "NGN", weightGrams: 420, market: "NG", purchasable: true, stockLabel: "Lekki · 9 units", batch: "AW-KT-18", expiry: "No expiry", transformation: "Woven, cut, sewn, and finished in Ghana" },
    { id: "cocoa-granola", name: "Cocoa nib breakfast granola", category: "Pantry", producer: "Atinka Foods · Tema", origin: "ghana_origin_export", description: "Small-batch granola with Ghana cocoa nibs; illustrative export stock.", priceMinor: 380000, currency: "NGN", weightGrams: 350, market: "NG", purchasable: true, stockLabel: "Lekki · 26 units", batch: "AF-CG-2406", expiry: "2026-11-18", ingredients: "Oats, cocoa nibs, coconut, honey", transformation: "Mixed, baked, packed, and batch-tested in Ghana" },
    { id: "direct-blender", name: "Compact kitchen blender", category: "Home & craft", producer: "Global supplier · cleared in Nigeria", origin: "direct_import", description: "Third-country inventory imported directly into Nigeria and cleared locally.", priceMinor: 2150000, currency: "NGN", weightGrams: 1900, market: "NG", purchasable: true, stockLabel: "Lekki · 6 units", batch: "DI-NG-081", expiry: "No expiry" },
    { id: "direct-scarf", name: "Linen travel scarf", category: "Fashion", producer: "Global supplier · cleared in Nigeria", origin: "direct_import", description: "A direct-import comparison product; it never routes through Ghana.", priceMinor: 730000, currency: "NGN", weightGrams: 180, market: "NG", purchasable: true, stockLabel: "Lekki · 14 units", batch: "DI-NG-074", expiry: "No expiry" },
    { id: "ghana-basket", name: "Bolga storage basket", category: "Home & craft", producer: "Tamale Basket Collective · Ghana", origin: "ghana_origin_export", description: "Hand-finished storage basket from a northern Ghana co-operative.", priceMinor: 760000, currency: "NGN", weightGrams: 650, market: "NG", purchasable: true, stockLabel: "Tema staging · export queue", batch: "TB-24-11", expiry: "No expiry", transformation: "Woven and finished in Ghana" },
    { id: "ghana-cocoa", name: "Single-origin cocoa powder", category: "Pantry", producer: "Volta Cocoa Works · Ghana", origin: "ghana_origin_export", description: "Ghana-origin pantry staple; illustrative market listing.", priceMinor: 440000, currency: "GHS", weightGrams: 500, market: "GH", purchasable: true, stockLabel: "Tema · 31 units", batch: "VCW-2409", expiry: "2027-02-04", ingredients: "100% cocoa", transformation: "Fermented, roasted, milled, and packed in Ghana" },
    { id: "direct-lamp", name: "Rattan reading lamp", category: "Home & craft", producer: "Global supplier · cleared in Ghana", origin: "direct_import", description: "Third-country inventory imported directly into Ghana for local sale.", priceMinor: 1120000, currency: "GHS", weightGrams: 1100, market: "GH", purchasable: true, stockLabel: "Tema · 8 units", batch: "DI-GH-033", expiry: "No expiry" },
    { id: "future-marketplace", name: "Future maker marketplace listing", category: "Home & craft", producer: "Third-party seller · roadmap", origin: "marketplace_future", description: "A roadmap-only seller listing; settlement is not enabled in this prototype.", priceMinor: 0, currency: "NGN", weightGrams: 100, market: "NG", purchasable: false, stockLabel: "Future capability", batch: "Not assigned", expiry: "No expiry" },
  ];

  const initialEvents: OrderEvent[] = [
    { status: "pending_payment", label: "Order created", detail: "Awaiting server-confirmed Paystack test payment", at: now, complete: false },
    { status: "paid", label: "Payment verified", detail: "Amount and currency match the server quote", at: "", complete: false },
    { status: "allocated", label: "Batch allocated", detail: "FEFO selected the earliest valid Lekki batch", at: "", complete: false },
    { status: "picked", label: "Picked", detail: "Warehouse operator confirms scan", at: "", complete: false },
    { status: "packed", label: "Packed", detail: "Weight captured for delivery routing", at: "", complete: false },
    { status: "dispatched", label: "Dispatched", detail: "Handover to simulated last-mile delivery", at: "", complete: false },
    { status: "delivered", label: "Delivered", detail: "Fictional micro-hub drop confirmation", at: "", complete: false },
  ];

  return {
    products,
    selectedProductId: "shea-balm",
    cart: [],
    order: null,
    shipment: null,
    orderEvents: initialEvents,
    batches: [
      { id: "batch-expired", batch: "NK-SB-2401", productId: "shea-balm", site: "Lekki warehouse", expiry: "2026-08-02", quantity: 8, allocated: 0, quarantined: false, cleared: true, originSupported: true },
      { id: "batch-current", batch: "NK-SB-2407", productId: "shea-balm", site: "Lekki warehouse", expiry: "2027-01-07", quantity: 42, allocated: 0, quarantined: false, cleared: true, originSupported: true },
      { id: "batch-quarantine", batch: "NK-SB-QA", productId: "shea-balm", site: "Lekki warehouse", expiry: "2027-03-01", quantity: 4, allocated: 0, quarantined: true, cleared: true, originSupported: true },
    ],
    transfer: [
      { label: "Ghana production", detail: "Transformation record linked to NK-SB-2407", complete: true },
      { label: "Tema staging", detail: "Received into Ghana export staging", complete: true },
      { label: "Bulk export", detail: "Cleared for export with provisional evidence", complete: true },
      { label: "Lekki receipt", detail: "Destination stock received and reconciled", complete: true },
    ],
    tasks: [
      { label: "Receive batch", detail: "NK-SB-2407 · 42 units at Lekki", done: true },
      { label: "Allocate FEFO", detail: "Choose earliest valid, non-quarantined batch", done: false },
      { label: "Pick + scan", detail: "Confirm one unit against the pick list", done: false },
      { label: "Pack + weigh", detail: "Capture 180g parcel weight", done: false },
      { label: "Dispatch", detail: "Hand parcel to delivery router", done: false },
    ],
    compliance: { assessment: "provisionally_eligible", evidence: ["Producer invoice · Nokware Skincare", "Transformation log · batch NK-SB-2407", "Input ledger · Ghana shea butter", "Batch test summary · illustrative"], transformation: "Blended, filled, labelled, and batch-tested in Ghana. Repackaging alone would be rejected.", dutyQuote: "Illustrative: Ghana-origin qualification → duty treatment awaiting pilot validation", certificateWatermark: "PREVIEW — NOT A VALID CERTIFICATE" },
    sortie: { status: "draft", weather: "clear", telemetry: [], gates: [
      { key: "payload", label: "Payload", detail: "180g / 2kg simulated limit", passed: true },
      { key: "aircraft", label: "Aircraft condition", detail: "KOR-D01 · airworthiness current", passed: true },
      { key: "authorization", label: "Authorization window", detail: "Simulated Nigerian authorization on file", passed: true },
      { key: "weather", label: "Weather", detail: "Wind and rain below the configured threshold", passed: true },
      { key: "geofence", label: "Geofence", detail: "Route avoids restricted corridors", passed: true },
      { key: "battery", label: "Battery", detail: "94% · reserve protected", passed: true },
      { key: "override", label: "Manual override", detail: "Safety officer control available", passed: true },
    ] },
    lastMutation: now,
  };
};

export function getProduct(state: DemoState, id = state.selectedProductId) { return state.products.find((product) => product.id === id) ?? state.products[0]; }
export function validateDeliveryAddress(value: unknown): DeliveryAddress {
  const input = (value ?? {}) as Record<string, unknown>;
  const recipientName = String(input.recipientName ?? "").trim();
  const addressLine = String(input.addressLine ?? "").trim();
  const city = String(input.city ?? "").trim();
  const countryCode = String(input.countryCode ?? "NG").trim().toUpperCase();
  if (recipientName.length < 2) throw new Error("Enter the recipient name");
  if (addressLine.length < 5) throw new Error("Enter a delivery address");
  if (city.length < 2) throw new Error("Enter the delivery city");
  if (countryCode !== "NG") throw new Error("Checkout is currently available only for Nigerian delivery addresses");
  return { recipientName, addressLine, city, countryCode: "NG" };
}
export function normalizeQuantity(value: unknown): number {
  const quantity = Number(value ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error("Quantity must be a whole number between 1 and 10");
  return quantity;
}
export function formatMoney(value: number, currency: string) { return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-GH", { style: "currency", currency, maximumFractionDigits: 0 }).format(value / 100); }
export function calculateQuote(state: DemoState, productId: string, quantity: number) {
  const product = getProduct(state, productId);
  const subtotalMinor = money(product.priceMinor * quantity);
  const taxMinor = money(subtotalMinor * 0.075);
  const deliveryMinor = product.origin === "ghana_origin_export" ? 450000 : 550000;
  return { subtotalMinor, taxMinor, deliveryMinor, totalMinor: subtotalMinor + taxMinor + deliveryMinor, currency: "NGN" as const };
}
function copyComplianceSnapshot(value: ComplianceSnapshot): ComplianceSnapshot { return { ...value, evidence: [...value.evidence] }; }
export function assessOrigin(transformation: string, evidence: string[]): OriginAssessment {
  const normalizedTransformation = transformation.toLowerCase();
  const repackagingOnly = /repackag|relabel|label only|labelled only/.test(normalizedTransformation) && !/blend|process|ferment|roast|mill|weav|sew|fill|manufactur/.test(normalizedTransformation);
  if (repackagingOnly) return { status: "rejected", reason: "Repackaging or relabelling alone does not establish Ghana origin" };
  const hasTransformation = /blend|process|ferment|roast|mill|weav|sew|fill|manufactur/.test(normalizedTransformation);
  const evidenceCount = evidence.filter((item) => item.trim().length > 0).length;
  if (!hasTransformation || evidenceCount < 2) return { status: "rejected", reason: "Transformation and supporting evidence are insufficient" };
  return { status: "provisionally_eligible", reason: "Transformation and supporting evidence are present; pilot validation remains required" };
}
export function selectFefoBatch(state: DemoState, productId: string, quantity = 1) {
  const today = new Date("2026-08-29T00:00:00.000Z").getTime();
  return state.batches.filter((batch) => batch.productId === productId && batch.quantity - batch.allocated >= quantity && !batch.quarantined && batch.cleared && batch.originSupported && new Date(batch.expiry).getTime() > today).sort((a, b) => a.expiry.localeCompare(b.expiry))[0] ?? null;
}
function stamp() { return new Date().toISOString(); }
export function markOrder(state: DemoState, status: OrderStatus) {
  if (!state.order) throw new Error("Create the order before advancing it");
  const allowed: Record<OrderStatus, OrderStatus | null> = { pending_payment: "paid", paid: "allocated", allocated: "picked", picked: "packed", packed: "dispatched", dispatched: "delivered", delivered: null };
  if (allowed[state.order.status] !== status) throw new Error(`Order cannot advance from ${state.order.status} to ${status}`);
  state.order.status = status;
  if (status === "packed" && !state.shipment) {
    state.shipment = { reference: `SHP-${state.order.reference}`, status: "planned", legs: [{ sequenceNo: 1, mode: "simulated_drone", origin: "Lekki warehouse", destination: "Fictional Lekki micro-hub", status: "planned" }], compliance: state.order.compliance ? copyComplianceSnapshot(state.order.compliance) : undefined };
  }
  if (status === "dispatched" && state.shipment) {
    state.shipment.status = "in_transit";
    state.shipment.legs = state.shipment.legs.map((leg) => leg.status === "planned" ? { ...leg, status: "in_transit" } : leg);
  }
  if (status === "delivered" && state.shipment) {
    state.shipment.status = "delivered";
    state.shipment.legs = state.shipment.legs.map((leg) => leg.mode === "simulated_drone" ? { ...leg, status: "complete" } : leg);
  }
  const event = state.orderEvents.find((item) => item.status === status);
  if (event) { event.complete = true; event.at = stamp(); }
  state.lastMutation = stamp();
}
export function allocateFefo(state: DemoState) {
  if (!state.order || state.order.status !== "paid") throw new Error("Only a paid order can be allocated");
  const batch = selectFefoBatch(state, state.order.productId, state.order.quantity);
  if (!batch) throw new Error("No valid, non-quarantined, uncleared stock is available");
  batch.allocated += state.order.quantity;
  state.tasks[1].done = true;
  markOrder(state, "allocated");
  return batch;
}
export function buildTelemetry() { return [
  { point: "Lekki launch pad", altitude: 0, speed: 0, battery: 94, link: "Strong" },
  { point: "Lekki corridor", altitude: 82, speed: 34, battery: 88, link: "Strong" },
  { point: "Coastal waypoint", altitude: 96, speed: 39, battery: 79, link: "Strong" },
  { point: "Fictional micro-hub", altitude: 0, speed: 0, battery: 71, link: "Strong" },
]; }
export type SortieCommand = "preflight" | "launch" | "advance" | "inject_weather" | "reset_weather" | "fallback" | "complete";

function setCourierFallback(state: DemoState) {
  if (!state.shipment) return;
  const existingCourierLeg = state.shipment.legs.find((leg) => leg.mode === "ground_courier");
  state.shipment.status = "fallback";
  state.shipment.legs = [
    ...state.shipment.legs.filter((leg) => leg.mode !== "ground_courier").map((leg) => ({ ...leg, status: "fallback" as const })),
    existingCourierLeg ? { ...existingCourierLeg, status: "in_transit" as const } : { sequenceNo: state.shipment.legs.length + 1, mode: "ground_courier" as const, origin: "Lekki warehouse", destination: "Fictional Lekki micro-hub", status: "in_transit" as const },
  ];
}

export function sortieCommand(state: DemoState, command: SortieCommand) {
  if (!["preflight", "launch", "advance", "inject_weather", "reset_weather", "fallback", "complete"].includes(command)) throw new Error("Unsupported sortie command");
  if (!["reset_weather"].includes(command) && (!state.order || state.order.status !== "dispatched")) throw new Error("Delivery controls unlock after the order is dispatched");
  if (command === "inject_weather") { state.sortie.weather = "unsafe"; state.sortie.status = "lockout"; state.sortie.gates = state.sortie.gates.map((gate) => gate.key === "weather" ? { ...gate, passed: false, detail: "Unsafe weather injected · flight locked out", severity: "danger" } : gate); state.sortie.fallbackReason = "Unsafe weather automatically created a ground-courier leg"; setCourierFallback(state); return; }
  if (command === "reset_weather") { state.sortie.weather = "clear"; state.sortie.status = "draft"; state.sortie.telemetry = []; state.sortie.fallbackReason = undefined; state.sortie.gates = state.sortie.gates.map((gate) => gate.key === "weather" ? { ...gate, passed: true, detail: "Wind and rain below the configured threshold", severity: undefined } : gate); if (state.shipment) { state.shipment.status = "in_transit"; state.shipment.legs = state.shipment.legs.filter((leg) => leg.mode !== "ground_courier").map((leg) => ({ ...leg, status: "in_transit" })); } return; }
  if (command === "fallback") { state.sortie.status = "courier_fallback"; state.sortie.fallbackReason = "Manual override requested a ground-courier handover"; setCourierFallback(state); return; }
  if (command === "complete") { if (state.sortie.status !== "en_route") throw new Error("The sortie is not en route"); state.sortie.status = "delivered"; if (state.order?.status === "dispatched") markOrder(state, "delivered"); return; }
  if (command === "preflight") { if (state.sortie.gates.some((gate) => !gate.passed)) throw new Error("Preflight blocked: resolve every safety gate first"); state.sortie.status = "cleared"; return; }
  if (command === "launch") { if (state.sortie.status !== "cleared") throw new Error("Complete a successful preflight before launch"); state.sortie.status = "launched"; state.sortie.telemetry = [buildTelemetry()[0]]; return; }
  if (command === "advance") { if (state.sortie.status !== "launched") throw new Error("Launch the sortie before advancing telemetry"); state.sortie.status = "en_route"; state.sortie.telemetry = buildTelemetry(); return; }
}
