-- A Match can have at most one winning MatchSide.
-- PostgreSQL UNIQUE indexes allow multiple NULL values, so unfinished matches remain valid.
CREATE UNIQUE INDEX IF NOT EXISTS "matches_winnerSideId_key"
  ON "matches"("winnerSideId");
