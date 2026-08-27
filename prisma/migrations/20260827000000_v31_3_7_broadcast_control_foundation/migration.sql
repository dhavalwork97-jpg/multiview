-- CreateEnum
CREATE TYPE "BroadcastScene" AS ENUM (
  'OFFLINE',
  'WAITING',
  'MATCH',
  'BREAK',
  'INTERMISSION',
  'RESULTS'
);

-- CreateEnum
CREATE TYPE "BroadcastCommandType" AS ENUM (
  'SET_SCENE',
  'SELECT_STATION',
  'SELECT_MATCH',
  'UPDATE_OVERLAY',
  'CLEAR_SELECTION'
);

-- CreateTable
CREATE TABLE "broadcast_states" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "scene" "BroadcastScene" NOT NULL DEFAULT 'OFFLINE',
  "stationId" TEXT,
  "matchId" TEXT,
  "overlay" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "broadcast_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_commands" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" "BroadcastCommandType" NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "broadcast_commands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_states_tournamentId_key"
  ON "broadcast_states"("tournamentId");

CREATE INDEX "broadcast_states_scene_idx"
  ON "broadcast_states"("scene");

CREATE INDEX "broadcast_states_stationId_idx"
  ON "broadcast_states"("stationId");

CREATE INDEX "broadcast_states_matchId_idx"
  ON "broadcast_states"("matchId");

CREATE INDEX "broadcast_commands_tournamentId_createdAt_idx"
  ON "broadcast_commands"("tournamentId", "createdAt");

CREATE INDEX "broadcast_commands_type_idx"
  ON "broadcast_commands"("type");

-- AddForeignKey
ALTER TABLE "broadcast_states"
  ADD CONSTRAINT "broadcast_states_tournamentId_fkey"
  FOREIGN KEY ("tournamentId")
  REFERENCES "tournaments"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "broadcast_states"
  ADD CONSTRAINT "broadcast_states_stationId_fkey"
  FOREIGN KEY ("stationId")
  REFERENCES "stations"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "broadcast_states"
  ADD CONSTRAINT "broadcast_states_matchId_fkey"
  FOREIGN KEY ("matchId")
  REFERENCES "matches"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "broadcast_commands"
  ADD CONSTRAINT "broadcast_commands_tournamentId_fkey"
  FOREIGN KEY ("tournamentId")
  REFERENCES "tournaments"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;