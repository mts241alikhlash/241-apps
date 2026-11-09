CREATE TABLE "student_participant_numbers" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "grade_level" INTEGER NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_participant_numbers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_participant_numbers_student_id_idx" ON "student_participant_numbers"("student_id");

CREATE UNIQUE INDEX "student_participant_numbers_semester_id_grade_level_ordinal_key" ON "student_participant_numbers"("semester_id", "grade_level", "ordinal");

CREATE UNIQUE INDEX "student_participant_numbers_semester_id_student_id_key" ON "student_participant_numbers"("semester_id", "student_id");

ALTER TABLE "student_participant_numbers" ADD CONSTRAINT "student_participant_numbers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
