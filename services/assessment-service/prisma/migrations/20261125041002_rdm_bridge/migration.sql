-- AlterTable
ALTER TABLE "assessment_items" ADD COLUMN     "kktp" INTEGER,
ADD COLUMN     "material" VARCHAR(500);

-- CreateTable
CREATE TABLE "rdm_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "sumatif_types" "AssessmentType"[],
    "sas_type" "AssessmentType" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdm_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "rdm_settings" ("id", "sumatif_types", "sas_type", "updated_at") VALUES (1, ARRAY['DAILY','ASSIGNMENT','PRACTICAL','MIDTERM']::"AssessmentType"[], 'FINAL', now());
