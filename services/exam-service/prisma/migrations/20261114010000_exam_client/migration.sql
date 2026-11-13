CREATE TYPE "ExamClient" AS ENUM ('ISTIQRA', 'SEB');

ALTER TABLE "exam_sessions"
  ADD COLUMN "client" "ExamClient" NOT NULL DEFAULT 'ISTIQRA',
  DROP COLUMN "allow_web_client";

ALTER TABLE "exam_room_seats"
  DROP COLUMN "allow_web_client";

ALTER TABLE "exam_events"
  DROP COLUMN "require_android_app";
