ALTER TABLE "matches" ADD COLUMN "youtubeBroadcastId" TEXT;
ALTER TABLE "matches" ADD COLUMN "youtubeVideoId" TEXT;
CREATE UNIQUE INDEX "matches_youtubeBroadcastId_key" ON "matches"("youtubeBroadcastId");
