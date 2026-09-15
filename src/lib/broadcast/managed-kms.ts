const GOOGLE_STS_URL = "https://sts.googleapis.com/v1/token";
const GOOGLE_IAM_CREDENTIALS_URL = "https://iamcredentials.googleapis.com/v1";
const GOOGLE_KMS_URL = "https://cloudkms.googleapis.com/v1";

type KmsConfig = {
  projectNumber: string;
  serviceAccountEmail: string;
  workloadIdentityPoolId: string;
  workloadIdentityProviderId: string;
  keyName: string;
};

function requiredEnv(name: keyof Record<keyof KmsConfig, string>): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required managed KMS configuration: ${name}`);
  return value;
}

function config(): KmsConfig {
  return {
    projectNumber: requiredEnv("GCP_PROJECT_NUMBER"),
    serviceAccountEmail: requiredEnv("GCP_SERVICE_ACCOUNT_EMAIL"),
    workloadIdentityPoolId: requiredEnv("GCP_WORKLOAD_IDENTITY_POOL_ID"),
    workloadIdentityProviderId: requiredEnv("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID"),
    keyName: requiredEnv("GCP_KMS_KEY_NAME"),
  };
}

function oidcToken(): string {
  const value = process.env.VERCEL_OIDC_TOKEN;
  if (!value) throw new Error("Managed KMS requires Vercel OIDC federation; no Vercel OIDC token is available");
  return value;
}

async function exchangeVercelOidcForGoogleToken(): Promise<string> {
  const value = config();
  const audience = `//iam.googleapis.com/projects/${value.projectNumber}/locations/global/workloadIdentityPools/${value.workloadIdentityPoolId}/providers/${value.workloadIdentityProviderId}`;
  const response = await fetch(GOOGLE_STS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      subject_token: oidcToken(),
    }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.access_token !== "string") throw new Error(`Managed KMS identity exchange failed (${response.status})`);
  return data.access_token;
}

async function serviceAccountAccessToken(): Promise<string> {
  const value = config();
  const federatedToken = await exchangeVercelOidcForGoogleToken();
  const response = await fetch(`${GOOGLE_IAM_CREDENTIALS_URL}/projects/-/serviceAccounts/${encodeURIComponent(value.serviceAccountEmail)}:generateAccessToken`, {
    method: "POST",
    headers: { Authorization: `Bearer ${federatedToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ scope: ["https://www.googleapis.com/auth/cloud-platform"], lifetime: "900s" }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.accessToken !== "string") throw new Error(`Managed KMS service identity exchange failed (${response.status})`);
  return data.accessToken;
}

export async function encryptBroadcastSecret(value: string): Promise<string> {
  const accessToken = await serviceAccountAccessToken();
  const key = config().keyName;
  const response = await fetch(`${GOOGLE_KMS_URL}/${key}:encrypt`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ plaintext: Buffer.from(value, "utf8").toString("base64") }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.ciphertext !== "string") throw new Error(`Managed KMS encryption failed (${response.status})`);
  return `gcp-kms.v1.${Buffer.from(JSON.stringify({ key, ciphertext: data.ciphertext }), "utf8").toString("base64url")}`;
}

export async function decryptBroadcastSecret(value: string): Promise<string> {
  const prefix = "gcp-kms.v1.";
  if (!value.startsWith(prefix)) throw new Error("Unsupported broadcast secret format; reconnect the provider");
  let payload: { key?: string; ciphertext?: string };
  try {
    payload = JSON.parse(Buffer.from(value.slice(prefix.length), "base64url").toString("utf8")) as { key?: string; ciphertext?: string };
  } catch {
    throw new Error("Invalid managed KMS ciphertext");
  }
  if (!payload.key || !payload.ciphertext) throw new Error("Invalid managed KMS ciphertext");
  const accessToken = await serviceAccountAccessToken();
  const response = await fetch(`${GOOGLE_KMS_URL}/${payload.key}:decrypt`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ciphertext: payload.ciphertext }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.plaintext !== "string") throw new Error(`Managed KMS decryption failed (${response.status})`);
  return Buffer.from(data.plaintext, "base64").toString("utf8");
}
