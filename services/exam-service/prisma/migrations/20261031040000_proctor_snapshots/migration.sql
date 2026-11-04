CREATE TYPE "SnapshotKind" AS ENUM ('LIVE', 'SESSION_START', 'VIOLATION_RETURN', 'PERIODIC_EVIDENCE');

ALTER TABLE "exam_sessions" ADD COLUMN     "last_snapshot_at" TIMESTAMP(3),
ADD COLUMN     "snapshot_count" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "stream_nonce";

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

CREATE UNIQUE INDEX "exam_proctor_snapshots_storage_key_key" ON "exam_proctor_snapshots"("storage_key");

CREATE INDEX "exam_proctor_snapshots_session_id_kind_captured_at_idx" ON "exam_proctor_snapshots"("session_id", "kind", "captured_at");

CREATE INDEX "exam_proctor_snapshots_expires_at_idx" ON "exam_proctor_snapshots"("expires_at");

ALTER TABLE "exam_proctor_snapshots" ADD CONSTRAINT "exam_proctor_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
