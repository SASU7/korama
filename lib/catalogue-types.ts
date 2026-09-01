import type { InventoryClass } from "@/lib/domain";

/**
 * Shapes shared between the admin form (a client component) and the
 * server-only write layer. They live here rather than in
 * lib/supabase/catalogue-admin.ts so the client never imports a module
 * marked `server-only`, even for a type.
 */
export const CATEGORIES = ["Beauty", "Fashion", "Pantry", "Home & craft"] as const;

export type ProductDraft = {
  id?: string;
  reference: string;
  name: string;
  producer: string;
  description: string;
  category: string;
  inventoryClass: InventoryClass;
  weightGrams: number;
  ingredients: string;
  transformation: string;
  marketCode: "NG" | "GH";
  priceMinor: number;
  purchasable: boolean;
  variantName: string;
  sku: string;
};

export type AdminProductRow = {
  id: string;
  reference: string;
  name: string;
  producer: string;
  category: string;
  inventoryClass: InventoryClass;
  weightGrams: number;
  marketCode: string;
  currency: string;
  priceMinor: number;
  purchasable: boolean;
  imagePath: string | null;
  batchCount: number;
};
