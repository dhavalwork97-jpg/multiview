-- V28: persistent competition stages + generic advancement slots.
CREATE TYPE "StageKind" AS ENUM ('QUALIFIER','GROUP','SWISS','LEAGUE','KNOCKOUT','CONSOLATION','FINAL','CUSTOM');
CREATE TYPE "AdvancementSourceType" AS ENUM ('MATCH_RESULT','STAGE_RANK','MANUAL');
CREATE TYPE "AdvancementOutcome" AS ENUM ('WINNER','LOSER','RANK');

CREATE TABLE "competition_stages" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "StageKind" NOT NULL DEFAULT 'KNOCKOUT',
  "orderIndex" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "rules" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "competition_stages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "competition_stages_tournamentId_orderIndex_key" ON "competition_stages"("tournamentId","orderIndex");
CREATE INDEX "competition_stages_tournamentId_kind_idx" ON "competition_stages"("tournamentId","kind");
ALTER TABLE "competition_stages" ADD CONSTRAINT "competition_stages_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "matches" ADD COLUMN "stageId" TEXT;
CREATE INDEX "matches_stageId_idx" ON "matches"("stageId");
ALTER TABLE "matches" ADD CONSTRAINT "matches_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "competition_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "advancement_slots" (
  "id" TEXT NOT NULL,
  "sourceType" "AdvancementSourceType" NOT NULL DEFAULT 'MATCH_RESULT',
  "outcome" "AdvancementOutcome" NOT NULL DEFAULT 'WINNER',
  "sourceMatchId" TEXT,
  "sourceStageId" TEXT,
  "sourceRank" INTEGER,
  "targetMatchId" TEXT NOT NULL,
  "targetSideKey" TEXT NOT NULL,
  "sourceLabel" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "advancement_slots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "advancement_slots_targetMatchId_targetSideKey_key" ON "advancement_slots"("targetMatchId","targetSideKey");
CREATE INDEX "advancement_slots_sourceMatchId_outcome_idx" ON "advancement_slots"("sourceMatchId","outcome");
CREATE INDEX "advancement_slots_sourceStageId_sourceRank_idx" ON "advancement_slots"("sourceStageId","sourceRank");
ALTER TABLE "advancement_slots" ADD CONSTRAINT "advancement_slots_sourceMatchId_fkey" FOREIGN KEY ("sourceMatchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "advancement_slots" ADD CONSTRAINT "advancement_slots_sourceStageId_fkey" FOREIGN KEY ("sourceStageId") REFERENCES "competition_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "advancement_slots" ADD CONSTRAINT "advancement_slots_targetMatchId_fkey" FOREIGN KEY ("targetMatchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing bracket becomes a persistent knockout stage. Existing match
-- rows are attached to that stage without changing legacy bracket JSON.
INSERT INTO "competition_stages" ("id","tournamentId","name","kind","orderIndex","status","createdAt","updatedAt")
SELECT 'stage_' || "id", "tournamentId", "name", 'KNOCKOUT',
       ROW_NUMBER() OVER (PARTITION BY "tournamentId" ORDER BY "id") - 1,
       'SCHEDULED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "brackets";

UPDATE "matches" m
SET "stageId" = 'stage_' || m."bracketId"
WHERE m."bracketId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "competition_stages" s WHERE s."id" = 'stage_' || m."bracketId");
