# Free media storage migration

## What changed

FGC media storage no longer depends on AWS S3 or CloudFront for the VOD/HLS/clip path.

- LiveKit egress writes MP4 + segmented HLS to Supabase Storage through its S3-compatible endpoint.
- The clip worker uploads generated MP4 clips to the same Supabase bucket through the S3-compatible API.
- Public media URLs are generated from `NEXT_PUBLIC_SUPABASE_STORAGE_URL` + `NEXT_PUBLIC_SUPABASE_BUCKET`.
- Existing database keys (`Recording.hlsPlaylistKey`, `Recording.mp4S3Key`, `Clip.s3Key`) remain storage-key based, so this is a provider migration rather than a schema migration.
- AWS credentials and CloudFront are removed from the Render Blueprint for the web and clip-worker services.

## Supabase setup

Use a Supabase project on the Free plan. The current free allowance includes 1 GB of file storage and 5 GB cached + 5 GB uncached egress, so this is suitable for development/demo workloads but not a high-volume VOD archive.

1. Open **Storage** in the Supabase dashboard.
2. Create a bucket named `media` (or choose another name and set `NEXT_PUBLIC_SUPABASE_BUCKET` to it).
3. Make the bucket **public** because the viewer needs to fetch HLS playlists/segments and clips without a signed per-object URL.
4. Open **Storage → Configuration → S3**.
5. Enable the S3 protocol.
6. Generate an S3 access key and secret key for server-side use.
7. Copy the endpoint and region shown by Supabase.
8. Add these Render secrets to `fgc-stream-web` and `fgc-stream-clip-worker`:
   - `SUPABASE_S3_ENDPOINT`
   - `SUPABASE_S3_REGION`
   - `SUPABASE_S3_ACCESS_KEY_ID`
   - `SUPABASE_S3_SECRET_ACCESS_KEY`
   - `NEXT_PUBLIC_SUPABASE_STORAGE_URL`
   - `NEXT_PUBLIC_SUPABASE_BUCKET`

Do not commit the generated S3 secret key.

## URL shape

The application accepts either the Supabase project URL or its `/storage/v1` URL as `NEXT_PUBLIC_SUPABASE_STORAGE_URL`.

For a project URL such as:

`https://PROJECT_REF.supabase.co`

the application produces:

`https://PROJECT_REF.supabase.co/storage/v1/object/public/media/<storage-key>`

## Important free-tier constraint

The Supabase Free plan is not a replacement for unlimited production video storage. Keep clip/VOD retention bounded and monitor storage + egress usage. When the product grows beyond the free quota, the storage interface can be pointed at another S3-compatible provider without changing database key semantics.

## Rollout

This branch intentionally changes code/config only. Provider credentials and bucket creation remain deployment configuration and must be entered in Supabase/Render rather than Git.
