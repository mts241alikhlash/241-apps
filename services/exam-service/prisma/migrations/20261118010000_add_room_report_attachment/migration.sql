ALTER TYPE "SessionAuditAction" ADD VALUE 'REPLACE_ROOM_REPORT_FILE';

ALTER TABLE "exam_room_reports"
  ADD COLUMN "attachment_storage_key" VARCHAR(255),
  ADD COLUMN "attachment_mime_type" VARCHAR(100),
  ADD COLUMN "attachment_size_bytes" INTEGER,
  ADD COLUMN "attachment_original_name" VARCHAR(255),
  ADD COLUMN "attachment_uploaded_by_id" UUID,
  ADD COLUMN "attachment_uploaded_at" TIMESTAMP(3);
