CREATE TYPE "OfflinePublicationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "exam_offline_results" ALTER COLUMN "publication_status" DROP DEFAULT;
ALTER TABLE "exam_offline_results" ALTER COLUMN "publication_status" DROP NOT NULL;
ALTER TABLE "exam_offline_results"
  ALTER COLUMN "publication_status" TYPE "OfflinePublicationStatus"
  USING ("publication_status"::text::"OfflinePublicationStatus");
