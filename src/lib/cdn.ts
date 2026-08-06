const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;

/**
 * Every video asset (live HLS segments, finished VODs, clips) is written
 * to S3 by LiveKit Egress or the clip worker using the key layout
 * documented in STREAMING_ARCHITECTURE.md, and served to viewers through
 * CloudFront rather than directly from S3 — this is the one place that
 * turns an S3 key into the URL a <video>/hls.js actually requests.
 */
export function cdnUrl(s3Key: string) {
  if (!CLOUDFRONT_DOMAIN) {
    throw new Error("CLOUDFRONT_DOMAIN is not configured");
  }
  return `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
}
