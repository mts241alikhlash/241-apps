CREATE TYPE "RoomReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED');

CREATE TYPE "RoomExecutionCondition" AS ENUM ('SMOOTH', 'TECHNICAL_ISSUE', 'DISCIPLINARY_NOTE');

CREATE TABLE "exam_room_reports" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "supervisor_slot_id" UUID NOT NULL,
    "condition" "RoomExecutionCondition" NOT NULL DEFAULT 'SMOOTH',
    "incident_notes" TEXT,
    "submitted_by_user_id" UUID,
    "submitted_at" TIMESTAMP(3),
    "verified_by_user_id" UUID,
    "verified_at" TIMESTAMP(3),
    "status" "RoomReportStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_room_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_room_report_absences" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "reason" "MakeupReason" NOT NULL,
    "note" VARCHAR(200),
    "recorded_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_room_report_absences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_room_field_notes" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "session_id" UUID,
    "category" VARCHAR(50) NOT NULL,
    "note" VARCHAR(300) NOT NULL,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_room_field_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_room_reports_supervisor_slot_id_key" ON "exam_room_reports"("supervisor_slot_id");

CREATE INDEX "exam_room_reports_room_id_status_idx" ON "exam_room_reports"("room_id", "status");

CREATE INDEX "exam_room_report_absences_schedule_id_student_id_idx" ON "exam_room_report_absences"("schedule_id", "student_id");

CREATE UNIQUE INDEX "exam_room_report_absences_report_id_student_id_schedule_id_key" ON "exam_room_report_absences"("report_id", "student_id", "schedule_id");

CREATE INDEX "exam_room_field_notes_report_id_student_id_idx" ON "exam_room_field_notes"("report_id", "student_id");

ALTER TABLE "exam_room_reports" ADD CONSTRAINT "exam_room_reports_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "exam_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_room_report_absences" ADD CONSTRAINT "exam_room_report_absences_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "exam_room_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_room_field_notes" ADD CONSTRAINT "exam_room_field_notes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "exam_room_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
