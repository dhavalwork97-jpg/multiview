# Free media storage migration

## What changed

FGC media storage no longer depends on AWS S3 or CloudFront for the VOD/HLS/clip path.

- LiveKit egress writes segmented HLS VOD output to Supabase Storage through its S3-compatible endpoint.
- A single large MP4 VOD is intentionally not generated because the Supabase Free plan has a 50 MB maximum file-size limit.
- The clip worker uploads generated MP4 clips to the same Supabase bucket through the S3-compatible API.
- Clips are re-encoded to a bounded 720p/2.5 Mbps profile so normal 1–90 second clips stay below the 50 MB free-tier limit; an explicit size guard rejects anything that still exceeds it.
- Public media URLs are generated from `NEXT_PUBLIC_SUPABASE_STORAGE_URL` + `NEXT_PUBLIC_SUPABASE_BUCKET`.
- Existing database keys (`Recording.hlsPlaylistKey`, `Recording.mp4S3Key`, `Clip.s3Key`) remain storage-key based. `Recording.mp4S3Key` is now null for new recordings because HLS segments are the VOD source.
- The Render Blueprint no longer provisions AWS S3/CloudFront variables.
- The clip-worker Docker image now actually starts `src/server/streaming/clip-worker.ts` instead of the AI worker.

## Supabase setup

Use a Supabase project on the Free plan. The current free allowance includes 1 GB of file storage and 5 GB cached + 5 GB uncached egress. This is appropriate for development/demo workloads, not an unlimited production VOD archive.

1. Open **Storage** in the Supabase dashboard.
2. Create a bucket named `media` (or choose another name and set `NEXT_PUBLIC_SUPABASE_BUCKET` to it).
3. Make the bucket **public** because the viewer needs to fetch HLS playlists/segments and clips without per-object signed URLs.
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

For a project URL such as `https://PROJECT_REF.supabase.co`, the application produces:

`https://PROJECT_REF.supabase.co/storage/v1/object/public/media/<storage-key>`

## Free-tier operating model

A match is recorded as an HLS playlist plus small segment objects. That remains a normal VOD representation: the player loads the playlist and seeks through the recorded segments.

Viewer clips are materialized as MP4 files, but are constrained to the free storage provider's upload limit. The existing 90-second UI/API maximum is preserved; the encoder uses a bounded bitrate and a final size guard.

The 1 GB storage and 10 GB total egress allowance on Supabase Free are hard product limits for this deployment. Retention/cleanup should therefore be enabled before the platform is used for sustained tournaments.

## Rollout

This branch changes application code and deployment configuration only. Provider credentials and bucket creation remain deployment configuration and must be entered in Supabase/Render rather than Git.
