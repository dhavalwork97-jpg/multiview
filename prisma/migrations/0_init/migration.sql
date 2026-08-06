-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VIEWER', 'PLAYER', 'ORGANIZER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StationStatus" AS ENUM ('OFFLINE', 'IDLE', 'LIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('QUEUED', 'LIVE', 'COMPLETED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "StreamProtocol" AS ENUM ('WEBRTC', 'HLS');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('COMEBACK', 'PERFECT_ROUND', 'HYPE_SPIKE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('RECORDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ClipStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "match_events" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "type" "MatchEventType" NOT NULL,
    "timestampSeconds" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "gamertag" TEXT NOT NULL,
    "realName" TEXT,
    "country" TEXT,
    "avatarUrl" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "venue" TEXT,
    "bracketSource" TEXT,
    "bracketExternalId" TEXT,
    "organizerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_entrants" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seed" INTEGER,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tournament_entrants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brackets" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "structure" JSONB NOT NULL,

    CONSTRAINT "brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stations" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "StationStatus" NOT NULL DEFAULT 'OFFLINE',
    "streamKey" TEXT NOT NULL,
    "ingressId" TEXT,
    "ingestUrl" TEXT,
    "playbackIdHls" TEXT,
    "playbackIdWebrtc" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "currentBitrateKbps" INTEGER,
    "droppedFrames" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "bracketId" TEXT,
    "stationId" TEXT,
    "playerOneId" TEXT NOT NULL,
    "playerTwoId" TEXT NOT NULL,
    "playerOneScore" INTEGER NOT NULL DEFAULT 0,
    "playerTwoScore" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "round" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "hypeScore" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordings" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "egressId" TEXT,
    "status" "RecordingStatus" NOT NULL DEFAULT 'RECORDING',
    "mp4S3Key" TEXT,
    "hlsPlaylistKey" TEXT,
    "durationSeconds" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clips" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT,
    "startSeconds" INTEGER NOT NULL,
    "endSeconds" INTEGER NOT NULL,
    "status" "ClipStatus" NOT NULL DEFAULT 'QUEUED',
    "s3Key" TEXT,
    "thumbnailKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_history_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "watch_history_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_events_matchId_idx" ON "match_events"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "players_gamertag_key" ON "players"("gamertag");

-- CreateIndex
CREATE UNIQUE INDEX "players_userId_key" ON "players"("userId");

-- CreateIndex
CREATE INDEX "players_gamertag_idx" ON "players"("gamertag");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_playerId_key" ON "favorites"("userId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_slug_key" ON "tournaments"("slug");

-- CreateIndex
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- CreateIndex
CREATE INDEX "tournaments_slug_idx" ON "tournaments"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_entrants_tournamentId_playerId_key" ON "tournament_entrants"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "stations_streamKey_key" ON "stations"("streamKey");

-- CreateIndex
CREATE INDEX "stations_status_idx" ON "stations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stations_tournamentId_label_key" ON "stations"("tournamentId", "label");

-- CreateIndex
CREATE INDEX "matches_tournamentId_status_idx" ON "matches"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "matches_stationId_idx" ON "matches"("stationId");

-- CreateIndex
CREATE INDEX "matches_status_hypeScore_idx" ON "matches"("status", "hypeScore");

-- CreateIndex
CREATE UNIQUE INDEX "recordings_matchId_key" ON "recordings"("matchId");

-- CreateIndex
CREATE INDEX "clips_matchId_status_idx" ON "clips"("matchId", "status");

-- CreateIndex
CREATE INDEX "watch_history_entries_userId_watchedAt_idx" ON "watch_history_entries"("userId", "watchedAt");

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entrants" ADD CONSTRAINT "tournament_entrants_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entrants" ADD CONSTRAINT "tournament_entrants_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stations" ADD CONSTRAINT "stations_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "brackets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_playerOneId_fkey" FOREIGN KEY ("playerOneId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_playerTwoId_fkey" FOREIGN KEY ("playerTwoId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clips" ADD CONSTRAINT "clips_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clips" ADD CONSTRAINT "clips_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history_entries" ADD CONSTRAINT "watch_history_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history_entries" ADD CONSTRAINT "watch_history_entries_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

