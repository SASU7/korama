/**
 * Resolving a catalogue image.
 *
 * media.storage_path holds Supabase Storage keys like
 * "catalogue/nk-shea-balm.webp". The prototype serves the same filenames from
 * public/products/ so the app has no Storage dependency and no signed-URL
 * round trip. Point IMAGE_BASE at a Storage public URL to switch — this is
 * the only function that needs to change.
 */
const IMAGE_BASE = "/products";

export function productImageSrc(storagePath: string | undefined) {
  if (!storagePath) return null;
  const file = storagePath.split("/").pop();
  if (!file) return null;
  return `${IMAGE_BASE}/${file}`;
}

/**
 * A 1x1 warm-neutral pixel. Enough for next/image's blur placeholder to avoid
 * a flash of empty box without shipping a per-image base64 thumbnail.
 */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"><rect width="4" height="5" fill="#e9eee8"/></svg>',
  ).toString("base64");
