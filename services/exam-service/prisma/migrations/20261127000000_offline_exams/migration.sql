CREATE TYPE "ExamDeliveryMode" AS ENUM ('ONLINE', 'OFFLINE');

CREATE TYPE "ExamOfflineKind" AS ENUM ('WRITTEN', 'PRACTICAL');

ALTER TABLE "exam_activities"
    ADD COLUMN "delivery_mode" "ExamDeliveryMode" NOT NULL DEFAULT 'ONLINE',
    ADD COLUMN "offline_kind" "ExamOfflineKind",
    ADD COLUMN "max_score" DOUBLE PRECISION NOT NULL DEFAULT 100,
    ADD COLUMN "auto_status" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "exam_schedules"
    ADD COLUMN "delivery_mode" "ExamDeliveryMode" NOT NULL DEFAULT 'ONLINE',
    ALTER COLUMN "package_id" DROP NOT NULL;

ALTER TABLE "exam_schedules"
    ADD CONSTRAINT "exam_schedules_offline_without_package_check"
    CHECK ("delivery_mode" <> 'OFFLINE' OR "package_id" IS NULL);

ALTER TABLE "exam_activities"
    ADD CONSTRAINT "exam_activities_offline_kind_check"
    CHECK (("delivery_mode" = 'OFFLINE') = ("offline_kind" IS NOT NULL));

ALTER TABLE "exam_activities"
    ADD CONSTRAINT "exam_activities_offline_without_package_check"
    CHECK ("delivery_mode" <> 'OFFLINE' OR "package_id" IS NULL);

CREATE TABLE "exam_offline_results" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "raw_score" DOUBLE PRECISION,
    "note" VARCHAR(300) NOT NULL DEFAULT '',
    "entered_by_id" UUID NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "publication_status" "ScorePublicationStatus" NOT NULL DEFAULT 'PENDING',
    "publication_attempts" INTEGER NOT NULL DEFAULT 0,
    "publication_error" VARCHAR(300),
    "last_attempt_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "exam_offline_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_offline_results_schedule_id_student_id_key" ON "exam_offline_results"("schedule_id", "student_id");

CREATE INDEX "exam_offline_results_schedule_id_idx" ON "exam_offline_results"("schedule_id");

CREATE INDEX "exam_offline_results_publication_status_last_attempt_at_idx" ON "exam_offline_results"("publication_status", "last_attempt_at");

ALTER TABLE "exam_offline_results" ADD CONSTRAINT "exam_offline_results_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "exam_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
