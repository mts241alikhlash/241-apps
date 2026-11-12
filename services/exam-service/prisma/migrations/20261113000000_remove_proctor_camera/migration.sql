DROP TABLE "exam_proctor_snapshots";
DROP TYPE "SnapshotKind";
ALTER TABLE "exam_sessions"
  DROP COLUMN "last_snapshot_at",
  DROP COLUMN "snapshot_count",
  DROP COLUMN "camera_blocked";
UPDATE "exam_policy_presets" SET "policy" = "policy" - 'snapshotIntervalMs';
UPDATE "exam_activities" SET "policy" = "policy" - 'snapshotIntervalMs';
UPDATE "exam_sessions" SET "policy" = "policy" - 'snapshotIntervalMs' WHERE "policy" IS NOT NULL;
