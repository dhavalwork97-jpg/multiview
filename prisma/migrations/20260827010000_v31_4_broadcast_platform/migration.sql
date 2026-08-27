CREATE TYPE "BroadcastCueType" AS ENUM ('MATCH','BREAK','INTERMISSION','RESULTS','SPONSOR','LOWER_THIRD','VIDEO','CUSTOM');
CREATE TYPE "BroadcastCueStatus" AS ENUM ('PENDING','LIVE','COMPLETED','SKIPPED');

CREATE TABLE "broadcast_cues" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "cueType" "BroadcastCueType" NOT NULL DEFAULT 'CUSTOM',
  "status" "BroadcastCueStatus" NOT NULL DEFAULT 'PENDING',
  "durationSec" INTEGER,
  "position" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "broadcast_cues_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "broadcast_cues_tournamentId_position_idx" ON "broadcast_cues"("tournamentId", "position");
CREATE INDEX "broadcast_cues_tournamentId_status_idx" ON "broadcast_cues"("tournamentId", "status");
ALTER TABLE "broadcast_cues" ADD CONSTRAINT "broadcast_cues_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
