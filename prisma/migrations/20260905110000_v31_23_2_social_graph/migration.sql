-- Phase 14.2: directional follows. Mutual follows form the friend graph.
CREATE TABLE "user_follows" (
  "id" TEXT NOT NULL,
  "followerId" TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_follows_no_self_follow" CHECK ("followerId" <> "followingId")
);
CREATE UNIQUE INDEX "user_follows_followerId_followingId_key" ON "user_follows"("followerId", "followingId");
CREATE INDEX "user_follows_followingId_createdAt_idx" ON "user_follows"("followingId", "createdAt");
CREATE INDEX "user_follows_followerId_createdAt_idx" ON "user_follows"("followerId", "createdAt");