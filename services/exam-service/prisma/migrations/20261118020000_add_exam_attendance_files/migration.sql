ALTER TYPE "SessionAuditAction" ADD VALUE 'UPLOAD_ATTENDANCE_FILE';

CREATE TYPE "AttendanceFileKind" AS ENUM ('STUDENT', 'SUPERVISOR', 'TECHNICIAN');

CREATE TABLE "exam_attendance_files" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "kind" "AttendanceFileKind" NOT NULL,
  "room_id" UUID,
  "slot_id" UUID,
  "day" VARCHAR(10) NOT NULL,
  "scope_key" VARCHAR(120) NOT NULL,
  "storage_key" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "uploaded_by_id" UUID NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "exam_attendance_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_attendance_files_scope_key_key" ON "exam_attendance_files"("scope_key");
CREATE INDEX "exam_attendance_files_event_id_kind_day_idx" ON "exam_attendance_files"("event_id", "kind", "day");

ALTER TABLE "exam_attendance_files"
  ADD CONSTRAINT "exam_attendance_files_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "exam_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
