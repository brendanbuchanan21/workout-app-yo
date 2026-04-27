-- Backfill legacy Exercise rows that were created before catalogId became required.
-- Preference order:
-- 1. User-owned ExerciseCatalog entry with the same name as the session exercise.
-- 2. Default ExerciseCatalog entry with the same name.

UPDATE "Exercise" AS e
SET "catalogId" = COALESCE(
  (
    SELECT ec."id"
    FROM "WorkoutSession" AS ws
    JOIN "ExerciseCatalog" AS ec
      ON ec."name" = e."exerciseName"
     AND ec."userId" = ws."userId"
    WHERE ws."id" = e."workoutSessionId"
    LIMIT 1
  ),
  (
    SELECT ec."id"
    FROM "ExerciseCatalog" AS ec
    WHERE ec."name" = e."exerciseName"
      AND ec."isDefault" = true
    LIMIT 1
  )
)
WHERE e."catalogId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Exercise" WHERE "catalogId" IS NULL) THEN
    RAISE EXCEPTION 'Exercise catalog backfill incomplete: rows with NULL catalogId remain';
  END IF;
END $$;

ALTER TABLE "Exercise"
ALTER COLUMN "catalogId" SET NOT NULL;
