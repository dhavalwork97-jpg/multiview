CREATE TABLE "community_predictions" (
  "id" TEXT NOT NULL,
  "match_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "predicted_player_id" TEXT,
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "points" INTEGER NOT NULL DEFAULT 0,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_predictions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_predictions_predicted_player_id_fkey" FOREIGN KEY ("predicted_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "community_predictions_match_id_user_id_key" ON "community_predictions"("match_id", "user_id");
CREATE INDEX "community_predictions_user_id_points_idx" ON "community_predictions"("user_id", "points");
CREATE INDEX "community_predictions_match_id_resolved_idx" ON "community_predictions"("match_id", "resolved");

CREATE TABLE "community_polls" (
  "id" TEXT NOT NULL,
  "match_id" TEXT NOT NULL,
  "question" VARCHAR(240) NOT NULL,
  "options" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "closes_at" TIMESTAMP(3),
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_polls_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_polls_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_polls_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "community_polls_match_id_status_idx" ON "community_polls"("match_id", "status");

CREATE TABLE "community_poll_votes" (
  "id" TEXT NOT NULL,
  "poll_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "option_index" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_poll_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "community_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "community_poll_votes_poll_id_user_id_key" ON "community_poll_votes"("poll_id", "user_id");

CREATE TABLE "community_mvp_votes" (
  "id" TEXT NOT NULL,
  "tournament_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "player_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_mvp_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_mvp_votes_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_mvp_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_mvp_votes_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "community_mvp_votes_tournament_id_user_id_key" ON "community_mvp_votes"("tournament_id", "user_id");
CREATE INDEX "community_mvp_votes_tournament_id_player_id_idx" ON "community_mvp_votes"("tournament_id", "player_id");

CREATE TABLE "community_pickems" (
  "id" TEXT NOT NULL,
  "tournament_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "picks" JSONB NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_pickems_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_pickems_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_pickems_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "community_pickems_tournament_id_user_id_key" ON "community_pickems"("tournament_id", "user_id");
CREATE INDEX "community_pickems_tournament_id_points_idx" ON "community_pickems"("tournament_id", "points");
