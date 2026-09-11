-- A station can only host one active match at a time.
-- Keep a live assignment ahead of queued assignments, then the oldest
-- remaining assignment, before enforcing the invariant for future writes.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY station_id
      ORDER BY
        CASE WHEN status = 'LIVE' THEN 0 ELSE 1 END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM matches
  WHERE station_id IS NOT NULL
    AND status IN ('QUEUED', 'LIVE')
)
UPDATE matches
SET station_id = NULL
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "matches_one_active_match_per_station"
ON "matches" ("station_id")
WHERE "station_id" IS NOT NULL
  AND "status" IN ('QUEUED', 'LIVE');
