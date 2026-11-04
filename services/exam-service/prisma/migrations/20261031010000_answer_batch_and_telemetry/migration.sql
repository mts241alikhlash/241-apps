ALTER TABLE "exam_schedules"
  ADD COLUMN "min_submit_minutes" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "exam_sessions"
  ADD COLUMN "synced_answer_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "unsynced_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_battery_level" INTEGER,
  ADD COLUMN "is_charging" BOOLEAN;
