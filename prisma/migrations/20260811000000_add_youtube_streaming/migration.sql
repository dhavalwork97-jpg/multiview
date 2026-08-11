ALTER TABLE "stations"
  ADD COLUMN "youtubeStreamId" TEXT,
  ADD COLUMN "youtubeBroadcastId" TEXT,
  ADD COLUMN "youtubeVideoId" TEXT,
  ADD COLUMN "youtubeIngestUrl" TEXT,
  ADD COLUMN "youtubeLiveStatus" TEXT,
  ADD COLUMN "youtubeLastStatusAt" TIMESTAMP(3);
