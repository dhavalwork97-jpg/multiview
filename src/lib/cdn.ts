const SUPABASE_STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL;
const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;

export function cdnUrl(s3Key: string) {
  if (!SUPABASE_STORAGE_URL || !SUPABASE_BUCKET) {
    throw new Error("Supabase storage URL/bucket is not configured");
  }
  return `${SUPABASE_STORAGE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${s3Key}`;
}