-- Phase 14: short-lived social signals. Presence is renewed by clients and
-- is safe to purge once expired; historical reaction/activity rows are kept
-- for reporting and can be archived by the scheduled retention job.
CREATE TYPE "ActivityType" AS ENUM ('REACTION', 'PRESENCE', 'MATCH_STARTED', 'MATCH_COMPLETED', 'SYSTEM');

ALTER TABLE "viewer_sessions" ADD COLUMN "userId" TEXT;
ALTER TABLE "viewer_sessions" ADD CONSTRAINT "viewer_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "viewer_sessions_userId_lastSeenAt_idx" ON "viewer_sessions"("userId", "lastSeenAt");
ALTER TABLE "viewer_sessions" ADD CONSTRAINT "viewer_sessions_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "viewer_presence" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "userId" TEXT,
  "sessionHash" TEXT NOT NULL,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "viewer_presence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "viewer_presence_matchId_sessionHash_key" ON "viewer_presence"("matchId", "sessionHash");
CREATE INDEX "viewer_presence_matchId_expiresAt_idx" ON "viewer_presence"("matchId", "expiresAt");
CREATE INDEX "viewer_presence_userId_lastSeenAt_idx" ON "viewer_presence"("userId", "lastSeenAt");
ALTER TABLE "viewer_presence" ADD CONSTRAINT "viewer_presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "viewer_presence" ADD CONSTRAINT "viewer_presence_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "reaction_events" (
  "id" TEXT NOT NULL, "matchId" TEXT NOT NULL, "userId" TEXT, "sessionHash" TEXT NOT NULL,
  "reaction" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reaction_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reaction_events_matchId_createdAt_idx" ON "reaction_events"("matchId", "createdAt");
CREATE INDEX "reaction_events_reaction_createdAt_idx" ON "reaction_events"("reaction", "createdAt");
CREATE INDEX "reaction_events_userId_createdAt_idx" ON "reaction_events"("userId", "createdAt");
ALTER TABLE "reaction_events" ADD CONSTRAINT "reaction_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reaction_events" ADD CONSTRAINT "reaction_events_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "activity_events" (
  "id" TEXT NOT NULL, "matchId" TEXT, "userId" TEXT, "type" "ActivityType" NOT NULL,
  "message" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "activity_events_createdAt_idx" ON "activity_events"("createdAt");
CREATE INDEX "activity_events_matchId_createdAt_idx" ON "activity_events"("matchId", "createdAt");
CREATE INDEX "activity_events_type_createdAt_idx" ON "activity_events"("type", "createdAt");
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Run periodically (for example daily through the worker):
-- DELETE FROM "viewer_presence" WHERE "expiresAt" < NOW();
-- DELETE FROM "reaction_events" WHERE "createdAt" < NOW() - INTERVAL '90 days';
-- DELETE FROM "activity_events" WHERE "createdAt" < NOW() - INTERVAL '90 days';
