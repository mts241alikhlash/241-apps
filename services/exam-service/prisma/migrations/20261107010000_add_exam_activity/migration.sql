CREATE TYPE "ActivityTokenMode" AS ENUM ('ROTATING', 'STATIC');

CREATE TYPE "ActivityStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSED');

CREATE TABLE "exam_policy_presets" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "policy" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "exam_policy_presets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_policy_presets_name_key" ON "exam_policy_presets"("name");

CREATE TABLE "exam_activities" (
    "id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "event_id" UUID,
    "grade_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "type" "ExamType" NOT NULL,
    "token_mode" "ActivityTokenMode" NOT NULL DEFAULT 'ROTATING',
    "token_rotation" INTEGER NOT NULL DEFAULT 0,
    "preset_id" UUID,
    "policy" JSONB NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "exam_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exam_activities_semester_id_status_idx" ON "exam_activities"("semester_id", "status");

CREATE INDEX "exam_activities_grade_id_starts_at_idx" ON "exam_activities"("grade_id", "starts_at");

ALTER TABLE "exam_activities"
    ADD CONSTRAINT "exam_activities_preset_id_fkey" FOREIGN KEY ("preset_id") REFERENCES "exam_policy_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "exam_activity_audit_logs" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exam_activity_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exam_activity_audit_logs_activity_id_at_idx" ON "exam_activity_audit_logs"("activity_id", "at");

ALTER TABLE "exam_activity_audit_logs"
    ADD CONSTRAINT "exam_activity_audit_logs_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "exam_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_schedules" ADD COLUMN "activity_id" UUID;

CREATE INDEX "exam_schedules_activity_id_idx" ON "exam_schedules"("activity_id");

ALTER TABLE "exam_schedules"
    ADD CONSTRAINT "exam_schedules_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "exam_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;