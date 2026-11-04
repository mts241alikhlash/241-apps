CREATE TYPE "ItemResolution" AS ENUM ('NORMAL', 'BONUS_ALL', 'KEY_OVERRIDE');

CREATE TYPE "ExamEventStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

CREATE TYPE "SessionEventType" AS ENUM ('PERMISSION_DIALOG', 'SCREEN_OFF', 'FOCUS_LOST_BRIEF', 'OVERLAY_OR_SHADE', 'CALL_OR_MIC_ACTIVE', 'SCREEN_SHARE_DETECTED', 'LEFT_APP', 'VIOLATION_LOCKED');

CREATE TYPE "SessionAuditAction" AS ENUM ('RELEASE_DEVICE', 'REOPEN_SESSION', 'RESET_SESSION', 'EXTEND_TIME', 'ALLOW_WEB_CLIENT', 'ALLOW_LATE_ENTRY', 'ROTATE_ROOM_TOKEN', 'SUBSTITUTE_SUPERVISOR');

ALTER TABLE "exam_package_items" ADD COLUMN     "adjusted_at" TIMESTAMP(3),
ADD COLUMN     "adjusted_by_id" UUID,
ADD COLUMN     "adjusted_reason" VARCHAR(300),
ADD COLUMN     "override_content" JSONB,
ADD COLUMN     "resolution" "ItemResolution" NOT NULL DEFAULT 'NORMAL';

ALTER TABLE "exam_schedules" ADD COLUMN     "event_id" UUID;

ALTER TABLE "exam_sessions" ADD COLUMN     "allow_late_entry" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allow_web_client" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "extra_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kiosk_mode" VARCHAR(32) NOT NULL DEFAULT 'PINNED',
ADD COLUMN     "locked_by_violation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_token_reentry" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "room_id" UUID,
ADD COLUMN     "seat_number" INTEGER;

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

CREATE TABLE "exam_room_seats" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "seat_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_room_seats_pkey" PRIMARY KEY ("id")
);

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

CREATE INDEX "exam_events_semester_id_status_idx" ON "exam_events"("semester_id", "status");

CREATE INDEX "exam_rooms_technician_user_id_idx" ON "exam_rooms"("technician_user_id");

CREATE UNIQUE INDEX "exam_rooms_event_id_code_key" ON "exam_rooms"("event_id", "code");

CREATE INDEX "exam_room_seats_student_id_idx" ON "exam_room_seats"("student_id");

CREATE UNIQUE INDEX "exam_room_seats_event_id_student_id_key" ON "exam_room_seats"("event_id", "student_id");

CREATE UNIQUE INDEX "exam_room_seats_room_id_seat_number_key" ON "exam_room_seats"("room_id", "seat_number");

CREATE INDEX "exam_room_supervisors_room_id_starts_at_ends_at_idx" ON "exam_room_supervisors"("room_id", "starts_at", "ends_at");

CREATE INDEX "exam_room_supervisors_actual_user_id_starts_at_ends_at_idx" ON "exam_room_supervisors"("actual_user_id", "starts_at", "ends_at");

CREATE INDEX "exam_session_events_session_id_occurred_at_idx" ON "exam_session_events"("session_id", "occurred_at");

CREATE UNIQUE INDEX "exam_session_events_session_id_client_id_key" ON "exam_session_events"("session_id", "client_id");

CREATE INDEX "exam_session_audit_logs_session_id_created_at_idx" ON "exam_session_audit_logs"("session_id", "created_at");

CREATE INDEX "exam_session_audit_logs_room_id_created_at_idx" ON "exam_session_audit_logs"("room_id", "created_at");

CREATE INDEX "exam_schedules_event_id_idx" ON "exam_schedules"("event_id");

CREATE INDEX "exam_sessions_room_id_idx" ON "exam_sessions"("room_id");

ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "exam_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "exam_rooms" ADD CONSTRAINT "exam_rooms_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "exam_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "exam_room_seats" ADD CONSTRAINT "exam_room_seats_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "exam_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_room_supervisors" ADD CONSTRAINT "exam_room_supervisors_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "exam_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "exam_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "exam_session_events" ADD CONSTRAINT "exam_session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

