const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;

export function cdnUrl(s3Key: string) {
  if (!CLOUDFRONT_DOMAIN) {
    throw new Error("CloudFront domain is not configured");
  }

  const normalizedDomain = CLOUDFRONT_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const normalizedKey = s3Key.replace(/^\/+/, "");
  return `https://${normalizedDomain}/${normalizedKey}`;
}
