-- Generic Match Engine: sides, participants, scoring ledger.
-- Legacy player columns remain as nullable compatibility fields.

ALTER TABLE "tournaments"
  ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'esports',
  ADD COLUMN IF NOT EXISTS "competitionType" TEXT NOT NULL DEFAULT 'tournament',
  ADD COLUMN IF NOT EXISTS "participantMode" TEXT NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS "scoringMode" TEXT NOT NULL DEFAULT 'points',
  ADD COLUMN IF NOT EXISTS "competitionRules" JSONB;

ALTER TABLE "matches"
  ALTER COLUMN "playerOneId" DROP NOT NULL,
  ALTER COLUMN "playerTwoId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "engineVersion" TEXT NOT NULL DEFAULT '1',
  ADD COLUMN IF NOT EXISTS "scoringAdapter" TEXT NOT NULL DEFAULT 'points',
  ADD COLUMN IF NOT EXISTS "rulesSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "winnerSideId" TEXT;

CREATE TABLE IF NOT EXISTS "match_sides" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "sideKey" TEXT NOT NULL,
  "label" TEXT,
  "score" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "match_sides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "match_sides_matchId_sideKey_key" ON "match_sides"("matchId", "sideKey");
CREATE INDEX IF NOT EXISTS "match_sides_matchId_idx" ON "match_sides"("matchId");

CREATE TABLE IF NOT EXISTS "match_participants" (
  "id" TEXT NOT NULL,
  "sideId" TEXT NOT NULL,
  "playerId" TEXT,
  "teamId" TEXT,
  "role" TEXT,
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "match_participants_sideId_playerId_teamId_key" ON "match_participants"("sideId", "playerId", "teamId");
CREATE INDEX IF NOT EXISTS "match_participants_playerId_idx" ON "match_participants"("playerId");
CREATE INDEX IF NOT EXISTS "match_participants_teamId_idx" ON "match_participants"("teamId");

CREATE TABLE IF NOT EXISTS "match_score_events" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "sideId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "metric" TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  "period" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_score_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "match_score_events_matchId_sequence_key" ON "match_score_events"("matchId", "sequence");
CREATE INDEX IF NOT EXISTS "match_score_events_matchId_sideId_idx" ON "match_score_events"("matchId", "sideId");
CREATE INDEX IF NOT EXISTS "matches_winnerSideId_idx" ON "matches"("winnerSideId");

DO $$ BEGIN
  ALTER TABLE "match_sides" ADD CONSTRAINT "match_sides_matchId_fkey"
    FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_sideId_fkey"
    FOREIGN KEY ("sideId") REFERENCES "match_sides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "match_score_events" ADD CONSTRAINT "match_score_events_matchId_fkey"
    FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "match_score_events" ADD CONSTRAINT "match_score_events_sideId_fkey"
    FOREIGN KEY ("sideId") REFERENCES "match_sides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "matches" ADD CONSTRAINT "matches_winnerSideId_fkey"
    FOREIGN KEY ("winnerSideId") REFERENCES "match_sides"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill sides and participant rows for every existing legacy two-player match.
INSERT INTO "match_sides" ("id", "matchId", "sideKey", "label", "score", "createdAt", "updatedAt")
SELECT 'ms_' || md5(m."id" || ':A'), m."id", 'A', p.gamertag, m."playerOneScore", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "matches" m
LEFT JOIN "players" p ON p."id" = m."playerOneId"
WHERE NOT EXISTS (SELECT 1 FROM "match_sides" s WHERE s."matchId" = m."id" AND s."sideKey" = 'A');

INSERT INTO "match_sides" ("id", "matchId", "sideKey", "label", "score", "createdAt", "updatedAt")
SELECT 'ms_' || md5(m."id" || ':B'), m."id", 'B', p.gamertag, m."playerTwoScore", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "matches" m
LEFT JOIN "players" p ON p."id" = m."playerTwoId"
WHERE NOT EXISTS (SELECT 1 FROM "match_sides" s WHERE s."matchId" = m."id" AND s."sideKey" = 'B');

INSERT INTO "match_participants" ("id", "sideId", "playerId", "createdAt")
SELECT 'mp_' || md5(m."id" || ':A:' || m."playerOneId"), s."id", m."playerOneId", CURRENT_TIMESTAMP
FROM "matches" m JOIN "match_sides" s ON s."matchId" = m."id" AND s."sideKey" = 'A'
WHERE m."playerOneId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "match_participants" p WHERE p."sideId" = s."id" AND p."playerId" = m."playerOneId");

INSERT INTO "match_participants" ("id", "sideId", "playerId", "createdAt")
SELECT 'mp_' || md5(m."id" || ':B:' || m."playerTwoId"), s."id", m."playerTwoId", CURRENT_TIMESTAMP
FROM "matches" m JOIN "match_sides" s ON s."matchId" = m."id" AND s."sideKey" = 'B'
WHERE m."playerTwoId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "match_participants" p WHERE p."sideId" = s."id" AND p."playerId" = m."playerTwoId");
