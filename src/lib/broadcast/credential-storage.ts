import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const FALLBACK_PREFIX = "app-encrypted.v1.";

function fallbackKey(): Buffer {
  const seed = process.env.BROADCAST_ENCRYPTION_KEY || process.env.CLERK_SECRET_KEY;
  if (!seed) throw new Error("No broadcast credential encryption key is configured");
  return createHash("sha256").update(seed).digest();
}

/**
 * Temporary application-level fallback used when managed KMS is not configured.
 * KMS remains preferred whenever all managed-KMS settings are present.
 */
export function managedKmsConfigured(): boolean {
  return Boolean(
    process.env.GCP_PROJECT_NUMBER &&
      process.env.GCP_SERVICE_ACCOUNT_EMAIL &&
      process.env.GCP_WORKLOAD_IDENTITY_POOL_ID &&
      process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID &&
      process.env.GCP_KMS_KEY_NAME,
  );
}

export function encryptFallback(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", fallbackKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${FALLBACK_PREFIX}${Buffer.from(JSON.stringify({ iv: iv.toString("base64url"), tag: tag.toString("base64url"), ciphertext: ciphertext.toString("base64url") }), "utf8").toString("base64url")}`;
}

export function decryptFallback(value: string): string {
  if (!value.startsWith(FALLBACK_PREFIX)) throw new Error("Unsupported application credential format");
  let payload: { iv?: string; tag?: string; ciphertext?: string };
  try {
    payload = JSON.parse(Buffer.from(value.slice(FALLBACK_PREFIX.length), "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid application credential ciphertext");
  }
  if (!payload.iv || !payload.tag || !payload.ciphertext) throw new Error("Invalid application credential ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", fallbackKey(), Buffer.from(payload.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export { FALLBACK_PREFIX };
