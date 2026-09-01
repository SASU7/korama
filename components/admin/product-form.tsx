"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { ImagePlus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveProductAction, type SaveResult } from "@/app/(admin)/admin/actions";
import { productImageSrc } from "@/lib/product-image";
import { CATEGORIES, type ProductDraft } from "@/lib/catalogue-types";



const CLASSES = [
  { value: "ghana_origin_export", label: "Ghana origin — produced or transformed in Ghana" },
  { value: "direct_import", label: "Direct import — third-country, cleared in the market of sale" },
  { value: "marketplace_future", label: "Roadmap listing — not purchasable" },
];

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p className="text-muted-foreground text-(length:--text-meta)">{hint}</p>
      )}
    </div>
  );
}

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : editing ? "Save changes" : "Create product"}
    </Button>
  );
}

export function ProductForm({
  draft,
  currentImagePath,
}: {
  draft?: ProductDraft;
  currentImagePath?: string | null;
}) {
  const [result, action] = useActionState<SaveResult | null, FormData>(
    saveProductAction,
    null,
  );
  const [preview, setPreview] = useState<string | null>(
    productImageSrc(currentImagePath),
  );
  const [inventoryClass, setInventoryClass] = useState(
    draft?.inventoryClass ?? "ghana_origin_export",
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = Boolean(draft?.id);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {draft?.id && <input type="hidden" name="id" value={draft.id} />}

      <div className="flex flex-col gap-4">
        {result && !result.ok && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-[0.9375rem]">Product</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="reference"
                label="Reference"
                hint="Uppercase code used on batches and certificates, e.g. NK-SHEA-BALM"
              >
                <Input
                  id="reference"
                  name="reference"
                  required
                  defaultValue={draft?.reference}
                  placeholder="NK-SHEA-BALM"
                />
              </Field>
              <Field id="name" label="Name">
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={draft?.name}
                  placeholder="Nokware shea repair balm"
                />
              </Field>
            </div>

            <Field id="producer" label="Producer">
              <Input
                id="producer"
                name="producer"
                defaultValue={draft?.producer}
                placeholder="Nokware Skincare · Ghana"
              />
            </Field>

            <Field id="description" label="Description">
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={draft?.description}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="category" label="Category">
                <Select name="category" defaultValue={draft?.category ?? "Beauty"}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                id="weightGrams"
                label="Weight (grams)"
                hint="Decides drone eligibility at checkout — the payload limit is 2000 g"
              >
                <Input
                  id="weightGrams"
                  name="weightGrams"
                  type="number"
                  min={1}
                  required
                  defaultValue={draft?.weightGrams ?? 180}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[0.9375rem]">Provenance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field id="inventoryClass" label="Class">
              <Select
                name="inventoryClass"
                value={inventoryClass}
                onValueChange={(value) =>
                  setInventoryClass(value as ProductDraft["inventoryClass"])
                }
              >
                <SelectTrigger id="inventoryClass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {inventoryClass === "ghana_origin_export" && (
              <Field
                id="transformation"
                label="Transformation in Ghana"
                hint="What was actually done here. Repackaging or relabelling alone does not establish origin, and the assessor will reject it."
              >
                <Textarea
                  id="transformation"
                  name="transformation"
                  rows={2}
                  defaultValue={draft?.transformation}
                  placeholder="Blended, filled, labelled and batch-tested in Ghana"
                />
              </Field>
            )}

            <Field id="ingredients" label="Ingredients (optional)">
              <Input
                id="ingredients"
                name="ingredients"
                defaultValue={draft?.ingredients}
                placeholder="Shea butter, baobab oil, vitamin E"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[0.9375rem]">Listing</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="marketCode"
                label="Market"
                hint="Checkout is Nigeria only; Ghana listings are catalogue-only."
              >
                <Select name="marketCode" defaultValue={draft?.marketCode ?? "NG"}>
                  <SelectTrigger id="marketCode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NG">Nigeria · NGN</SelectItem>
                    <SelectItem value="GH">Ghana · GHS</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="price" label="Price" hint="Major units, e.g. 4850 for ₦4,850">
                <Input
                  id="price"
                  name="price"
                  inputMode="decimal"
                  required
                  defaultValue={
                    draft ? (draft.priceMinor / 100).toString() : ""
                  }
                  placeholder="4850"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="variantName" label="Variant (optional)">
                <Input
                  id="variantName"
                  name="variantName"
                  defaultValue={draft?.variantName}
                  placeholder="Standard 180g"
                />
              </Field>
              <Field id="sku" label="SKU (optional)">
                <Input
                  id="sku"
                  name="sku"
                  defaultValue={draft?.sku}
                  placeholder="NK-SHEA-BALM-180G"
                />
              </Field>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-(length:--text-meta)">
              <Checkbox
                name="purchasable"
                defaultChecked={draft?.purchasable ?? true}
              />
              Purchasable — customers can add this to a cart
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-[0.9375rem]">Photograph</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="bg-muted relative aspect-4/5 w-full overflow-hidden rounded-lg">
              {preview ? (
                <Image
                  src={preview}
                  alt="Product preview"
                  fill
                  sizes="320px"
                  className="object-cover"
                  unoptimized={preview.startsWith("blob:")}
                />
              ) : (
                <div className="text-muted-foreground absolute inset-0 grid place-items-center">
                  <ImagePlus className="size-6 opacity-50" aria-hidden />
                </div>
              )}
            </div>

            <Input
              ref={fileRef}
              id="image"
              name="image"
              type="file"
              accept="image/webp,image/jpeg,image/png,image/avif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : productImageSrc(currentImagePath));
              }}
            />
            <p className="text-muted-foreground text-(length:--text-meta)">
              Uploaded to the public <code>catalogue</code> bucket in Supabase
              Storage. WebP at 1200×1500 (4:5) under 5 MB keeps the grid
              consistent. Leave empty to keep the current image.
            </p>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => {
                  if (fileRef.current) fileRef.current.value = "";
                  setPreview(productImageSrc(currentImagePath));
                }}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Reset selection
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Submit editing={editing} />
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
