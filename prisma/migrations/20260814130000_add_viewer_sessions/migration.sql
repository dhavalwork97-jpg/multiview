CREATE TABLE "viewer_sessions" (
  "id" TEXT NOT NULL,
  "sessionHash" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "viewer_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "viewer_sessions_sessionHash_matchId_dayKey_key" ON "viewer_sessions"("sessionHash", "matchId", "dayKey");
CREATE INDEX "viewer_sessions_tournamentId_dayKey_idx" ON "viewer_sessions"("tournamentId", "dayKey");
CREATE INDEX "viewer_sessions_matchId_dayKey_idx" ON "viewer_sessions"("matchId", "dayKey");
