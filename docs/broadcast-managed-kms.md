# Managed broadcast secret storage

FGC Stream does not store organizer YouTube refresh tokens or custom RTMP stream keys in Vercel/Render environment variables.

Production uses Google Cloud KMS with Vercel OIDC federation:

1. Create a Google Cloud KMS key ring and symmetric encryption key for broadcast secrets.
2. Create a dedicated Google Cloud service account for broadcast KMS access.
3. Grant that service account `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the broadcast key.
4. Create a Google Cloud Workload Identity Federation pool/provider that trusts the FGC Stream Vercel OIDC issuer.
5. Allow only the FGC Stream production Vercel subject to impersonate the KMS service account.
6. Enable Secure Backend Access with OIDC in the Vercel project.
7. Configure only these non-secret identifiers in Vercel:
   - `GCP_PROJECT_NUMBER`
   - `GCP_SERVICE_ACCOUNT_EMAIL`
   - `GCP_WORKLOAD_IDENTITY_POOL_ID`
   - `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`
   - `GCP_KMS_KEY_NAME`

The application receives the short-lived Vercel OIDC token on each function request, exchanges it for short-lived Google credentials, and calls Cloud KMS. No KMS private key, service-account key, or broadcast encryption key is stored in the application environment.

`YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` remain platform-owned Google OAuth application credentials. They are not organizer credentials.

Previously stored broadcast ciphertexts created with the retired `BROADCAST_ENCRYPTION_KEY` format are not automatically decryptable by managed KMS. Reconnect affected YouTube channels and re-enter affected custom RTMP stream keys after migration.
