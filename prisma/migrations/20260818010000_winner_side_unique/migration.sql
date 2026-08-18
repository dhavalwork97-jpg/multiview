-- winnerSideId must be unique for the one-to-one Match <-> MatchSide relation
-- (Match.winnerSide) to be valid. The prior migration only added a plain index.
DROP INDEX IF EXISTS "matches_winnerSideId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "matches_winnerSideId_key" ON "matches"("winnerSideId");
