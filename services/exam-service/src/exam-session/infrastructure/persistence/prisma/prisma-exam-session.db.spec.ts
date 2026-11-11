import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { PrismaExamSessionRepository } from './prisma-exam-session.repository.js'
import type { SaveAnswerBatchItem } from '../../../domain/repositories/exam-session.repository.js'

const enabled = process.env.EXAM_DB_TESTS === '1'
const suite = enabled ? describe : describe.skip

suite('PrismaExamSessionRepository against a real database', () => {
  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)
  const sessions = new PrismaExamSessionRepository(prisma)

  const id = () => randomUUID()
  const subjectId = id()
  const gradeId = id()
  const classroomId = id()
  const semesterId = id()
  const userId = id()
  const employeeId = id()
  const questionIds: string[] = []
  const packageIds: string[] = []
  const scheduleIds: string[] = []
  const sessionIds: string[] = []
  const activityIds: string[] = []
  const NOW = new Date('2026-11-03T02:00:00.000Z')

  async function schedule(count: number) {
    const pkg = await prisma.examPackage.create({
      data: { title: 'Batch DB', subjectId, gradeId, createdById: userId },
    })
    packageIds.push(pkg.id)
    const ids: string[] = []
    for (let index = 0; index < count; index += 1) {
      const question = await prisma.question.create({
        data: {
          packageId: pkg.id,
          subjectId,
          gradeId,
          authorEmployeeId: employeeId,
          type: 'MULTIPLE_CHOICE',
          createdById: userId,
        },
      })
      questionIds.push(question.id)
      ids.push(question.id)
      await prisma.examPackageItem.create({
        data: {
          packageId: pkg.id,
          questionId: question.id,
          questionVersion: 1,
          position: index + 1,
        },
      })
    }
    const row = await prisma.examSchedule.create({
      data: {
        packageId: pkg.id,
        classroomId,
        semesterId,
        startsAt: new Date('2026-11-02T01:00:00.000Z'),
        endsAt: new Date('2026-11-02T04:00:00.000Z'),
        durationMinutes: 90,
        createdById: userId,
      },
    })
    scheduleIds.push(row.id)
    return { scheduleId: row.id, questionIds: ids, packageId: pkg.id }
  }

  async function activity(packageId: string) {
    const row = await prisma.examActivity.create({
      data: {
        semesterId,
        gradeId,
        subjectId,
        packageId,
        type: 'DAILY',
        policy: {},
        startsAt: new Date('2026-11-02T01:00:00.000Z'),
        endsAt: new Date('2026-11-02T04:00:00.000Z'),
        durationMinutes: 90,
        createdById: userId,
      },
    })
    activityIds.push(row.id)
    return row.id
  }

  async function makeup(originalScheduleId: string, packageId: string) {
    const row = await prisma.examSchedule.create({
      data: {
        packageId,
        classroomId,
        semesterId,
        startsAt: new Date('2026-11-05T01:00:00.000Z'),
        endsAt: new Date('2026-11-05T04:00:00.000Z'),
        durationMinutes: 90,
        kind: 'MAKEUP',
        makeupOfId: originalScheduleId,
        createdById: userId,
      },
    })
    scheduleIds.push(row.id)
    return row.id
  }

  async function session(scheduleId: string) {
    const row = await prisma.examSession.create({
      data: {
        scheduleId,
        studentId: id(),
        userId: id(),
        deviceId: 'dev',
        shuffleSeed: 'seed',
        startedAt: NOW,
        deadline: NOW,
        finalizeAt: NOW,
      },
    })
    sessionIds.push(row.id)
    return row.id
  }

  const items = (ids: string[]): SaveAnswerBatchItem[] =>
    ids.map((questionId) => ({
      questionId,
      clientId: id(),
      answer: { key: 'B' as const },
      receivedAfterDeadline: false,
    }))

  afterAll(async () => {
    await prisma.examAnswer.deleteMany({
      where: { sessionId: { in: sessionIds } },
    })
    await prisma.examSession.deleteMany({ where: { id: { in: sessionIds } } })
    await prisma.examScheduleParticipant.deleteMany({
      where: { scheduleId: { in: scheduleIds } },
    })
    await prisma.examSchedule.deleteMany({
      where: { makeupOfId: { in: scheduleIds } },
    })
    await prisma.examSchedule.deleteMany({ where: { id: { in: scheduleIds } } })
    await prisma.examActivity.deleteMany({ where: { id: { in: activityIds } } })
    await prisma.examPackageItem.deleteMany({
      where: { packageId: { in: packageIds } },
    })
    await prisma.question.deleteMany({ where: { id: { in: questionIds } } })
    await prisma.examPackage.deleteMany({ where: { id: { in: packageIds } } })
    await prisma.$disconnect()
  })

  it('finds the running sessions of an activity and of its makeups', async () => {
    const paper = await schedule(1)
    const activityId = await activity(paper.packageId)
    await prisma.examSchedule.update({
      where: { id: paper.scheduleId },
      data: { activityId },
    })
    const makeupId = await makeup(paper.scheduleId, paper.packageId)
    const regularSession = await session(paper.scheduleId)
    const makeupSession = await session(makeupId)

    const found = await sessions.findInProgressIdsByActivity(activityId)

    expect(new Set(found)).toEqual(new Set([regularSession, makeupSession]))
  })

  it('saves 46 answers in one transaction with the telemetry', async () => {
    const paper = await schedule(46)
    const sessionId = await session(paper.scheduleId)

    const result = await sessions.saveAnswersBatch(
      sessionId,
      items(paper.questionIds),
      {
        now: NOW,
        unsyncedCount: 0,
        batteryLevel: 64,
        isCharging: true,
        dndGranted: true,
        lockTaskActive: false,
        batteryUnrestricted: true,
      },
    )

    expect(result.saved).toHaveLength(46)
    expect(result.totalConfirmedCount).toBe(46)
    const row = await prisma.examSession.findUnique({
      where: { id: sessionId },
    })
    expect(row?.syncedAnswerCount).toBe(46)
    expect(row?.unsyncedCount).toBe(0)
    expect(row?.lastBatteryLevel).toBe(64)
    expect(row?.isCharging).toBe(true)
    expect(row?.dndGranted).toBe(true)
    expect(row?.lockTaskActive).toBe(false)
    expect(row?.batteryUnrestricted).toBe(true)
    expect(row?.lastSeenAt).toEqual(NOW)
  })

  it('retries the same payload without error or duplicates', async () => {
    const paper = await schedule(3)
    const sessionId = await session(paper.scheduleId)
    const payload = items(paper.questionIds)

    await sessions.saveAnswersBatch(sessionId, payload, { now: NOW })
    const again = await sessions.saveAnswersBatch(sessionId, payload, {
      now: NOW,
    })

    expect(again.saved).toHaveLength(3)
    expect(again.totalConfirmedCount).toBe(3)
    expect(await prisma.examAnswer.count({ where: { sessionId } })).toBe(3)
  })

  it('keeps the last answer when a question repeats in the payload', async () => {
    const paper = await schedule(1)
    const sessionId = await session(paper.scheduleId)

    const result = await sessions.saveAnswersBatch(
      sessionId,
      [
        {
          questionId: paper.questionIds[0],
          clientId: id(),
          answer: { key: 'A' },
          receivedAfterDeadline: false,
        },
        {
          questionId: paper.questionIds[0],
          clientId: id(),
          answer: { key: 'D' },
          receivedAfterDeadline: true,
        },
      ],
      { now: NOW },
    )

    expect(result.saved).toHaveLength(1)
    expect(result.saved[0]?.answer).toEqual({ key: 'D' })
    expect(result.saved[0]?.receivedAfterDeadline).toBe(true)
  })

  it('overwrites an answer that arrives under a new client id', async () => {
    const paper = await schedule(1)
    const sessionId = await session(paper.scheduleId)
    const questionId = paper.questionIds[0]

    await sessions.saveAnswersBatch(
      sessionId,
      [
        {
          questionId,
          clientId: id(),
          answer: { key: 'A' },
          receivedAfterDeadline: false,
        },
      ],
      { now: NOW },
    )
    const result = await sessions.saveAnswersBatch(
      sessionId,
      [
        {
          questionId,
          clientId: id(),
          answer: { key: 'E' },
          receivedAfterDeadline: false,
        },
      ],
      { now: NOW },
    )

    expect(result.saved).toHaveLength(1)
    expect(result.saved[0]?.answer).toEqual({ key: 'E' })
    expect(await prisma.examAnswer.count({ where: { sessionId } })).toBe(1)
  })

  it('skips a client id already bound to another question', async () => {
    const paper = await schedule(2)
    const sessionId = await session(paper.scheduleId)
    const clientId = id()

    const result = await sessions.saveAnswersBatch(
      sessionId,
      [
        {
          questionId: paper.questionIds[0],
          clientId,
          answer: { key: 'A' },
          receivedAfterDeadline: false,
        },
        {
          questionId: paper.questionIds[1],
          clientId,
          answer: { key: 'B' },
          receivedAfterDeadline: false,
        },
      ],
      { now: NOW },
    )

    expect(result.saved).toHaveLength(1)
    expect(result.totalConfirmedCount).toBe(1)
    expect(await prisma.examAnswer.count({ where: { sessionId } })).toBe(1)
  })

  it('records a snapshot on the session row', async () => {
    const paper = await schedule(1)
    const sessionId = await session(paper.scheduleId)
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { cameraBlocked: 'network' },
    })

    await sessions.recordSnapshot(sessionId, NOW)

    const row = await prisma.examSession.findUnique({
      where: { id: sessionId },
    })
    expect(row?.lastSnapshotAt).toEqual(NOW)
    expect(row?.lastSeenAt).toEqual(NOW)
    expect(row?.cameraBlocked).toBeNull()
    expect(row?.snapshotCount).toBe(1)

    await sessions.recordSnapshot(sessionId, NOW)

    expect(
      (await prisma.examSession.findUnique({ where: { id: sessionId } }))
        ?.snapshotCount,
    ).toBe(2)
  })

  it('clears lastSnapshotAt for the sessions it is given', async () => {
    const paper = await schedule(1)
    const sessionId = await session(paper.scheduleId)
    await sessions.recordSnapshot(sessionId, NOW)

    await sessions.clearLastSnapshotAt([sessionId])

    const row = await prisma.examSession.findUnique({
      where: { id: sessionId },
    })
    expect(row?.lastSnapshotAt).toBeNull()
    expect(row?.snapshotCount).toBe(1)
  })

  it('ignores a snapshot for a session that is no longer running', async () => {
    const paper = await schedule(1)
    const sessionId = await session(paper.scheduleId)
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'SUBMITTED', cameraBlocked: 'network' },
    })

    await sessions.recordSnapshot(sessionId, NOW)

    const row = await prisma.examSession.findUnique({
      where: { id: sessionId },
    })
    expect(row?.lastSnapshotAt).toBeNull()
    expect(row?.lastSeenAt).toBeNull()
    expect(row?.cameraBlocked).toBe('network')
    expect(row?.snapshotCount).toBe(0)
  })

  it('reports the stored answer count after the session closed', async () => {
    const paper = await schedule(3)
    const sessionId = await session(paper.scheduleId)
    await sessions.saveAnswersBatch(sessionId, items(paper.questionIds), {
      now: NOW,
    })
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'SUBMITTED' },
    })

    const result = await sessions.saveAnswersBatch(sessionId, [], {
      now: NOW,
    })

    expect(result.saved).toEqual([])
    expect(result.totalConfirmedCount).toBe(3)
  })
})
