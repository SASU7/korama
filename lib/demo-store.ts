import { calculateQuote, DemoState, getProduct, markOrder, seedDemoState } from "@/lib/domain";

const globalStore = globalThis as typeof globalThis & { __koramaDemo?: DemoState };
export function demoStore() { globalStore.__koramaDemo ??= seedDemoState(); return globalStore.__koramaDemo; }
export function resetDemoStore() { globalStore.__koramaDemo = seedDemoState(); return globalStore.__koramaDemo; }
export function createDemoOrder(productId: string, quantity: number) {
  const state = demoStore();
  const product = getProduct(state, productId);
  if (!product.purchasable) throw new Error("This listing is roadmap-only");
  if (product.market !== "NG") throw new Error("The deep demo order is scoped to Nigeria");
  const quote = calculateQuote(state, productId, quantity);
  state.cart = [{ productId, quantity }];
  state.order = { reference: "KOR-NG-240829-001", status: "pending_payment", productId, quantity, ...quote };
  state.orderEvents = seedDemoState().orderEvents;
  state.orderEvents[0].complete = true;
  state.orderEvents[0].at = new Date().toISOString();
  state.lastMutation = new Date().toISOString();
  return state.order;
}
export function verifyDemoPayment(paymentReference: string, amountMinor: number, currency: string) {
  const state = demoStore();
  if (!state.order) throw new Error("No pending order exists");
  if (state.order.status !== "pending_payment") {
    if (state.order.paymentReference !== paymentReference || state.order.totalMinor !== amountMinor || state.order.currency !== currency) throw new Error("Duplicate payment does not match the original verified payment");
    return state.order;
  }
  if (state.order.totalMinor !== amountMinor || state.order.currency !== currency) throw new Error("Payment amount or currency does not match the server quote");
  state.order.paymentReference = paymentReference;
  markOrder(state, "paid");
  state.lastMutation = new Date().toISOString();
  return state.order;
}
