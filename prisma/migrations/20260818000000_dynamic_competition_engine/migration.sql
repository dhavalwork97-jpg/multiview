-- Dynamic Competition Engine
ALTER TABLE "tournaments"
  ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'esports',
  ADD COLUMN IF NOT EXISTS "competitionType" TEXT NOT NULL DEFAULT 'tournament',
  ADD COLUMN IF NOT EXISTS "participantMode" TEXT NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS "scoringMode" TEXT NOT NULL DEFAULT 'points',
  ADD COLUMN IF NOT EXISTS "competitionRules" JSONB;

CREATE INDEX IF NOT EXISTS "tournaments_sport_idx" ON "tournaments"("sport");
CREATE INDEX IF NOT EXISTS "tournaments_competitionType_idx" ON "tournaments"("competitionType");
