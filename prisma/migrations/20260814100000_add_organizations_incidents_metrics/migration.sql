CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');
CREATE TYPE "IncidentSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

CREATE TABLE "organizations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "organizations_ownerId_idx" ON "organizations"("ownerId");
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_members" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL DEFAULT 'VIEWER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");
CREATE INDEX "organization_members_userId_role_idx" ON "organization_members"("userId", "role");
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "organization_invitations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL DEFAULT 'OPERATOR',
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "invitedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organization_invitations_tokenHash_key" ON "organization_invitations"("tokenHash");
CREATE INDEX "organization_invitations_organizationId_email_idx" ON "organization_invitations"("organizationId", "email");
CREATE INDEX "organization_invitations_expiresAt_idx" ON "organization_invitations"("expiresAt");
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tournament_incidents" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "createdById" TEXT,
  "severity" "IncidentSeverity" NOT NULL DEFAULT 'INFO',
  "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "details" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tournament_incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tournament_incidents_tournamentId_status_createdAt_idx" ON "tournament_incidents"("tournamentId", "status", "createdAt");
CREATE INDEX "tournament_incidents_organizationId_createdAt_idx" ON "tournament_incidents"("organizationId", "createdAt");
ALTER TABLE "tournament_incidents" ADD CONSTRAINT "tournament_incidents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_incidents" ADD CONSTRAINT "tournament_incidents_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "event_daily_metrics" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "matchId" TEXT,
  "dayKey" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "watchSeconds" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_daily_metrics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_daily_metrics_tournamentId_matchId_dayKey_key" ON "event_daily_metrics"("tournamentId", "matchId", "dayKey");
CREATE INDEX "event_daily_metrics_organizationId_dayKey_idx" ON "event_daily_metrics"("organizationId", "dayKey");
CREATE INDEX "event_daily_metrics_tournamentId_dayKey_idx" ON "event_daily_metrics"("tournamentId", "dayKey");
ALTER TABLE "event_daily_metrics" ADD CONSTRAINT "event_daily_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tournaments" ADD COLUMN "organizationId" TEXT;

-- Backfill one organization per existing organizer. IDs are deterministic so the migration is rerunnable in staging clones.
INSERT INTO "organizations" ("id", "name", "slug", "ownerId", "updatedAt")
SELECT 'org_' || md5(u."id"),
       COALESCE(NULLIF(u."displayName", ''), NULLIF(u."username", ''), 'Tournament Organizer') || ' Events',
       'org-' || md5(u."id"),
       u."id",
       CURRENT_TIMESTAMP
FROM "users" u
WHERE EXISTS (SELECT 1 FROM "tournaments" t WHERE t."organizerId" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "organizations" o WHERE o."ownerId" = u."id");

INSERT INTO "organization_members" ("id", "organizationId", "userId", "role", "updatedAt")
SELECT 'mem_' || md5(o."id" || u."id"), o."id", u."id",
       CASE WHEN u."role" = 'ADMIN' THEN 'ADMIN'::"OrganizationRole" ELSE 'OWNER'::"OrganizationRole" END,
       CURRENT_TIMESTAMP
FROM "organizations" o
JOIN "users" u ON u."id" = o."ownerId"
WHERE NOT EXISTS (SELECT 1 FROM "organization_members" m WHERE m."organizationId" = o."id" AND m."userId" = u."id");

UPDATE "tournaments" t
SET "organizationId" = o."id"
FROM "organizations" o
WHERE o."ownerId" = t."organizerId";

ALTER TABLE "tournaments" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "tournaments_organizationId_status_idx" ON "tournaments"("organizationId", "status");
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
