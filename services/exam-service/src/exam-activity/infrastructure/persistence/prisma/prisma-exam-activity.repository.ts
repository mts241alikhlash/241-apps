import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { Prisma } from '../../../../generated/prisma/client.js'
import {
  SCHEDULE_INCLUDE,
  toSchedule,
} from '../../../../exam-schedule/infrastructure/persistence/prisma/prisma-exam-schedule.mapper.js'
import {
  EXAM_TYPES,
  type ExamCategory,
  type ExamType,
} from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { typesInCategory } from '../../../../exam-schedule/domain/policies/exam-category.policy.js'
import type {
  ActivityStatus,
  ActivityTokenMode,
  ExamActivity,
  ExamDeliveryMode,
  ExamOfflineKind,
} from '../../../domain/entities/exam-activity.entity.js'
import type {
  AutoStatusReason,
  ExamActivityRepository,
} from '../../../domain/repositories/exam-activity.repository.js'
import {
  DEFAULT_POLICIES,
  parsePolicy,
} from '../../../domain/policies/exam-policy.policy.js'

const MAX_LEAD_MS = 60 * 60_000

interface ActivityRow {
  id: string
  semesterId: string
  eventId: string | null
  gradeId: string
  subjectId: string
  packageId: string | null
  type: ExamActivity['type']
  tokenMode: ActivityTokenMode
  tokenRotation: number
  presetId: string | null
  policy: unknown
  startsAt: Date
  endsAt: Date
  durationMinutes: number
  status: ActivityStatus
  deliveryMode: ExamDeliveryMode
  offlineKind: ExamOfflineKind | null
  maxScore: number
  autoStatus: boolean
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
    deliveryMode: row.deliveryMode,
    offlineKind: row.offlineKind,
    maxScore: row.maxScore,
    autoStatus: row.autoStatus,
    createdById: row.createdById,
  }
}

async function createSchedules(
  tx: Prisma.TransactionClient,
  activity: {
    id: string
    semesterId: string
    eventId: string | null
    startsAt: Date
    endsAt: Date
    durationMinutes: number
    type: ExamActivity['type']
    deliveryMode: ExamDeliveryMode
    createdById: string
  },
  packageId: string | null,
  classroomIds: string[],
) {
  if (packageId !== null) {
    await tx.examPackage.updateMany({
      where: { id: packageId, status: 'APPROVED', deletedAt: null },
      data: { status: 'LOCKED', lockedAt: new Date() },
    })
  }
  await tx.examSchedule.createMany({
    data: classroomIds.map((classroomId) => ({
      packageId,
      deliveryMode: activity.deliveryMode,
      classroomId,
      semesterId: activity.semesterId,
      eventId: activity.eventId,
      startsAt: activity.startsAt,
      endsAt: activity.endsAt,
      durationMinutes: activity.durationMinutes,
      type: activity.type,
      createdById: activity.createdById,
      activityId: activity.id,
    })),
  })
}

async function lockActivity(
  tx: Prisma.TransactionClient,
  activityId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM exam_activities WHERE id = ${activityId}::uuid FOR UPDATE
  `
  return rows.length > 0
}

async function missingClassrooms(
  tx: Prisma.TransactionClient,
  activityId: string,
  classroomIds: string[],
): Promise<string[]> {
  const existing = await tx.examSchedule.findMany({
    where: { activityId, kind: 'REGULAR' },
    select: { classroomId: true },
  })
  const have = new Set(existing.map((row) => row.classroomId))
  return [...new Set(classroomIds)].filter((id) => !have.has(id))
}

@Injectable()
export class PrismaExamActivityRepository implements ExamActivityRepository {
  private readonly logger = new Logger(PrismaExamActivityRepository.name)

  constructor(private readonly prisma: PrismaService) {}

  async findPreset(name: string) {
    return this.prisma.examPolicyPreset.findUnique({
      where: { name },
      select: { id: true, policy: true },
    })
  }

  async listPresets() {
    const rows = await this.prisma.examPolicyPreset.findMany({
      where: { name: { in: [...EXAM_TYPES] } },
    })
    const byName = new Map(rows.map((row) => [row.name as ExamType, row]))
    return EXAM_TYPES.flatMap((type) => {
      const row = byName.get(type)
      if (!row) return []
      return [
        {
          id: row.id,
          type,
          policy: parsePolicy(row.policy, DEFAULT_POLICIES[type]),
          updatedAt: row.updatedAt,
        },
      ]
    })
  }

  async updatePreset(type: ExamType, policy: ExamActivity['policy']) {
    try {
      const updated = await this.prisma.examPolicyPreset.update({
        where: { name: type },
        data: { policy: policy as unknown as Prisma.InputJsonValue },
      })
      return {
        id: updated.id,
        type,
        policy: parsePolicy(updated.policy, DEFAULT_POLICIES[type]),
        updatedAt: updated.updatedAt,
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null
      }
      throw error
    }
  }

  async findPackageStatus(packageId: string) {
    const found = await this.prisma.examPackage.findFirst({
      where: { id: packageId, deletedAt: null },
      select: { status: true },
    })
    return found?.status ?? null
  }

  async findEventRef(eventId: string) {
    return this.prisma.examEvent.findUnique({
      where: { id: eventId },
      select: {
        semesterId: true,
        type: true,
        status: true,
        startsAt: true,
        endsAt: true,
      },
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
          deliveryMode: activity.deliveryMode,
          offlineKind: activity.offlineKind,
          maxScore: activity.maxScore,
          autoStatus: activity.autoStatus,
          createdById: activity.createdById,
        },
      })
      if (activity.packageId !== null) {
        await createSchedules(tx, created, activity.packageId, classroomIds)
      }
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

  async attachPackage(
    input: Parameters<ExamActivityRepository['attachPackage']>[0],
  ) {
    const { activityId, packageId, classroomIds, actorId } = input
    return this.prisma.$transaction(async (tx) => {
      if (!(await lockActivity(tx, activityId))) return null
      const before = await tx.examActivity.findUnique({
        where: { id: activityId },
      })
      if (before === null) return null
      const updated = await tx.examActivity.update({
        where: { id: activityId },
        data: { packageId },
      })
      await tx.examSchedule.updateMany({
        where: { activityId, kind: 'REGULAR', packageId: null },
        data: { packageId },
      })
      await createSchedules(
        tx,
        updated,
        packageId,
        await missingClassrooms(tx, activityId, classroomIds),
      )
      await tx.examActivityAuditLog.create({
        data: {
          activityId,
          actorId,
          action: 'ATTACH_PACKAGE',
          before: { packageId: before.packageId },
          after: { packageId },
        },
      })
      return toEntity(updated)
    })
  }

  async assignClassrooms(
    input: Parameters<ExamActivityRepository['assignClassrooms']>[0],
  ) {
    const { activityId, classroomIds } = input
    return this.prisma.$transaction(async (tx) => {
      if (!(await lockActivity(tx, activityId))) return null
      const activity = await tx.examActivity.findUnique({
        where: { id: activityId },
      })
      if (activity === null) return null
      await createSchedules(
        tx,
        activity,
        activity.packageId,
        await missingClassrooms(tx, activityId, classroomIds),
      )
      const rows = await tx.examSchedule.findMany({
        where: {
          activityId,
          kind: 'REGULAR',
          classroomId: { in: classroomIds },
        },
        include: SCHEDULE_INCLUDE,
        orderBy: { createdAt: 'asc' },
      })
      return rows.map(toSchedule)
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
      select: { id: true, classroomId: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: 'asc' },
    })
  }

  async listBySemester(semesterId: string, category?: ExamCategory) {
    const rows = await this.prisma.examActivity.findMany({
      where: {
        semesterId,
        ...(category ? { type: { in: typesInCategory(category) } } : {}),
      },
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

  async updateAutoStatus(id: string, autoStatus: boolean, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.examActivity.findUnique({ where: { id } })
      if (before === null) return null
      const updated = await tx.examActivity.update({
        where: { id },
        data: { autoStatus },
      })
      await tx.examActivityAuditLog.create({
        data: {
          activityId: id,
          actorId,
          action: 'UPDATE_AUTO_STATUS',
          before: { autoStatus: before.autoStatus },
          after: { autoStatus: updated.autoStatus },
        },
      })
      return toEntity(updated)
    })
  }

  async findDueForAdvance(now: Date) {
    const rows = await this.prisma.examActivity.findMany({
      where: {
        autoStatus: true,
        OR: [
          {
            status: 'SCHEDULED',
            startsAt: { lte: new Date(now.getTime() + MAX_LEAD_MS) },
          },
          { status: 'ACTIVE', endsAt: { lte: now } },
        ],
      },
      orderBy: { startsAt: 'asc' },
    })
    return rows.flatMap((row) => {
      try {
        return [toEntity(row)]
      } catch (error) {
        this.logger.error(
          `Kebijakan kegiatan ${row.id} tidak valid, dilewati`,
          error instanceof Error ? error.stack : String(error),
        )
        return []
      }
    })
  }

  async updateStatusIf(
    id: string,
    expected: ActivityStatus,
    next: ActivityStatus,
    actorId: string,
    reason: AutoStatusReason,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.examActivity.updateMany({
        where: { id, status: expected },
        data: { status: next },
      })
      if (count === 0) return false
      await tx.examActivityAuditLog.create({
        data: {
          activityId: id,
          actorId,
          action: 'AUTO_STATUS',
          before: { status: expected },
          after: { status: next, reason },
        },
      })
      return true
    })
  }
}
