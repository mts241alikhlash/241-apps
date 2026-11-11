import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import type { Prisma } from '../../../../generated/prisma/client.js'
import type {
  ActivityStatus,
  ActivityTokenMode,
  ExamActivity,
} from '../../../domain/entities/exam-activity.entity.js'
import type { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { parsePolicy } from '../../../domain/policies/exam-policy.policy.js'

interface ActivityRow {
  id: string
  semesterId: string
  eventId: string | null
  gradeId: string
  subjectId: string
  packageId: string
  type: ExamActivity['type']
  tokenMode: ActivityTokenMode
  tokenRotation: number
  presetId: string | null
  policy: unknown
  startsAt: Date
  endsAt: Date
  durationMinutes: number
  status: ActivityStatus
  createdById: string
}

function toEntity(row: ActivityRow): ExamActivity {
  return {
    id: row.id,
    semesterId: row.semesterId,
    eventId: row.eventId,
    gradeId: row.gradeId,
    subjectId: row.subjectId,
    packageId: row.packageId,
    type: row.type,
    tokenMode: row.tokenMode,
    tokenRotation: row.tokenRotation,
    presetId: row.presetId,
    policy: parsePolicy(row.policy),
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    durationMinutes: row.durationMinutes,
    status: row.status,
    createdById: row.createdById,
  }
}

@Injectable()
export class PrismaExamActivityRepository implements ExamActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPreset(name: string) {
    return this.prisma.examPolicyPreset.findUnique({
      where: { name },
      select: { id: true, policy: true },
    })
  }

  async findEventRef(eventId: string) {
    return this.prisma.examEvent.findUnique({
      where: { id: eventId },
      select: { type: true, status: true, startsAt: true, endsAt: true },
    })
  }

  async create(input: Parameters<ExamActivityRepository['create']>[0]) {
    const { activity, classroomIds, actorId } = input
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.examActivity.create({
        data: {
          semesterId: activity.semesterId,
          eventId: activity.eventId,
          gradeId: activity.gradeId,
          subjectId: activity.subjectId,
          packageId: activity.packageId,
          type: activity.type,
          tokenMode: activity.tokenMode,
          presetId: activity.presetId,
          policy: activity.policy as unknown as Prisma.InputJsonValue,
          startsAt: activity.startsAt,
          endsAt: activity.endsAt,
          durationMinutes: activity.durationMinutes,
          createdById: activity.createdById,
        },
      })
      await tx.examSchedule.createMany({
        data: classroomIds.map((classroomId) => ({
          packageId: activity.packageId,
          classroomId,
          semesterId: activity.semesterId,
          eventId: activity.eventId,
          startsAt: activity.startsAt,
          endsAt: activity.endsAt,
          durationMinutes: activity.durationMinutes,
          type: activity.type,
          createdById: activity.createdById,
          activityId: created.id,
        })),
      })
      await tx.examActivityAuditLog.create({
        data: {
          activityId: created.id,
          actorId,
          action: 'CREATE_ACTIVITY',
          after: created,
        },
      })
      return toEntity(created)
    })
  }

  async findById(id: string) {
    const row = await this.prisma.examActivity.findUnique({ where: { id } })
    return row === null ? null : toEntity(row)
  }

  async updatePolicy(
    id: string,
    policy: ExamActivity['policy'],
    actorId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.examActivity.findUnique({ where: { id } })
      if (before === null) return null
      const updated = await tx.examActivity.update({
        where: { id },
        data: { policy: policy as unknown as Prisma.InputJsonValue },
      })
      await tx.examActivityAuditLog.create({
        data: {
          activityId: id,
          actorId,
          action: 'UPDATE_POLICY',
          before: before.policy as unknown as Prisma.InputJsonValue,
          after: policy as unknown as Prisma.InputJsonValue,
        },
      })
      return toEntity(updated)
    })
  }

  async rotateToken(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.examActivity.findUnique({ where: { id } })
      if (before === null) return null
      const updated = await tx.examActivity.update({
        where: { id },
        data: { tokenRotation: { increment: 1 } },
      })
      await tx.examActivityAuditLog.create({
        data: {
          activityId: id,
          actorId,
          action: 'ROTATE_TOKEN',
          before: { tokenRotation: before.tokenRotation },
          after: { tokenRotation: updated.tokenRotation },
        },
      })
      return toEntity(updated)
    })
  }

  async listSchedules(activityId: string) {
    return this.prisma.examSchedule.findMany({
      where: { activityId },
      select: { id: true, classroomId: true },
    })
  }

  async listBySemester(semesterId: string) {
    const rows = await this.prisma.examActivity.findMany({
      where: { semesterId },
      orderBy: { startsAt: 'asc' },
    })
    return rows.map(toEntity)
  }

  async updateStatus(id: string, status: ActivityStatus, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.examActivity.findUnique({ where: { id } })
      if (before === null) return null
      const updated = await tx.examActivity.update({
        where: { id },
        data: { status },
      })
      await tx.examActivityAuditLog.create({
        data: {
          activityId: id,
          actorId,
          action: 'UPDATE_STATUS',
          before: { status: before.status },
          after: { status: updated.status },
        },
      })
      return toEntity(updated)
    })
  }
}
