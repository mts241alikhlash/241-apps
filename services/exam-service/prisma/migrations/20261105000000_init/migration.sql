-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ExamPackageStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "PackageReviewAction" AS ENUM ('SUBMIT', 'APPROVE', 'RETURN');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('UH', 'QUIZ', 'ASSIGNMENT', 'UTS', 'UAS');

-- CreateEnum
CREATE TYPE "ExamScheduleStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItemResolution" AS ENUM ('NORMAL', 'BONUS_ALL', 'KEY_OVERRIDE');

-- CreateEnum
CREATE TYPE "ExamScheduleKind" AS ENUM ('REGULAR', 'MAKEUP');

-- CreateEnum
CREATE TYPE "MakeupReason" AS ENUM ('SICK', 'PERMITTED', 'ABSENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExamEventStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RoomReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "RoomExecutionCondition" AS ENUM ('SMOOTH', 'TECHNICAL_ISSUE', 'DISCIPLINARY_NOTE');

-- CreateEnum
CREATE TYPE "ExamSessionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADED');

-- CreateEnum
CREATE TYPE "ScorePublicationStatus" AS ENUM ('PENDING', 'SENT');

-- CreateEnum
CREATE TYPE "SessionEventType" AS ENUM ('PERMISSION_DIALOG', 'SCREEN_OFF', 'FOCUS_LOST_BRIEF', 'OVERLAY_OR_SHADE', 'CALL_OR_MIC_ACTIVE', 'SCREEN_SHARE_DETECTED', 'LEFT_APP', 'VIOLATION_LOCKED');

-- CreateEnum
CREATE TYPE "SessionAuditAction" AS ENUM ('RELEASE_DEVICE', 'REOPEN_SESSION', 'RESET_SESSION', 'EXTEND_TIME', 'ALLOW_WEB_CLIENT', 'ALLOW_LATE_ENTRY', 'ROTATE_ROOM_TOKEN', 'SUBSTITUTE_SUPERVISOR', 'ASSIGN_SUPERVISOR', 'SUBMIT_ROOM_REPORT', 'VERIFY_ROOM_REPORT', 'REOPEN_ROOM_REPORT');

-- CreateEnum
CREATE TYPE "SnapshotKind" AS ENUM ('LIVE', 'SESSION_START', 'VIOLATION_RETURN', 'PERIODIC_EVIDENCE');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY');

-- CreateTable
CREATE TABLE "exam_packages" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "subject_id" UUID NOT NULL,
    "grade_id" UUID NOT NULL,
    "status" "ExamPackageStatus" NOT NULL DEFAULT 'DRAFT',
    "locked_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exam_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_package_reviews" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "action" "PackageReviewAction" NOT NULL,
    "by_user_id" UUID NOT NULL,
    "note" TEXT,
    "question_notes" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_package_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_package_items" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "question_version" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "resolution" "ItemResolution" NOT NULL DEFAULT 'NORMAL',
    "override_content" JSONB,
    "adjusted_by_id" UUID,
    "adjusted_reason" VARCHAR(300),
    "adjusted_at" TIMESTAMP(3),

    CONSTRAINT "exam_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_schedules" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "event_id" UUID,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "type" "ExamType" NOT NULL DEFAULT 'UH',
    "kind" "ExamScheduleKind" NOT NULL DEFAULT 'REGULAR',
    "makeup_of_id" UUID,
    "token_rotation" INTEGER NOT NULL DEFAULT 0,
    "min_submit_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" "ExamScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_schedule_participants" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "reason" "MakeupReason" NOT NULL,
    "note" VARCHAR(200),
    "added_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_schedule_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_events" (
    "id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "ExamType" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "late_tolerance_minutes" INTEGER NOT NULL DEFAULT 30,
    "min_submit_minutes" INTEGER NOT NULL DEFAULT 20,
    "require_android_app" BOOLEAN NOT NULL DEFAULT true,
    "status" "ExamEventStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_rooms" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "building" VARCHAR(100),
    "capacity" INTEGER NOT NULL,
    "technician_user_id" UUID,
    "token_rotation" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_room_seats" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "seat_number" INTEGER NOT NULL,
    "allow_web_client" BOOLEAN NOT NULL DEFAULT false,
    "allow_late_entry" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_room_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_room_supervisors" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "scheduled_user_id" UUID NOT NULL,
    "actual_user_id" UUID NOT NULL,
    "substituted_by_admin_id" UUID,
    "substitute_reason" VARCHAR(200),
    "substituted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_room_supervisors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "exam_sessions" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" VARCHAR(100),
    "enrollment_id" UUID,
    "shuffle_seed" VARCHAR(32) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "finalize_at" TIMESTAMP(3) NOT NULL,
    "status" "ExamSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "submitted_at" TIMESTAMP(3),
    "raw_score" DOUBLE PRECISION,
    "max_score" DOUBLE PRECISION,
    "released_at" TIMESTAMP(3),
    "released_by_id" UUID,
    "graded_at" TIMESTAMP(3),
    "violation_count" INTEGER NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMP(3),
    "absent_since" TIMESTAMP(3),
    "last_snapshot_at" TIMESTAMP(3),
    "snapshot_count" INTEGER NOT NULL DEFAULT 0,
    "camera_blocked" VARCHAR(32),
    "room_id" UUID,
    "seat_number" INTEGER,
    "requires_token_reentry" BOOLEAN NOT NULL DEFAULT false,
    "locked_by_violation" BOOLEAN NOT NULL DEFAULT false,
    "allow_web_client" BOOLEAN NOT NULL DEFAULT false,
    "allow_late_entry" BOOLEAN NOT NULL DEFAULT false,
    "extra_minutes" INTEGER NOT NULL DEFAULT 0,
    "kiosk_mode" VARCHAR(32) NOT NULL DEFAULT 'PINNED',
    "synced_answer_count" INTEGER NOT NULL DEFAULT 0,
    "unsynced_count" INTEGER NOT NULL DEFAULT 0,
    "last_battery_level" INTEGER,
    "is_charging" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_answers" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "client_id" VARCHAR(64) NOT NULL,
    "received_after_deadline" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "graded_by_id" UUID,
    "graded_at" TIMESTAMP(3),
    "grade_note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_access_attempts" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_access_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_publications" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "status" "ScorePublicationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "permanent_failures" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(300),
    "last_attempt_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_session_events" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "client_id" VARCHAR(64) NOT NULL,
    "type" "SessionEventType" NOT NULL,
    "is_violation" BOOLEAN NOT NULL DEFAULT false,
    "detail" VARCHAR(200),
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_session_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_session_audit_logs" (
    "id" UUID NOT NULL,
    "session_id" UUID,
    "room_id" UUID,
    "schedule_id" UUID,
    "action" "SessionAuditAction" NOT NULL,
    "actor_id" UUID NOT NULL,
    "reason" VARCHAR(300) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_session_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_proctor_snapshots" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "kind" "SnapshotKind" NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_proctor_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "grade_id" UUID NOT NULL,
    "author_employee_id" UUID NOT NULL,
    "type" "QuestionType" NOT NULL,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "copied_from_question_id" UUID,
    "copied_from_version" INTEGER,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_versions" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "body_html" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_files" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_packages_subject_id_grade_id_status_idx" ON "exam_packages"("subject_id", "grade_id", "status");

-- CreateIndex
CREATE INDEX "exam_packages_status_idx" ON "exam_packages"("status");

-- CreateIndex
CREATE INDEX "exam_package_reviews_package_id_created_at_idx" ON "exam_package_reviews"("package_id", "created_at");

-- CreateIndex
CREATE INDEX "exam_package_items_question_id_idx" ON "exam_package_items"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_package_items_package_id_question_id_key" ON "exam_package_items"("package_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_package_items_package_id_position_key" ON "exam_package_items"("package_id", "position");

-- CreateIndex
CREATE INDEX "exam_schedules_classroom_id_starts_at_idx" ON "exam_schedules"("classroom_id", "starts_at");

-- CreateIndex
CREATE INDEX "exam_schedules_package_id_idx" ON "exam_schedules"("package_id");

-- CreateIndex
CREATE INDEX "exam_schedules_makeup_of_id_idx" ON "exam_schedules"("makeup_of_id");

-- CreateIndex
CREATE INDEX "exam_schedules_event_id_idx" ON "exam_schedules"("event_id");

-- CreateIndex
CREATE INDEX "exam_schedule_participants_student_id_idx" ON "exam_schedule_participants"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_schedule_participants_schedule_id_student_id_key" ON "exam_schedule_participants"("schedule_id", "student_id");

-- CreateIndex
CREATE INDEX "exam_events_semester_id_status_idx" ON "exam_events"("semester_id", "status");

-- CreateIndex
CREATE INDEX "exam_rooms_technician_user_id_idx" ON "exam_rooms"("technician_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_rooms_event_id_code_key" ON "exam_rooms"("event_id", "code");

-- CreateIndex
CREATE INDEX "exam_room_seats_student_id_idx" ON "exam_room_seats"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_room_seats_event_id_student_id_key" ON "exam_room_seats"("event_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_room_seats_room_id_seat_number_key" ON "exam_room_seats"("room_id", "seat_number");

-- CreateIndex
CREATE INDEX "exam_room_supervisors_room_id_starts_at_ends_at_idx" ON "exam_room_supervisors"("room_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "exam_room_supervisors_actual_user_id_starts_at_ends_at_idx" ON "exam_room_supervisors"("actual_user_id", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "exam_room_reports_supervisor_slot_id_key" ON "exam_room_reports"("supervisor_slot_id");

-- CreateIndex
CREATE INDEX "exam_room_reports_room_id_status_idx" ON "exam_room_reports"("room_id", "status");

-- CreateIndex
CREATE INDEX "exam_room_report_absences_schedule_id_student_id_idx" ON "exam_room_report_absences"("schedule_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_room_report_absences_report_id_student_id_schedule_id_key" ON "exam_room_report_absences"("report_id", "student_id", "schedule_id");

-- CreateIndex
CREATE INDEX "exam_room_field_notes_report_id_student_id_idx" ON "exam_room_field_notes"("report_id", "student_id");

-- CreateIndex
CREATE INDEX "exam_sessions_status_finalize_at_idx" ON "exam_sessions"("status", "finalize_at");

-- CreateIndex
CREATE INDEX "exam_sessions_room_id_idx" ON "exam_sessions"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_sessions_schedule_id_student_id_key" ON "exam_sessions"("schedule_id", "student_id");

-- CreateIndex
CREATE INDEX "exam_answers_question_id_idx" ON "exam_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_answers_session_id_question_id_key" ON "exam_answers"("session_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_answers_session_id_client_id_key" ON "exam_answers"("session_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_access_attempts_schedule_id_student_id_key" ON "exam_access_attempts"("schedule_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "score_publications_session_id_key" ON "score_publications"("session_id");

-- CreateIndex
CREATE INDEX "score_publications_status_last_attempt_at_idx" ON "score_publications"("status", "last_attempt_at");

-- CreateIndex
CREATE INDEX "exam_session_events_session_id_occurred_at_idx" ON "exam_session_events"("session_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "exam_session_events_session_id_client_id_key" ON "exam_session_events"("session_id", "client_id");

-- CreateIndex
CREATE INDEX "exam_session_audit_logs_session_id_created_at_idx" ON "exam_session_audit_logs"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "exam_session_audit_logs_room_id_created_at_idx" ON "exam_session_audit_logs"("room_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "exam_proctor_snapshots_storage_key_key" ON "exam_proctor_snapshots"("storage_key");

-- CreateIndex
CREATE INDEX "exam_proctor_snapshots_session_id_kind_captured_at_idx" ON "exam_proctor_snapshots"("session_id", "kind", "captured_at");

-- CreateIndex
CREATE INDEX "exam_proctor_snapshots_expires_at_idx" ON "exam_proctor_snapshots"("expires_at");

-- CreateIndex
CREATE INDEX "questions_subject_id_grade_id_idx" ON "questions"("subject_id", "grade_id");

-- CreateIndex
CREATE INDEX "questions_author_employee_id_idx" ON "questions"("author_employee_id");

-- CreateIndex
CREATE INDEX "questions_package_id_idx" ON "questions"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_versions_question_id_number_key" ON "question_versions"("question_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "exam_files_storage_key_key" ON "exam_files"("storage_key");

-- AddForeignKey
ALTER TABLE "exam_package_reviews" ADD CONSTRAINT "exam_package_reviews_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "exam_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_package_items" ADD CONSTRAINT "exam_package_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "exam_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_package_items" ADD CONSTRAINT "exam_package_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "exam_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "exam_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_makeup_of_id_fkey" FOREIGN KEY ("makeup_of_id") REFERENCES "exam_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_schedule_participants" ADD CONSTRAINT "exam_schedule_participants_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "exam_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_rooms" ADD CONSTRAINT "exam_rooms_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "exam_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_room_seats" ADD CONSTRAINT "exam_room_seats_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "exam_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_room_supervisors" ADD CONSTRAINT "exam_room_supervisors_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "exam_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_room_reports" ADD CONSTRAINT "exam_room_reports_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "exam_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_room_report_absences" ADD CONSTRAINT "exam_room_report_absences_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "exam_room_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_room_field_notes" ADD CONSTRAINT "exam_room_field_notes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "exam_room_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "exam_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "exam_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exam_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_publications" ADD CONSTRAINT "score_publications_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exam_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_session_events" ADD CONSTRAINT "exam_session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_proctor_snapshots" ADD CONSTRAINT "exam_proctor_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "exam_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "exam_schedules"
  ADD CONSTRAINT "exam_schedules_makeup_pairing_check"
  CHECK (("kind" = 'MAKEUP') = ("makeup_of_id" IS NOT NULL));
