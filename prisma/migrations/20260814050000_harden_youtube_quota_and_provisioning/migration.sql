-- YouTube provisioning lock on each physical station.
ALTER TABLE "stations" ADD COLUMN "youtubeProvisioningAt" TIMESTAMP(3);

-- Application-side daily quota safety ledger.
CREATE TABLE "youtube_quota_ledger" (
  "dayKey" TEXT NOT NULL,
  "units" INTEGER NOT NULL DEFAULT 0,
  "blockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "youtube_quota_ledger_pkey" PRIMARY KEY ("dayKey")
);
