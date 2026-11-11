CREATE TYPE "ExamType_new" AS ENUM ('DAILY', 'ASSIGNMENT', 'MIDTERM', 'FINAL');

ALTER TABLE "exam_schedules" ALTER COLUMN "type" DROP DEFAULT;

ALTER TABLE "exam_activities"
  ALTER COLUMN "type" TYPE "ExamType_new"
  USING (
    CASE "type"::text
      WHEN 'UH' THEN 'DAILY'::"ExamType_new"
      WHEN 'QUIZ' THEN 'DAILY'::"ExamType_new"
      WHEN 'ASSIGNMENT' THEN 'ASSIGNMENT'::"ExamType_new"
      WHEN 'UTS' THEN 'MIDTERM'::"ExamType_new"
      WHEN 'UAS' THEN 'FINAL'::"ExamType_new"
      ELSE 'DAILY'::"ExamType_new"
    END
  );

ALTER TABLE "exam_schedules"
  ALTER COLUMN "type" TYPE "ExamType_new"
  USING (
    CASE "type"::text
      WHEN 'UH' THEN 'DAILY'::"ExamType_new"
      WHEN 'QUIZ' THEN 'DAILY'::"ExamType_new"
      WHEN 'ASSIGNMENT' THEN 'ASSIGNMENT'::"ExamType_new"
      WHEN 'UTS' THEN 'MIDTERM'::"ExamType_new"
      WHEN 'UAS' THEN 'FINAL'::"ExamType_new"
      ELSE 'DAILY'::"ExamType_new"
    END
  );

ALTER TABLE "exam_events"
  ALTER COLUMN "type" TYPE "ExamType_new"
  USING (
    CASE "type"::text
      WHEN 'UH' THEN 'DAILY'::"ExamType_new"
      WHEN 'QUIZ' THEN 'DAILY'::"ExamType_new"
      WHEN 'ASSIGNMENT' THEN 'ASSIGNMENT'::"ExamType_new"
      WHEN 'UTS' THEN 'MIDTERM'::"ExamType_new"
      WHEN 'UAS' THEN 'FINAL'::"ExamType_new"
      ELSE 'MIDTERM'::"ExamType_new"
    END
  );

ALTER TABLE "exam_schedules" ALTER COLUMN "type" SET DEFAULT 'DAILY';

DROP TYPE "ExamType";

ALTER TYPE "ExamType_new" RENAME TO "ExamType";

INSERT INTO "exam_policy_presets" ("id", "name", "policy", "is_default", "created_at", "updated_at")
VALUES
  (
    gen_random_uuid(),
    'MIDTERM',
    COALESCE(
      (SELECT "policy" FROM "exam_policy_presets" WHERE "name" = 'UJIAN_KETAT'),
      '{"violationLimit":3,"focusThresholdMs":10000,"snapshotIntervalMs":15000,"heartbeatIntervalMs":15000,"gapRecordedMs":60000,"gapTokenMs":300000,"gapViolationFrom":2,"tokenSlotSeconds":600}'::jsonb
    ),
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'FINAL',
    COALESCE(
      (SELECT "policy" FROM "exam_policy_presets" WHERE "name" = 'UJIAN_KETAT'),
      '{"violationLimit":3,"focusThresholdMs":10000,"snapshotIntervalMs":15000,"heartbeatIntervalMs":15000,"gapRecordedMs":60000,"gapTokenMs":300000,"gapViolationFrom":2,"tokenSlotSeconds":600}'::jsonb
    ),
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'DAILY',
    COALESCE(
      (SELECT "policy" FROM "exam_policy_presets" WHERE "name" = 'ULANGAN_KELAS'),
      '{"violationLimit":3,"focusThresholdMs":10000,"snapshotIntervalMs":15000,"heartbeatIntervalMs":15000,"gapRecordedMs":60000,"gapTokenMs":300000,"gapViolationFrom":2,"tokenSlotSeconds":600}'::jsonb
    ),
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'ASSIGNMENT',
    COALESCE(
      (SELECT "policy" FROM "exam_policy_presets" WHERE "name" = 'TUGAS'),
      '{"violationLimit":3,"focusThresholdMs":10000,"snapshotIntervalMs":30000,"heartbeatIntervalMs":15000,"gapRecordedMs":300000,"gapTokenMs":1800000,"gapViolationFrom":3,"tokenSlotSeconds":600}'::jsonb
    ),
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("name") DO NOTHING;

UPDATE "exam_activities" AS a
SET "preset_id" = p."id"
FROM "exam_policy_presets" AS p
WHERE p."name" = a."type"::text;

DELETE FROM "exam_policy_presets"
WHERE "name" IN ('UJIAN_KETAT', 'ULANGAN_KELAS', 'TUGAS');

ALTER TABLE "exam_policy_presets" DROP COLUMN "is_default";
