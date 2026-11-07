ALTER TABLE "exam_sessions" ADD COLUMN "policy" JSONB;

ALTER TYPE "SessionEventType" ADD VALUE 'ABSENCE_GAP';