DO $$ BEGIN CREATE TYPE "PlanTier" AS ENUM ('FREE','STARTER','PRO','ENTERPRISE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TournamentFormat" AS ENUM ('SINGLE_ELIMINATION','DOUBLE_ELIMINATION','ROUND_ROBIN','SWISS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "NotificationType" AS ENUM ('MATCH_STARTING','MATCH_LIVE','MATCH_COMPLETED','BRACKET_ADVANCED','STREAM_ALERT','TOURNAMENT_UPDATE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PlanTier" AS ENUM ('FREE','STARTER','PRO','ENTERPRISE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TournamentFormat" AS ENUM ('SINGLE_ELIMINATION','DOUBLE_ELIMINATION','ROUND_ROBIN','SWISS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "NotificationType" AS ENUM ('MATCH_STARTING','MATCH_LIVE','MATCH_COMPLETED','BRACKET_ADVANCED','STREAM_ALERT','TOURNAMENT_UPDATE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "plan" "PlanTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brandLogoUrl" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brandPrimaryColor" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brandAccentColor" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "customDomain" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_customDomain_key" ON "organizations"("customDomain");
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "format" "TournamentFormat" NOT NULL DEFAULT 'SINGLE_ELIMINATION';
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "bestOf" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "publicEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "publicTheme" JSONB;
CREATE TABLE IF NOT EXISTS "teams" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "logoUrl" TEXT, "country" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "teams_slug_key" ON "teams"("slug");
CREATE INDEX IF NOT EXISTS "teams_name_idx" ON "teams"("name");
CREATE TABLE IF NOT EXISTS "team_members" (
  "id" TEXT NOT NULL, "teamId" TEXT NOT NULL, "playerId" TEXT NOT NULL, "role" TEXT,
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_teamId_playerId_key" ON "team_members"("teamId","playerId");
CREATE TABLE IF NOT EXISTS "tournament_teams" (
  "id" TEXT NOT NULL, "tournamentId" TEXT NOT NULL, "teamId" TEXT NOT NULL, "seed" INTEGER, "eliminated" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "tournament_teams_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_teams_tournamentId_teamId_key" ON "tournament_teams"("tournamentId","teamId");
CREATE TABLE IF NOT EXISTS "sponsors" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "tournamentId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "logoUrl" TEXT, "websiteUrl" TEXT, "bannerUrl" TEXT, "placement" TEXT NOT NULL DEFAULT 'EVENT', "weight" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true, "clicks" INTEGER NOT NULL DEFAULT 0, "impressions" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "sponsors_tournamentId_active_idx" ON "sponsors"("tournamentId","active");
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "tournamentId" TEXT, "userId" TEXT, "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL, "message" TEXT NOT NULL, "href" TEXT, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_organizationId_createdAt_idx" ON "notifications"("organizationId","createdAt");
CREATE INDEX IF NOT EXISTS "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId","readAt","createdAt");
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
