import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createNormalizedRepository } from "../lib/supabase/normalized-repository.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.log("normalized mutation check skipped (set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run it)");
  process.exit(0);
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(?::\d+)?$/i.test(url) && process.env.KORAMA_ALLOW_NORMALIZED_MUTATION_CHECK !== "true") {
  throw new Error("Normalized mutation checks are limited to a local Supabase URL unless KORAMA_ALLOW_NORMALIZED_MUTATION_CHECK=true is explicit");
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const repository = createNormalizedRepository(admin);
const reference = "KOR-NORMALIZED-" + Date.now();
const email = "normalized-" + Date.now() + "@example.test";
const password = "KoramaNormalized-" + Date.now() + "-test";
let userId;
let orderId;
let allocatedBatchId;
const quantity = 1;

async function cleanup() {
  if (orderId) {
    const shipments = await admin.from("shipments").select("id").eq("order_id", orderId);
    for (const shipment of shipments.data ?? []) {
      const sorties = await admin.from("sorties").select("id").eq("shipment_id", shipment.id);
      for (const sortie of sorties.data ?? []) await admin.from("sortie_events").delete().eq("sortie_id", sortie.id);
      await admin.from("sorties").delete().eq("shipment_id", shipment.id);
      await admin.from("delivery_legs").delete().eq("shipment_id", shipment.id);
      await admin.from("shipments").delete().eq("id", shipment.id);
    }
    await admin.from("inventory_movements").delete().eq("order_id", orderId);
    await admin.from("warehouse_tasks").delete().eq("order_id", orderId);
    if (allocatedBatchId) {
      const batch = await admin.from("inventory_batches").select("allocated").eq("id", allocatedBatchId).single();
      const balance = await admin.from("inventory_balances").select("available_quantity,reserved_quantity").eq("batch_id", allocatedBatchId).single();
      if (batch.data && balance.data) {
        await admin.from("inventory_batches").update({ allocated: Math.max(0, batch.data.allocated - quantity) }).eq("id", allocatedBatchId);
        await admin.from("inventory_balances").update({ available_quantity: balance.data.available_quantity + quantity, reserved_quantity: Math.max(0, balance.data.reserved_quantity - quantity) }).eq("batch_id", allocatedBatchId);
      }
    }
    await admin.from("orders").delete().eq("id", orderId);
  }
  if (userId) await admin.auth.admin.deleteUser(userId);
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("Could not create normalized mutation test identity");
  userId = created.data.user.id;
  const profile = await admin.from("profiles").insert({
    id: userId,
    display_name: "Normalized mutation test",
    operating_company_id: "10000000-0000-0000-0000-000000000002",
    market_id: "20000000-0000-0000-0000-000000000002",
  });
  if (profile.error) throw profile.error;

  const createdOrder = await repository.createOrder({
    profileId: userId,
    reference,
    operatingCompanyId: "10000000-0000-0000-0000-000000000002",
    marketId: "20000000-0000-0000-0000-000000000002",
    productId: "30000000-0000-0000-0000-000000000001",
    quantity,
    currency: "NGN",
    subtotalMinor: 485000,
    taxMinor: 36375,
    deliveryMinor: 450000,
    totalMinor: 971375,
    deliveryAddress: { recipientName: "Amina Okafor", addressLine: "12 Admiralty Way", city: "Lagos", countryCode: "NG" },
  });
  const createdOrderRow = createdOrder.order;
  assert.ok(createdOrderRow && typeof createdOrderRow === "object" && "id" in createdOrderRow);
  orderId = createdOrderRow.id;
  assert.equal(createdOrderRow.status, "pending_payment");

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey) {
    const anonymous = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const denied = await anonymous.rpc("korama_allocate_order_fefo", { p_order_reference: reference });
    assert.ok(denied.error, "anonymous callers must not execute normalized mutations");
  }

  const providerReference = "PSK-NORMALIZED-" + Date.now();
  const paymentKey = "normalized-payment-" + Date.now();
  const verified = await repository.verifyPayment(orderId, providerReference, 971375, "NGN", paymentKey);
  assert.equal(verified.order.status, "paid");
  const duplicate = await repository.verifyPayment(orderId, providerReference, 971375, "NGN", paymentKey + "-duplicate");
  assert.equal(duplicate.idempotent, true);
  await assert.rejects(() => repository.verifyPayment(orderId, providerReference, 1, "NGN", paymentKey + "-invalid"), /does not match/);

  const allocation = await repository.allocateOrderFefo(reference);
  assert.equal(allocation.order.status, "allocated");
  assert.equal(allocation.batch.reference, "NK-SB-2407");
  allocatedBatchId = allocation.batch.id;

  assert.equal((await repository.advanceOrder(reference, "picked")).order.status, "picked");
  assert.equal((await repository.advanceOrder(reference, "packed", 180)).order.status, "packed");
  const dispatched = await repository.advanceOrder(reference, "dispatched", 180);
  assert.equal(dispatched.order.status, "dispatched");
  assert.ok(dispatched.shipment && typeof dispatched.shipment === "object" && "id" in dispatched.shipment);

  const locked = await repository.commandSortie(reference, "inject_weather");
  assert.equal(locked.sortie.status, "lockout");
  assert.equal(locked.shipment.status, "fallback");
  const reset = await repository.commandSortie(reference, "reset_weather");
  assert.equal(reset.sortie.status, "draft");
  assert.equal(reset.shipment.status, "in_transit");
  assert.equal((await repository.commandSortie(reference, "preflight")).sortie.status, "cleared");
  assert.equal((await repository.commandSortie(reference, "launch")).sortie.status, "launched");
  assert.equal((await repository.commandSortie(reference, "advance")).sortie.status, "en_route");
  const delivered = await repository.commandSortie(reference, "complete");
  assert.equal(delivered.sortie.status, "delivered");
  assert.equal(delivered.shipment.status, "delivered");
  assert.equal(delivered.order.status, "delivered");

  const view = await repository.getOrderView(reference, userId);
  assert.ok(view);
  assert.equal(view.order.delivery_address_snapshot.countryCode, "NG");
  assert.equal(view.paymentAttempts.length, 1);
  assert.equal(view.deliveryLegs.length, 2);
  assert.equal(view.shipment?.status, "delivered");
  console.log("normalized mutation pass: atomic order, payment idempotency, FEFO, fulfilment, weather fallback, and sortie lifecycle");
} finally {
  await cleanup();
}
