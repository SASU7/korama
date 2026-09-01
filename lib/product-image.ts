/**
 * Resolving a catalogue image.
 *
 * media.storage_path holds "<bucket>/<object>" — e.g.
 * "catalogue/nk-shea-balm.webp" — which maps directly onto Supabase Storage's
 * public object endpoint. The `catalogue` bucket is public, so cards in the
 * grid do not each need a signed-URL round trip.
 *
 * A path with no bucket segment is treated as a local file under /products,
 * which keeps any hand-placed image working.
 */
export const CATALOGUE_BUCKET = "catalogue";

export function productImageSrc(storagePath: string | undefined | null) {
  if (!storagePath) return null;
  const clean = storagePath.replace(/^\/+/, "");
  if (!clean) return null;

  if (!clean.includes("/")) return `/products/${clean}`;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return `/products/${clean.split("/").pop()}`;
  return `${base}/storage/v1/object/public/${clean}`;
}

/** The storage_path to record for a newly uploaded object. */
export function catalogueStoragePath(fileName: string) {
  return `${CATALOGUE_BUCKET}/${fileName}`;
}

/**
 * A 4:5 warm-neutral placeholder. Enough for next/image's blur to avoid a
 * flash of empty box without shipping a per-image base64 thumbnail.
 */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"><rect width="4" height="5" fill="#e9eee8"/></svg>',
  ).toString("base64");
