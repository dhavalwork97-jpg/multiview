-- CreateEnum
CREATE TYPE "ProgressionEventType" AS ENUM (
  'MATCH_COMPLETED',
  'WINNER_ADVANCED',
  'LOSER_ADVANCED',
  'SLOT_CLAIMED',
  'SLOT_SKIPPED',
  'BRACKET_COMPLETED',
  'STAGE_COMPLETED'
);

-- AlterTable
ALTER TABLE "advancement_slots"
  ADD COLUMN "claimAttempt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "claimedByMatchId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ProgressionEvent" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "targetMatchId" TEXT,
  "targetSideId" TEXT,
  "eventType" "ProgressionEventType" NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProgressionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgressionEvent_tournamentId_idx"
  ON "ProgressionEvent"("tournamentId");

CREATE INDEX "ProgressionEvent_matchId_idx"
  ON "ProgressionEvent"("matchId");

CREATE INDEX "ProgressionEvent_eventType_idx"
  ON "ProgressionEvent"("eventType");

CREATE INDEX "ProgressionEvent_createdAt_idx"
  ON "ProgressionEvent"("createdAt");

CREATE INDEX "advancement_slots_resolvedAt_idx"
  ON "advancement_slots"("resolvedAt");

CREATE INDEX "advancement_slots_claimedByMatchId_idx"
  ON "advancement_slots"("claimedByMatchId");

-- AddForeignKey
ALTER TABLE "ProgressionEvent"
  ADD CONSTRAINT "ProgressionEvent_tournamentId_fkey"
  FOREIGN KEY ("tournamentId")
  REFERENCES "tournaments"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "ProgressionEvent"
  ADD CONSTRAINT "ProgressionEvent_matchId_fkey"
  FOREIGN KEY ("matchId")
  REFERENCES "matches"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
