-- AlterTable
ALTER TABLE "exam_sessions" ADD COLUMN     "battery_unrestricted" BOOLEAN,
ADD COLUMN     "dnd_granted" BOOLEAN,
ADD COLUMN     "lock_task_active" BOOLEAN;
