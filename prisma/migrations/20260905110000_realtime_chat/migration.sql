CREATE TABLE "chat_messages" (
  "id" TEXT NOT NULL,
  "match_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "body" VARCHAR(500) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE,
  CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "chat_messages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL
);

CREATE INDEX "chat_messages_match_created_idx" ON "chat_messages"("match_id", "created_at");
CREATE INDEX "chat_messages_parent_created_idx" ON "chat_messages"("parent_id", "created_at");
CREATE INDEX "chat_messages_user_created_idx" ON "chat_messages"("user_id", "created_at");

CREATE TABLE "chat_reports" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "reporter_id" TEXT NOT NULL,
  "reason" VARCHAR(240) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE,
  CONSTRAINT "chat_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "chat_reports_unique_report" UNIQUE ("message_id", "reporter_id")
);

CREATE INDEX "chat_reports_message_created_idx" ON "chat_reports"("message_id", "created_at");

CREATE TABLE "chat_mutes" (
  "id" TEXT NOT NULL,
  "match_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "muted_by_id" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_mutes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_mutes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE,
  CONSTRAINT "chat_mutes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "chat_mutes_muted_by_id_fkey" FOREIGN KEY ("muted_by_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "chat_mutes_lookup_idx" ON "chat_mutes"("match_id", "user_id", "expires_at");
