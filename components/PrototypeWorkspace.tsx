"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, CircleAlert, CloudRain, CreditCard, Database, FileCheck2, Fuel, LockKeyhole, Map, PackageCheck, Plane, RefreshCw, Search, ShieldCheck, ShoppingBag, Sparkles, Truck, Warehouse, Weight } from "lucide-react";
import { DemoState, formatMoney, getProduct, Product, seedDemoState, UserRole, validateDeliveryAddress, type DeliveryAddress } from "@/lib/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Surface = "shop" | "operations" | "compliance" | "delivery" | "markets";
type Quote = { subtotalMinor: number; taxMinor: number; deliveryMinor: number; totalMinor: number; currency: "NGN" };
const roleLabels: Record<UserRole, string> = { consumer: "Nigerian consumer", warehouse_operator: "Warehouse + compliance", safety_officer: "Drone safety officer" };
const surfaceLabels: Record<Surface, string> = { shop: "Commerce", operations: "Operations", compliance: "Compliance", delivery: "Delivery", markets: "Market horizon" };
const originLabels: Record<Product["origin"], string> = { direct_import: "Direct import", ghana_origin_export: "Ghana-origin export", marketplace_future: "Marketplace · future" };
const categories = ["All", "Beauty", "Fashion", "Pantry", "Home & craft"];
const marketRows = [{ code: "GH", name: "Ghana", phase: "Phase 1", status: "Transacting", detail: "Home base · Tema staging · GHS" }, { code: "NG", name: "Nigeria", phase: "Phase 1", status: "Transacting", detail: "Anchor market · Lekki · NGN" }, { code: "CI", name: "Côte d’Ivoire", phase: "Phase 2", status: "Roadmap", detail: "Abidjan · CFA franc · French localization" }, { code: "SN", name: "Senegal", phase: "Phase 2", status: "Roadmap", detail: "Dakar · CFA franc · French localization" }, { code: "TG / BJ", name: "Togo + Benin", phase: "Phase 3", status: "Roadmap", detail: "Lomé / Cotonou · distribution nodes" }, { code: "GN", name: "Guinea", phase: "Phase 4", status: "Roadmap", detail: "Conakry · later launch review" }];
const demoAddress: DeliveryAddress = { recipientName: "Amina Okafor", addressLine: "12 Admiralty Way", city: "Lagos", countryCode: "NG" };

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "blue" }) { return <span className={`demo-badge ${tone}`}>{children}</span>; }
function OriginBadge({ origin }: { origin: Product["origin"] }) { return <Badge tone={origin === "ghana_origin_export" ? "green" : origin === "direct_import" ? "blue" : "amber"}>{originLabels[origin]}</Badge>; }
function SectionTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) { return <div className="workspace-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{detail && <p className="workspace-detail">{detail}</p>}</div>; }
function LoadingBlock() { return <div className="loading-block" role="status" aria-label="Loading guided demo state"><span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" /></div>; }
async function readApiBody(response: Response) { const text = await response.text(); if (!text) return {} as { error?: string }; try { return JSON.parse(text) as { error?: string }; } catch { return { error: "The server returned an unreadable response" }; } }

export default function PrototypeWorkspace({ initialRole = "consumer" }: { initialRole?: UserRole }) {
  const [state, setState] = useState<DemoState>(seedDemoState);
  const [surface, setSurface] = useState<Surface>("shop");
  const [role, setRole] = useState<UserRole>(initialRole);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedProductId, setSelectedProductId] = useState("shea-balm");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [market, setMarket] = useState<"NG" | "GH">("NG");
  const [syncStatus, setSyncStatus] = useState<"local" | "polling" | "realtime">("local");
  const [stateLoading, setStateLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [address, setAddress] = useState<DeliveryAddress>(demoAddress);
  const [addressAttempted, setAddressAttempted] = useState(false);
  const [serverQuote, setServerQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const quoteRequestRef = useRef(0);
  const roleButtonRef = useRef<HTMLButtonElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roleOpen) return;
    roleMenuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setRoleOpen(false); roleButtonRef.current?.focus(); } };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [roleOpen]);

  function handleRoleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(roleMenuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? []);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); items[(current + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus(); }
    if (event.key === "Home") { event.preventDefault(); items[0]?.focus(); }
    if (event.key === "End") { event.preventDefault(); items.at(-1)?.focus(); }
  }

  const refresh = useCallback(async () => {
    const response = await fetch("/api/demo/state", { cache: "no-store" });
    if (!response.ok) throw new Error("Couldn’t refresh the demo state");
    setState(await response.json() as DemoState);
  }, []);

  useEffect(() => {
    const selected = state.products.find((product) => product.id === selectedProductId);
    if (stateLoading || market !== "NG" || !selected?.purchasable || selected.market !== "NG" || !online || state.order) return;
    const requestId = ++quoteRequestRef.current;
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted && requestId === quoteRequestRef.current) { setServerQuote(null); setQuoteLoading(true); setQuoteError(""); } });
    fetch("/api/cart/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: selectedProductId, quantity }), signal: controller.signal })
      .then(async (response) => { const body = await response.json() as { error?: string; quote?: Quote }; if (!response.ok || !body.quote) throw new Error(body.error ?? "Checkout quote could not be calculated"); return body.quote; })
      .then((nextQuote) => { if (requestId === quoteRequestRef.current) { setServerQuote(nextQuote); setState((current) => ({ ...current, cart: [{ productId: selectedProductId, quantity }] })); } })
      .catch((caught) => { if (caught instanceof DOMException && caught.name === "AbortError") return; if (requestId === quoteRequestRef.current) { setServerQuote(null); setQuoteError(caught instanceof Error ? caught.message : "Checkout quote could not be calculated"); } })
      .finally(() => { if (requestId === quoteRequestRef.current) setQuoteLoading(false); });
    return () => controller.abort();
  }, [market, online, quantity, selectedProductId, stateLoading, state.order, state.products]);

  useEffect(() => {
    let active = true;
    fetch("/api/demo/state", { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("The demo state could not be loaded"); return response.json(); })
      .then((data: DemoState) => { if (active) setState(data); })
      .catch(() => { if (active) setError("The demo state could not be loaded. Try refresh."); })
      .finally(() => { if (active) setStateLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => { window.removeEventListener("online", updateOnline); window.removeEventListener("offline", updateOnline); };
  }, []);

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    const poll = window.setInterval(() => { setSyncStatus((status) => status === "realtime" ? status : "polling"); void refresh().catch(() => setError("Live state is unavailable. Try refresh.")); }, 10000);
    if (!client) return () => window.clearInterval(poll);
    const channel = client.channel("korama-private-events", { config: { private: true } })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_events" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "sortie_events" }, () => { void refresh(); })
      .subscribe((status: string) => { if (status === "SUBSCRIBED") setSyncStatus("realtime"); else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setSyncStatus("polling"); });
    return () => { window.clearInterval(poll); void client.removeChannel(channel); };
  }, [refresh]);

  useEffect(() => {
    if (state.sortie.status !== "launched" || !state.order?.reference || !navigator.onLine) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/delivery/sorties/${state.order?.reference}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "advance" }) });
        if (!response.ok) throw new Error("Telemetry playback could not start");
        await refresh();
      } catch (caught) { setError(caught instanceof Error ? caught.message : "Telemetry playback could not start"); }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [refresh, state.order?.reference, state.sortie.status]);

  async function mutate(url: string, options?: RequestInit, success?: string) {
    if (!navigator.onLine) { setError("You are offline. Reconnect before changing the demo state."); return; }
    setBusy(true); setError("");
    try { const response = await fetch(url, options); const body = await readApiBody(response); if (!response.ok) throw new Error(body.error ?? "The demo action failed"); await refresh(); if (success) setNotice(success); } catch (caught) { setError(caught instanceof Error ? caught.message : "The demo action failed"); } finally { setBusy(false); }
  }
  async function pay() {
    if (!navigator.onLine) { setError("You are offline. Reconnect before starting test payment."); return; }
    setAddressAttempted(true);
    try { validateDeliveryAddress(address); } catch (caught) { setError(caught instanceof Error ? caught.message : "Enter a valid Nigerian delivery address"); return; }
    if (!currentQuote) { setError(quoteError || "Wait for the server checkout quote before starting payment."); return; }
    setBusy(true); setError(""); setNotice("");
    try { const init = await fetch("/api/payments/paystack/initialize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: selectedProductId, quantity, address }) }); const initBody = await readApiBody(init) as { error?: string; reference?: string }; if (!init.ok) throw new Error(initBody.error ?? "Payment could not initialize"); const verify = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(initBody.reference ?? "")}`); const verifyBody = await readApiBody(verify); if (!verify.ok) throw new Error(verifyBody.error ?? "Payment could not be verified"); await refresh(); setNotice("Payment verified server-side. The order is ready for fulfilment."); } catch (caught) { setError(caught instanceof Error ? caught.message : "Payment failed"); } finally { setBusy(false); }
  }
  async function retryState() {
    if (!navigator.onLine) { setError("You are offline. Reconnect before refreshing the demo state."); return; }
    setError("");
    try { await refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "The demo state could not be refreshed"); }
  }
  async function reset() { await mutate("/api/demo/reset", { method: "POST" }, "Demo reset to the canonical Ghana → Nigeria scenario."); }
  async function switchRole(nextRole: UserRole) {
    setError("");
    if (!navigator.onLine) { setError("You are offline. Reconnect before switching identities."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/demo/identity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: nextRole }) });
      if (!response.ok) { const body = await readApiBody(response); throw new Error(body.error ?? "Identity switch failed"); }
      setRole(nextRole);
      setRoleOpen(false);
      roleButtonRef.current?.focus();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Identity switch failed"); }
    finally { setBusy(false); }
  }

  const selectedProduct = getProduct(state, selectedProductId);
  const changeMarket = (next: "NG" | "GH") => { setMarket(next); const first = state.products.find((product) => product.market === next); if (first) setSelectedProductId(first.id); setCategory("All"); };
  const filteredProducts = useMemo(() => state.products.filter((product) => product.market === market && (category === "All" || product.category === category) && `${product.name} ${product.producer} ${product.origin}`.toLowerCase().includes(search.toLowerCase())), [state.products, search, category, market]);
  const isDeepOrder = Boolean(state.order);
  const currentQuote = state.order ? { subtotalMinor: state.order.subtotalMinor, taxMinor: state.order.taxMinor, deliveryMinor: state.order.deliveryMinor, totalMinor: state.order.totalMinor, currency: state.order.currency } : serverQuote;

  return <main className="workspace-frame">
    <header className="workspace-bar">
      <div className="brand-lockup"><span className="brand-mark">K</span><span>KORAMA</span></div>
      <div className="workspace-context"><span className="context-dot" /> Private demo · Ghana + Nigeria <span className="sync-status">{syncStatus === "realtime" ? "Realtime" : syncStatus === "polling" ? "Refetch fallback" : "Adapter ready"}</span></div>
      <div className="workspace-actions">
        <button type="button" className="reset-button" onClick={reset} disabled={busy || role !== "warehouse_operator"} aria-busy={busy} title={role === "warehouse_operator" ? "Reset the guided demo scenario" : "Switch to Warehouse + compliance to reset the scenario"}><RefreshCw size={14} aria-hidden="true" /> Reset scenario</button>
        <div className="role-switch"><button ref={roleButtonRef} type="button" className="role-button" onClick={() => setRoleOpen((open) => !open)} disabled={busy} aria-busy={busy} aria-expanded={roleOpen} aria-haspopup="menu" aria-controls="role-menu"><span className="avatar">{role === "consumer" ? "NC" : role === "warehouse_operator" ? "OP" : "SO"}</span><span className="role-copy"><strong>{roleLabels[role]}</strong><small>Server-guided identity</small></span><ChevronDown size={16} aria-hidden="true" /></button>{roleOpen && <div ref={roleMenuRef} id="role-menu" className="role-menu workspace-role-menu" role="menu" aria-label="Guided identities" onKeyDown={handleRoleMenuKeyDown}><p>Actions are scoped to the selected guided identity.</p>{(Object.keys(roleLabels) as UserRole[]).map((key) => <button type="button" role="menuitem" key={key} disabled={busy} onClick={() => switchRole(key)}>{roleLabels[key]} {role === key && "✓"}</button>)}</div>}</div>
      </div>
    </header>
    <div className="workspace-layout">
      <aside className="workspace-sidebar" aria-label="Prototype surfaces">
        <div className="sidebar-label">Surfaces</div>
        {(Object.keys(surfaceLabels) as Surface[]).map((key) => <button key={key} type="button" className={surface === key ? "surface-nav active" : "surface-nav"} aria-pressed={surface === key} onClick={() => setSurface(key)}><span className="surface-icon">{key === "shop" ? <ShoppingBag size={16} aria-hidden="true" /> : key === "operations" ? <Warehouse size={16} aria-hidden="true" /> : key === "compliance" ? <FileCheck2 size={16} aria-hidden="true" /> : key === "delivery" ? <Plane size={16} aria-hidden="true" /> : <Map size={16} aria-hidden="true" />}</span><span>{surfaceLabels[key]}</span>{key === "shop" && <span className="nav-count">{state.cart.length || ""}</span>}</button>)}
        <div className="sidebar-divider" />
        <div className="sidebar-callout"><Sparkles size={16} aria-hidden="true" /><strong>Deep journey</strong><p>Ghana-origin shea from producer to Nigerian doorstep.</p><button type="button" onClick={() => { setSurface("shop"); setSelectedProductId("shea-balm"); }}>Open journey <ArrowRight size={14} aria-hidden="true" /></button></div>
        <div className="sidebar-foot"><ShieldCheck size={14} aria-hidden="true" /><span>Illustrative data<br />No live transactions</span></div>
      </aside>
      <section className="workspace-main" aria-busy={stateLoading || busy}>
        {notice && <div className="notice success" role="status"><Check size={16} aria-hidden="true" />{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}
        {error && <div className="notice error" role="alert"><CircleAlert size={16} aria-hidden="true" /><span>{error}</span><button type="button" className="notice-action" onClick={retryState}>Retry</button><button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
        {!online && <div className="notice offline" role="status"><CircleAlert size={16} aria-hidden="true" /><span>You’re offline. The demo is read-only until the connection returns.</span><button type="button" onClick={() => void refresh().catch(() => setError("The demo state could not be refreshed yet."))}>Retry</button></div>}
        {stateLoading ? <div className="workspace-loading"><LoadingBlock /><strong>Loading guided demo state</strong><p>Preparing the canonical Ghana → Nigeria scenario.</p></div> : <>{surface === "shop" && <ShopSurface state={state} market={market} setMarket={changeMarket} products={filteredProducts} categories={categories} category={category} setCategory={setCategory} search={search} setSearch={setSearch} selectedProduct={selectedProduct} selectProduct={setSelectedProductId} quantity={quantity} setQuantity={setQuantity} address={address} setAddress={setAddress} addressAttempted={addressAttempted} pay={pay} busy={busy} isDeepOrder={isDeepOrder} serverQuote={currentQuote} quoteLoading={quoteLoading} quoteError={quoteError} />}
        {surface === "operations" && <OperationsSurface state={state} mutate={mutate} busy={busy} />}
        {surface === "compliance" && <ComplianceSurface state={state} />}
        {surface === "delivery" && <><DeliverySurface state={state} mutate={mutate} busy={busy} /><DeliveryCompletionButton state={state} mutate={mutate} busy={busy} /></>}
        {surface === "markets" && <><MarketsSurface /><CapabilityLab state={state} /></>}</>}
      </section>
    </div>
  </main>;
}

function ShopSurface({ state, market, setMarket, products, categories, category, setCategory, search, setSearch, selectedProduct, selectProduct, quantity, setQuantity, address, setAddress, addressAttempted, pay, busy, isDeepOrder, serverQuote, quoteLoading, quoteError }: { state: DemoState; market: "NG" | "GH"; setMarket: (value: "NG" | "GH") => void; products: Product[]; categories: string[]; category: string; setCategory: (value: string) => void; search: string; setSearch: (value: string) => void; selectedProduct: Product; selectProduct: (value: string) => void; quantity: number; setQuantity: (value: number) => void; address: DeliveryAddress; setAddress: (value: DeliveryAddress) => void; addressAttempted: boolean; pay: () => Promise<void>; busy: boolean; isDeepOrder: boolean; serverQuote: Quote | null; quoteLoading: boolean; quoteError: string }) {
  const quote = serverQuote;
  const addressErrors = { recipientName: address.recipientName.trim().length < 2 ? "Enter the recipient name" : "", addressLine: address.addressLine.trim().length < 5 ? "Enter a delivery address" : "", city: address.city.trim().length < 2 ? "Enter the delivery city" : "" };
  return <><div className="market-picker standalone"><label htmlFor="market-picker">Market</label><select id="market-picker" value={market} onChange={(event) => setMarket(event.target.value as "NG" | "GH")}><option value="NG">Nigeria · NGN</option><option value="GH">Ghana · GHS</option></select></div><SectionTitle eyebrow={`Commerce · ${market === "NG" ? "Nigeria" : "Ghana"}`} title="A storefront with a point of view." detail={`Rule-based demo curation · Local ${market === "NG" ? "NGN" : "GHS"} pricing · Provenance visible`} />
    <div className="commerce-grid">
      <div className="catalogue-column"><div className="shop-toolbar"><label className="search-box"><Search size={16} aria-hidden="true" /><span className="sr-only">Search products</span><input type="search" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product, maker, or provenance" /></label><div className="filter-row" role="group" aria-label="Product categories">{categories.map((item) => <button key={item} type="button" className={category === item ? "filter-chip active" : "filter-chip"} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div></div><div className="product-grid">{products.map((product) => <button type="button" key={product.id} className={selectedProduct.id === product.id ? "product-card selected" : "product-card"} aria-pressed={selectedProduct.id === product.id} onClick={() => selectProduct(product.id)}><div className={`product-art art-${product.category.toLowerCase().replace(/[^a-z]/g, "-")}`}><span>{product.category === "Beauty" ? "01" : product.category === "Fashion" ? "02" : product.category === "Pantry" ? "03" : "04"}</span></div><div className="product-copy"><OriginBadge origin={product.origin} /><h3>{product.name}</h3><p>{product.producer}</p><strong>{product.priceMinor ? formatMoney(product.priceMinor, product.currency) : "Roadmap only"}</strong></div></button>)}</div>{products.length === 0 && <div className="panel-empty"><Search size={28} aria-hidden="true" /><strong>No products match this view</strong><p>Try another search or clear the category filter.</p><button type="button" className="small-action" onClick={() => { setSearch(""); setCategory("All"); }}>Clear filters</button></div>}</div>
      <div className="detail-column"><div className="detail-panel"><div className="detail-art"><span>{selectedProduct.category}</span><strong>{selectedProduct.name.split(" ").slice(0, 2).join(" ")}</strong></div><div className="detail-content"><OriginBadge origin={selectedProduct.origin} /><h3>{selectedProduct.name}</h3><p>{selectedProduct.description}</p><div className="detail-facts"><div><small>Producer</small><strong>{selectedProduct.producer}</strong></div><div><small>Fulfilment</small><strong>{selectedProduct.stockLabel}</strong></div><div><small>Batch / expiry</small><strong>{selectedProduct.batch} · {selectedProduct.expiry}</strong></div></div>{selectedProduct.transformation && <div className="evidence-strip"><ShieldCheck size={15} aria-hidden="true" /><span><strong>Transformation recorded</strong><small>{selectedProduct.transformation}</small></span></div>}{selectedProduct.ingredients && <p className="ingredients"><strong>Ingredients</strong> {selectedProduct.ingredients}</p>}{selectedProduct.purchasable && selectedProduct.market === "NG" && <fieldset className="checkout-address"><legend>Delivery details</legend><label htmlFor="recipient-name">Recipient name</label><input id="recipient-name" name="recipient-name" type="text" autoComplete="name" spellCheck={false} aria-invalid={addressAttempted && Boolean(addressErrors.recipientName)} aria-describedby={addressAttempted && addressErrors.recipientName ? "recipient-name-error" : undefined} value={address.recipientName} onChange={(event) => setAddress({ ...address, recipientName: event.target.value })} />{addressAttempted && addressErrors.recipientName && <p id="recipient-name-error" className="field-error">{addressErrors.recipientName}</p>}<label htmlFor="address-line">Delivery address</label><input id="address-line" name="address-line" type="text" autoComplete="street-address" spellCheck={false} aria-invalid={addressAttempted && Boolean(addressErrors.addressLine)} aria-describedby={addressAttempted && addressErrors.addressLine ? "address-line-error" : undefined} value={address.addressLine} onChange={(event) => setAddress({ ...address, addressLine: event.target.value })} />{addressAttempted && addressErrors.addressLine && <p id="address-line-error" className="field-error">{addressErrors.addressLine}</p>}<label htmlFor="delivery-city">City</label><input id="delivery-city" name="delivery-city" type="text" autoComplete="address-level2" spellCheck={false} aria-invalid={addressAttempted && Boolean(addressErrors.city)} aria-describedby={addressAttempted && addressErrors.city ? "delivery-city-error" : undefined} value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} />{addressAttempted && addressErrors.city && <p id="delivery-city-error" className="field-error">{addressErrors.city}</p>}<p className="field-help">Nigeria · NGN · illustrative delivery details</p></fieldset>}{selectedProduct.purchasable && selectedProduct.market === "NG" && <div className="quote-summary" aria-live="polite">{quoteLoading ? <span>Calculating server quote…</span> : quoteError ? <span className="quote-error" role="alert">{quoteError}</span> : quote ? <><span>Server quote <strong>{formatMoney(quote.totalMinor, quote.currency)}</strong></span><small>Includes illustrative tax/duty treatment and delivery.</small></> : <span>Server quote unavailable. Retry the connection.</span>}</div>}<div className="purchase-row"><div className="quantity-control"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">−</button><span>{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))} aria-label="Increase quantity">+</button></div><strong className="detail-price">{selectedProduct.priceMinor ? formatMoney(selectedProduct.priceMinor * quantity, selectedProduct.currency) : "Not available"}</strong></div>{selectedProduct.purchasable && selectedProduct.market === "NG" && <button className="primary-button wide" type="button" onClick={pay} disabled={busy || Boolean(state.order) || quoteLoading || !quote} aria-busy={busy}>{busy ? "Verifying payment…" : quoteLoading ? "Calculating quote…" : state.order ? "Order created · see tracking" : "Buy in test mode"}<CreditCard size={16} aria-hidden="true" /></button>}{selectedProduct.purchasable && selectedProduct.market !== "NG" && <div className="disabled-note">This prototype’s checkout is scoped to Nigeria.</div>}{selectedProduct.origin === "marketplace_future" && <div className="disabled-note">Marketplace settlement is future-only in this prototype.</div>}</div></div></div>
      {isDeepOrder && state.order && quote && <OrderCard state={state} quote={quote} />}
    </div>
  </>;
}

function OrderCard({ state, quote }: { state: DemoState; quote: Quote }) { return <div className="order-card"><div className="order-card-header"><div><p className="eyebrow">Deep order · {state.order?.reference}</p><h3>Ghana → Nigeria, in one view.</h3></div><Badge tone="green">{state.order?.status.replace("_", " ")}</Badge></div><div className="order-price-lines"><span>Product <strong>{formatMoney(quote.subtotalMinor, "NGN")}</strong></span><span>Illustrative tax/duty treatment <strong>{formatMoney(quote.taxMinor, "NGN")}</strong></span><span>Delivery <strong>{formatMoney(quote.deliveryMinor, "NGN")}</strong></span><span className="total-line">Total <strong>{formatMoney(quote.totalMinor, "NGN")}</strong></span></div>{state.order?.address && <p className="order-address"><strong>Deliver to</strong> {state.order.address.recipientName} · {state.order.address.addressLine}, {state.order.address.city}</p>}<div className="timeline">{state.orderEvents.map((event) => <div className={event.complete ? "timeline-item complete" : "timeline-item"} key={event.status}><span className="timeline-dot">{event.complete && <Check size={11} aria-hidden="true" />}</span><span><strong>{event.label}</strong><small>{event.detail}</small></span></div>)}</div></div>; }

function OperationsSurface({ state, mutate, busy }: { state: DemoState; mutate: (url: string, options?: RequestInit, success?: string) => Promise<void>; busy: boolean }) { const ref = state.order?.reference; return <><SectionTitle eyebrow="Operations · Lekki" title="Make the handoffs legible." detail="Warehouse tasks · FEFO allocation · Shared order state" />{!state.order ? <div className="panel-empty large"><Warehouse size={30} aria-hidden="true" /><strong>Waiting for a paid order</strong><p>Complete the Nigerian shea checkout to activate the operator workspace.</p></div> : <div className="operations-grid"><div className="panel task-panel"><div className="panel-header"><div><p className="eyebrow">Warehouse task list</p><h3>{state.order.reference}</h3></div><Badge tone={state.order.status === "paid" ? "amber" : "green"}>{state.order.status.replace("_", " ")}</Badge></div>{state.tasks.map((task, index) => <div key={task.label} className={task.done ? "task-row done" : "task-row"}><span className="task-check">{task.done && <Check size={14} aria-hidden="true" />}</span><span><strong>{task.label}</strong><small>{task.detail}</small></span>{index === 1 && state.order?.status === "paid" && <button type="button" className="small-action" disabled={busy} onClick={() => mutate(`/api/fulfilment/orders/${ref}/allocate`, { method: "POST" }, "FEFO allocated NK-SB-2407: earliest valid stock, no negative balance.")}>Allocate</button>}{index === 2 && state.order?.status === "allocated" && <button type="button" className="small-action" disabled={busy} onClick={() => mutate(`/api/orders/${ref}/advance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "picked" }) }, "Pick confirmed by scan.")}>Confirm</button>}{index === 3 && state.order?.status === "picked" && <button type="button" className="small-action" disabled={busy} onClick={() => mutate(`/api/orders/${ref}/advance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "packed" }) }, "Pack complete: weight captured for routing.")}>Confirm</button>}{index === 4 && state.order?.status === "packed" && <button type="button" className="small-action" disabled={busy} onClick={() => mutate(`/api/orders/${ref}/advance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "dispatched" }) }, "Parcel dispatched to simulated last-mile delivery.")}>Dispatch</button>}</div>)}</div><div className="panel"><div className="panel-header"><div><p className="eyebrow">Inventory truth</p><h3>FEFO decision</h3></div><Weight size={19} aria-hidden="true" /></div><div className="batch-table"><div className="batch-head"><span>Batch</span><span>Expiry</span><span>Decision</span></div>{state.batches.map((batch) => <div key={batch.id} className="batch-row"><span><strong>{batch.batch}</strong><small>{batch.quantity - batch.allocated} units · {batch.site}</small></span><span>{batch.expiry}</span><span>{batch.expiry < "2026-08-29" ? <Badge tone="amber">Expired · reject</Badge> : batch.quarantined ? <Badge tone="amber">Quarantined</Badge> : batch.allocated ? <Badge tone="green">Allocated</Badge> : <Badge>Eligible</Badge>}</span></div>)}</div></div><div className="panel transfer-panel"><div className="panel-header"><div><p className="eyebrow">Trade history</p><h3>Auditable Ghana → Lekki movement</h3></div><Truck size={19} aria-hidden="true" /></div><div className="transfer-line">{state.transfer.map((step) => <div className="transfer-step" key={step.label}><span className="transfer-dot"><Check size={12} aria-hidden="true" /></span><span><strong>{step.label}</strong><small>{step.detail}</small></span></div>)}</div></div></div>}</> }

function ComplianceSurface({ state }: { state: DemoState }) { return <><SectionTitle eyebrow="Compliance · provisional" title="Evidence before origin claims." detail="Illustrative assessment · Watermarked preview · No legal certificate" /><div className="compliance-grid"><div className="panel origin-panel"><div className="assessment-status"><span className="assessment-icon"><ShieldCheck size={20} aria-hidden="true" /></span><span><small>Assessment status</small><strong>Provisionally eligible</strong></span><Badge tone="amber">Demo only</Badge></div><div className="origin-rule"><strong>Why this qualifies</strong><p>{state.compliance.transformation}</p></div><h3>Evidence chain</h3>{state.compliance.evidence.map((item, index) => <div className="evidence-row" key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong><Check size={15} aria-hidden="true" /></div>)}<div className="rejection-note"><CircleAlert size={15} aria-hidden="true" /><span>Repackaging or relabelling alone would produce a rejected assessment.</span></div></div><div className="certificate-card"><div className="watermark">{state.compliance.certificateWatermark}</div><div className="certificate-head"><FileCheck2 size={22} aria-hidden="true" /><span>Origin assessment preview</span></div><p className="certificate-kicker">ECOWAS / AfCFTA · Illustrative</p><h3>Ghana-origin export record</h3><div className="certificate-fields"><span>Product <strong>Nokware shea repair balm</strong></span><span>Batch <strong>NK-SB-2407</strong></span><span>Movement <strong>Tema → Lekki</strong></span><span>Duty quote <strong>{state.compliance.dutyQuote}</strong></span></div><div className="certificate-footer"><span>Preview only</span><span>Not valid for customs</span></div></div></div></> }

function DeliverySurface({ state, mutate, busy }: { state: DemoState; mutate: (url: string, options?: RequestInit, success?: string) => Promise<void>; busy: boolean }) { const ref = state.order?.reference; const sortie = state.sortie; const deliveryReady = state.order?.status === "dispatched"; return <><SectionTitle eyebrow="Delivery · simulated digital twin" title="Safety gates the last mile." detail="Lekki → fictional micro-hub · Static route · No real aircraft" />{!state.order ? <div className="panel-empty large"><Plane size={30} aria-hidden="true" /><strong>Waiting for a packed order</strong><p>The delivery twin activates after the operator packs the shea parcel.</p></div> : <div className="delivery-grid"><div className="map-panel"><div className="map-top"><span><Map size={16} aria-hidden="true" /> Static route preview</span><Badge tone="amber">Simulated</Badge></div><MapboxRoutePreview /><TelemetryReadout sortie={sortie} /></div><div className="panel gate-panel"><div className="panel-header"><div><p className="eyebrow">Preflight decision</p><h3>{sortie.status.replace("_", " ")}</h3></div><Fuel size={19} aria-hidden="true" /></div><div className="gate-list">{sortie.gates.map((gate) => <div className={gate.passed ? "gate-row passed" : "gate-row failed"} key={gate.key}><span>{gate.passed ? <Check size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />}</span><span><strong>{gate.label}</strong><small>{gate.detail}</small></span></div>)}</div>{!deliveryReady && <p className="disabled-note">Delivery controls unlock after the warehouse dispatches the packed order.</p>}<div className="delivery-actions">{sortie.status === "draft" && <button type="button" className="primary-button wide" disabled={busy || !deliveryReady} aria-busy={busy} onClick={() => mutate(`/api/delivery/sorties/${ref}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "preflight" }) }, "All safety gates passed. Mission cleared for the demo.")}>Run preflight <ArrowRight size={16} aria-hidden="true" /></button>}{sortie.status === "cleared" && <button type="button" className="primary-button wide" disabled={busy || !deliveryReady} aria-busy={busy} onClick={() => mutate(`/api/delivery/sorties/${ref}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "launch" }) }, "Mission launched. Telemetry playback is running.")}>Launch simulated sortie <Plane size={16} aria-hidden="true" /></button>}<button type="button" className="weather-button" disabled={busy || !deliveryReady} aria-busy={busy} onClick={() => mutate(`/api/delivery/sorties/${ref}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: sortie.weather === "unsafe" ? "reset_weather" : "inject_weather" }) }, sortie.weather === "unsafe" ? "Weather cleared; sortie reset for another demo run." : "Unsafe weather locked out flight and created a courier fallback.")}>{sortie.weather === "unsafe" ? <RefreshCw size={15} aria-hidden="true" /> : <CloudRain size={15} aria-hidden="true" />}{sortie.weather === "unsafe" ? "Clear weather injection" : "Inject unsafe weather"}</button>{(sortie.status === "launched" || sortie.status === "en_route") && <button type="button" className="weather-button" disabled={busy} aria-busy={busy} onClick={() => mutate(`/api/delivery/sorties/${ref}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "fallback" }) }, "Manual override created a ground-courier handover.")}>Hand off to ground courier <Truck size={15} aria-hidden="true" /></button>}</div>{sortie.fallbackReason && <div className="fallback-note"><Truck size={15} aria-hidden="true" /><span><strong>Ground-courier fallback</strong><small>{sortie.fallbackReason}</small></span></div>}</div></div>}</> }

function TelemetryReadout({ sortie }: { sortie: DemoState["sortie"] }) {
  const [pointIndex, setPointIndex] = useState(0);
  const points = sortie.telemetry;

  useEffect(() => {
    if (points.length <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setPointIndex((current) => Math.min(current + 1, points.length - 1)), 900);
    return () => window.clearInterval(timer);
  }, [points]);

  const point = points[Math.min(pointIndex, Math.max(points.length - 1, 0))];
  return <div className="telemetry-row" role="group" aria-label="Simulated telemetry"><span><strong>{point?.altitude ?? 0}m</strong><small>Altitude</small></span><span><strong>{point?.speed ?? 0}km/h</strong><small>Speed</small></span><span><strong>{point?.battery ?? 94}%</strong><small>Battery</small></span><span><strong>{point?.link ?? "Ready"}</strong><small>{point?.point ?? "Awaiting launch"}</small></span></div>;
}

function MapboxRoutePreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current) return;
    let disposed = false;
    let map: import("mapbox-gl").Map | null = null;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed || !containerRef.current) return;
      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({ container: containerRef.current, style: "mapbox://styles/mapbox/light-v11", center: [3.55, 6.45], zoom: 10, attributionControl: true });
      map.on("error", () => { if (!disposed) setMapError(true); });
      map.on("load", () => {
        if (!map || disposed) return;
        map.addSource("korama-demo-route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[3.49, 6.43], [3.57, 6.48], [3.64, 6.54]] } } });
        map.addLayer({ id: "korama-demo-route-line", type: "line", source: "korama-demo-route", paint: { "line-color": "#136b50", "line-width": 4, "line-dasharray": [1.5, 1] } });
        setMapReady(true);
      });
    }).catch(() => { if (!disposed) setMapError(true); });
    return () => { disposed = true; map?.remove(); };
  }, [token]);

  if (!token || mapError) return <StaticRoutePreview fallback={mapError} />;
  return <div className="route-map mapbox-route" ref={containerRef} role="img" aria-label="Mapbox static simulated route">{!mapReady && <div className="map-loading">Loading optional Mapbox route…</div>}<div className="map-caption"><span>Static route data · simulated</span><span>Mapbox token configured</span></div></div>;
}

function StaticRoutePreview({ fallback = false }: { fallback?: boolean }) { return <div className="route-map" role="img" aria-label="Static simulated route from Lekki to fictional micro-hub"><div className="map-grid" /><div className="route-path"><span className="map-node start">Lekki</span><span className="map-node mid">Waypoint</span><span className="map-node end">Micro-hub</span></div><div className="map-caption"><span>Route data is seeded for presentation</span><span>{fallback ? "Mapbox unavailable · static fallback" : "Mapbox token optional"}</span></div></div>; }

function DeliveryCompletionButton({ state, mutate, busy }: { state: DemoState; mutate: (url: string, options?: RequestInit, success?: string) => Promise<void>; busy: boolean }) { if (!state.order || state.sortie.status !== "en_route") return null; return <div className="delivery-complete-bar"><span><PackageCheck size={18} aria-hidden="true" /><strong>Telemetry reached the fictional micro-hub.</strong></span><button type="button" className="primary-button" disabled={busy} onClick={() => mutate(`/api/delivery/sorties/${state.order?.reference}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "complete" }) }, "Drop confirmed. Order delivered in the simulated journey.")}>Confirm drop <Check size={15} aria-hidden="true" /></button></div> }

function MarketsSurface() { return <><SectionTitle eyebrow="Market horizon" title="Start narrow. Build the corridor." detail="Only Ghana and Nigeria transact in this prototype." /><div className="panel markets-panel"><div className="market-horizon-intro"><div className="horizon-number">01</div><div><h3>Two active markets, one operating model.</h3><p>Every new market needs its own currency, tax, duty, localization, port, and launch review. Francophone entry explicitly requires French localization.</p></div></div><div className="horizon-table">{marketRows.map((row) => <div key={row.code} className={row.status === "Transacting" ? "horizon-row active" : "horizon-row"}><span className="horizon-code">{row.code}</span><span><strong>{row.name}</strong><small>{row.detail}</small></span><span>{row.phase}</span><Badge tone={row.status === "Transacting" ? "green" : "neutral"}>{row.status}</Badge></div>)}</div></div><div className="shallow-grid"><div className="shallow-card"><Sparkles size={18} aria-hidden="true" /><h3>Rule-based curation</h3><p>Explains why shea is surfaced for this guided Nigerian consumer. No trained AI model is running.</p></div><div className="shallow-card"><Database size={18} aria-hidden="true" /><h3>B2B preview</h3><p>Bulk pricing and MOQ unlock after business registry verification in a later capability.</p></div><div className="shallow-card"><PackageCheck size={18} aria-hidden="true" /><h3>Returns + ratings</h3><p>Shallow workflow boundary; refunds and marketplace settlement are not enabled.</p></div></div></> }

function CapabilityLab({ state }: { state: DemoState }) {
  const [curationOpen, setCurationOpen] = useState(false);
  const [b2bOpen, setB2bOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [returnRequested, setReturnRequested] = useState(false);
  const [roadmapMarket, setRoadmapMarket] = useState("Côte d’Ivoire");
  const hasOrder = Boolean(state.order);
  const orderDelivered = state.order?.status === "delivered";
  return <section className="capability-lab" aria-labelledby="capability-title">
    <SectionTitle eyebrow="Shallow capabilities" title="Useful edges, deliberately bounded." detail="Session-only demo actions · no refunds, settlement, or production AI" />
    <div className="shallow-grid">
      <div className="shallow-card"><Sparkles size={18} aria-hidden="true" /><h3 id="capability-title">Rule-based curation</h3><p>Surface products from market, origin, category, and stock signals.</p><button type="button" className="small-action" onClick={() => setCurationOpen((open) => !open)}>{curationOpen ? "Hide explanation" : "Why this product?"}</button>{curationOpen && <p className="capability-result">Nokware is prioritized because it is Nigerian-market stock, Ghana-origin, batch-supported, and aligned to the Beauty category.</p>}</div>
      <div className="shallow-card"><Database size={18} aria-hidden="true" /><h3>B2B pricing preview</h3><p>Show a future bulk-buy path without opening business checkout.</p><button type="button" className="small-action" onClick={() => setB2bOpen((open) => !open)}>{b2bOpen ? "Hide preview" : "Preview bulk tier"}</button>{b2bOpen && <p className="capability-result">MOQ 24 units · indicative 8% volume adjustment · registry verification required before activation.</p>}</div>
      <div className="shallow-card"><PackageCheck size={18} aria-hidden="true" /><h3>Ratings + returns</h3>{!hasOrder ? <><p>These controls appear after a demo order exists.</p><span className="disabled-note">Empty state · no order to review</span></> : !orderDelivered ? <><p>Review controls unlock after the simulated delivery is confirmed.</p><span className="disabled-note">Waiting for delivered status</span><button type="button" className="small-action" disabled>Request return review</button></> : <>{!ratingSaved ? <><p>Rate the demo order after delivery.</p><div className="rating-row" aria-label="Rate demo order" role="group">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={rating >= value ? "rating-button active" : "rating-button"} aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} onClick={() => setRating(value)}>★</button>)}</div><button type="button" className="small-action" disabled={!rating} onClick={() => setRatingSaved(true)}>Save rating</button></> : <p className="capability-result">Rating saved for this session. No public review was published.</p>}<button type="button" className="small-action" onClick={() => setReturnRequested(true)} disabled={returnRequested}>{returnRequested ? "Return request noted" : "Request return review"}</button>{returnRequested && <p className="capability-result">Request captured for operator review. No refund or settlement was triggered.</p>}</>}</div>
    </div>
    <div className="roadmap-explorer"><div><p className="eyebrow">Roadmap market explorer</p><h3>Explore a future launch gate</h3><p>Every new market stays browse-only until localization, currency, tax, duty, and operating-company checks are complete.</p></div><label>Market<select value={roadmapMarket} onChange={(event) => setRoadmapMarket(event.target.value)}><option>Côte d’Ivoire</option><option>Senegal</option><option>Togo + Benin</option><option>Guinea</option></select></label><div className="capability-result"><strong>{roadmapMarket}</strong> · Roadmap · French localization required · no checkout enabled.</div></div>
  </section>;
}
