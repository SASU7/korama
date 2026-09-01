"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdministrator } from "@/lib/auth-guards-admin";
import {
  deleteProduct,
  saveProduct,
  uploadProductImage,
  type ProductDraft,
} from "@/lib/supabase/catalogue-admin";

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** Naira and cedi are entered as major units; the database stores minor. */
function majorToMinor(value: string) {
  const amount = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error("Enter a price as a number, for example 4850");
  return Math.round(amount * 100);
}

function draftFrom(form: FormData): ProductDraft {
  const reference = text(form, "reference").toUpperCase();
  if (!/^[A-Z0-9-]{3,40}$/.test(reference))
    throw new Error("Reference must be 3–40 characters: A–Z, 0–9 and hyphens");
  const name = text(form, "name");
  if (name.length < 2) throw new Error("Enter a product name");
  const weight = Number(text(form, "weightGrams"));
  if (!Number.isInteger(weight) || weight < 1)
    throw new Error("Enter the weight in whole grams");

  return {
    id: text(form, "id") || undefined,
    reference,
    name,
    producer: text(form, "producer"),
    description: text(form, "description"),
    category: text(form, "category") || "Home & craft",
    inventoryClass: (text(form, "inventoryClass") || "direct_import") as ProductDraft["inventoryClass"],
    weightGrams: weight,
    ingredients: text(form, "ingredients"),
    transformation: text(form, "transformation"),
    marketCode: text(form, "marketCode") === "GH" ? "GH" : "NG",
    priceMinor: majorToMinor(text(form, "price")),
    purchasable: form.get("purchasable") === "on",
    variantName: text(form, "variantName"),
    sku: text(form, "sku"),
  };
}

export async function saveProductAction(
  _previous: SaveResult | null,
  form: FormData,
): Promise<SaveResult> {
  await requireAdministrator();
  let id: string;
  try {
    const draft = draftFrom(form);
    id = await saveProduct(draft);

    const image = form.get("image");
    if (image instanceof File && image.size > 0) {
      await uploadProductImage(id, draft.reference, image);
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The product could not be saved",
    };
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/shop/${id}`);
  redirect(`/admin/products?saved=${id}`);
}

export async function deleteProductAction(formData: FormData) {
  await requireAdministrator();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteProduct(id);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products?deleted=1");
}
