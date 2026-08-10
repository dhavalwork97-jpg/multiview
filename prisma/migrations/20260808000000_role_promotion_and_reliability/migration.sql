-- AlterTable: bracket-progression position, set at bracket import time or
-- when advanceBracket() instantiates a later-round match.
ALTER TABLE "matches" ADD COLUMN "roundIndex" INTEGER;
ALTER TABLE "matches" ADD COLUMN "matchIndex" INTEGER;

-- CreateTable: webhook delivery idempotency (LiveKit today; source column
-- leaves room for Clerk/Stripe without a schema change).
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_events_source_eventId_key" ON "webhook_events"("source", "eventId");
CREATE INDEX "webhook_events_receivedAt_idx" ON "webhook_events"("receivedAt");
