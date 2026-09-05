CREATE TABLE "watch_parties" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "watch_parties_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "watch_parties_code_key" UNIQUE ("code"),
  CONSTRAINT "watch_parties_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "watch_parties_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "watch_parties_matchId_createdAt_idx" ON "watch_parties"("matchId", "createdAt");
CREATE INDEX "watch_parties_expiresAt_idx" ON "watch_parties"("expiresAt");
