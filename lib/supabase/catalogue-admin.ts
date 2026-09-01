import "server-only";

import { adminClient } from "@/lib/supabase/admin-client";
import { CATALOGUE_BUCKET, catalogueStoragePath } from "@/lib/product-image";
import type { AdminProductRow, ProductDraft } from "@/lib/catalogue-types";

export type { AdminProductRow, ProductDraft };
export { CATEGORIES } from "@/lib/catalogue-types";

/**
 * Catalogue writes.
 *
 * Everything here uses the service-role client, so it bypasses RLS. That is
 * deliberate and safe only because the caller is a server action behind the
 * `administrator` role check — never import this from a client component.
 */

export const MARKETS = [
  { code: "NG", id: "20000000-0000-0000-0000-000000000002", operatingCompanyId: "10000000-0000-0000-0000-000000000002", currency: "NGN" },
  { code: "GH", id: "20000000-0000-0000-0000-000000000001", operatingCompanyId: "10000000-0000-0000-0000-000000000001", currency: "GHS" },
] as const;

export async function listAdminProducts(): Promise<AdminProductRow[]> {
  const client = adminClient();
  const [{ data: products }, { data: listings }, { data: media }, { data: batches }, { data: markets }] =
    await Promise.all([
      client.from("products").select("*").order("name"),
      client.from("market_listings").select("*"),
      client.from("media").select("product_id, storage_path, sort_order").order("sort_order"),
      client.from("inventory_batches").select("product_id"),
      client.from("markets").select("id, code, currency"),
    ]);

  return (products ?? []).map((product) => {
    const listing = (listings ?? []).find((row) => row.product_id === product.id);
    const market = (markets ?? []).find((row) => row.id === listing?.market_id);
    return {
      id: product.id,
      reference: product.reference,
      name: product.name,
      producer: product.producer,
      category: product.category,
      inventoryClass: product.inventory_class,
      weightGrams: product.weight_grams,
      marketCode: market?.code ?? "—",
      currency: listing?.currency ?? market?.currency ?? "",
      priceMinor: listing?.price_minor ?? 0,
      purchasable: listing?.purchasable ?? false,
      imagePath:
        (media ?? []).find((row) => row.product_id === product.id)?.storage_path ?? null,
      batchCount: (batches ?? []).filter((row) => row.product_id === product.id).length,
    };
  });
}

export async function readAdminProduct(id: string): Promise<ProductDraft | null> {
  const client = adminClient();
  const { data: product } = await client.from("products").select("*").eq("id", id).maybeSingle();
  if (!product) return null;

  const [{ data: listing }, { data: variant }, { data: markets }] = await Promise.all([
    client.from("market_listings").select("*").eq("product_id", id).maybeSingle(),
    client.from("variants").select("*").eq("product_id", id).maybeSingle(),
    client.from("markets").select("id, code"),
  ]);
  const marketCode = (markets ?? []).find((row) => row.id === listing?.market_id)?.code;
  const attributes = (product.attributes ?? {}) as Record<string, unknown>;

  return {
    id: product.id,
    reference: product.reference,
    name: product.name,
    producer: product.producer,
    description: product.description,
    category: product.category,
    inventoryClass: product.inventory_class,
    weightGrams: product.weight_grams,
    ingredients: String(attributes.ingredients ?? ""),
    transformation: String(attributes.transformation ?? ""),
    marketCode: marketCode === "NG" ? "NG" : "GH",
    priceMinor: listing?.price_minor ?? 0,
    purchasable: listing?.purchasable ?? true,
    variantName: variant?.name ?? "",
    sku: variant?.sku ?? "",
  };
}

/** Create or update a product with its listing and variant, in one call. */
export async function saveProduct(draft: ProductDraft): Promise<string> {
  const client = adminClient();
  const market = MARKETS.find((row) => row.code === draft.marketCode) ?? MARKETS[0];

  const attributes: Record<string, string> = {};
  if (draft.ingredients.trim()) attributes.ingredients = draft.ingredients.trim();
  if (draft.transformation.trim()) attributes.transformation = draft.transformation.trim();

  const payload = {
    reference: draft.reference,
    name: draft.name,
    producer: draft.producer,
    description: draft.description,
    category: draft.category,
    inventory_class: draft.inventoryClass,
    weight_grams: draft.weightGrams,
    attributes,
  };

  let productId = draft.id;
  if (productId) {
    const { error } = await client.from("products").update(payload).eq("id", productId);
    if (error) throw new Error(`Product update failed: ${error.message}`);
  } else {
    const { data, error } = await client.from("products").insert(payload).select("id").single();
    if (error) throw new Error(`Product create failed: ${error.message}`);
    productId = data.id;
  }

  // market_listings is unique on (product_id, market_id), so a market change
  // has to clear the old row rather than upsert on top of it.
  await client.from("market_listings").delete().eq("product_id", productId);
  const { error: listingError } = await client.from("market_listings").insert({
    product_id: productId,
    market_id: market.id,
    operating_company_id: market.operatingCompanyId,
    currency: market.currency,
    price_minor: draft.priceMinor,
    purchasable: draft.purchasable,
  });
  if (listingError) throw new Error(`Listing save failed: ${listingError.message}`);

  if (draft.variantName.trim() || draft.sku.trim()) {
    await client.from("variants").delete().eq("product_id", productId);
    const { error: variantError } = await client.from("variants").insert({
      product_id: productId,
      reference: `${draft.reference}-V1`,
      name: draft.variantName.trim() || "Standard",
      sku: draft.sku.trim() || `${draft.reference}-001`,
    });
    if (variantError) throw new Error(`Variant save failed: ${variantError.message}`);
  }

  return productId;
}

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};

/**
 * Upload a product photograph to the public `catalogue` bucket and point the
 * product's media row at it.
 *
 * The object name is derived from the product reference plus a short hash, so
 * re-uploading replaces cleanly and a stale CDN copy cannot mask a new image.
 */
export async function uploadProductImage(
  productId: string,
  reference: string,
  file: File,
): Promise<string> {
  const extension = EXTENSIONS[file.type];
  if (!extension)
    throw new Error(`Unsupported image type ${file.type}. Use WebP, JPEG, PNG or AVIF.`);
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");

  const client = adminClient();
  const objectName = `${reference.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}.${extension}`;

  const { error } = await client.storage
    .from(CATALOGUE_BUCKET)
    .upload(objectName, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const storagePath = catalogueStoragePath(objectName);

  // Remove the previous objects for this product so the bucket does not grow
  // a tail of orphans on every re-upload.
  const { data: previous } = await client
    .from("media")
    .select("id, storage_path")
    .eq("product_id", productId);
  const stale = (previous ?? [])
    .map((row) => row.storage_path)
    .filter((path) => path.startsWith(`${CATALOGUE_BUCKET}/`) && path !== storagePath)
    .map((path) => path.slice(CATALOGUE_BUCKET.length + 1));
  if (stale.length) await client.storage.from(CATALOGUE_BUCKET).remove(stale);

  await client.from("media").delete().eq("product_id", productId);
  const { error: mediaError } = await client.from("media").insert({
    product_id: productId,
    storage_path: storagePath,
    alt_text: reference,
    sort_order: 0,
  });
  if (mediaError) throw new Error(`Media record failed: ${mediaError.message}`);

  return storagePath;
}

export async function deleteProduct(productId: string) {
  const client = adminClient();
  const { data: batches } = await client
    .from("inventory_batches")
    .select("id")
    .eq("product_id", productId)
    .limit(1);
  if (batches?.length)
    throw new Error(
      "This product has inventory batches. Remove its stock before deleting it.",
    );

  const { data: media } = await client
    .from("media")
    .select("storage_path")
    .eq("product_id", productId);
  const objects = (media ?? [])
    .map((row) => row.storage_path)
    .filter((path) => path.startsWith(`${CATALOGUE_BUCKET}/`))
    .map((path) => path.slice(CATALOGUE_BUCKET.length + 1));
  if (objects.length) await client.storage.from(CATALOGUE_BUCKET).remove(objects);

  await client.from("media").delete().eq("product_id", productId);
  await client.from("variants").delete().eq("product_id", productId);
  await client.from("market_listings").delete().eq("product_id", productId);
  await client.from("market_prices").delete().eq("product_id", productId);
  const { error } = await client.from("products").delete().eq("id", productId);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
