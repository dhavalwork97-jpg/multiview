const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;

export function cdnUrl(storageKey: string) {
  if (!STORAGE_URL || !STORAGE_BUCKET) {
    throw new Error("Supabase Storage is not configured");
  }

  const base = STORAGE_URL.replace(/\/$/, "");
  const normalizedKey = storageKey.replace(/^\/+/, "");
  const storageBase = /\/storage\/v1$/.test(base) ? base : `${base}/storage/v1`;

  return `${storageBase}/object/public/${encodeURIComponent(STORAGE_BUCKET)}/${normalizedKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
