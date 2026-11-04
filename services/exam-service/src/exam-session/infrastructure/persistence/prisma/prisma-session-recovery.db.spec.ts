import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { PrismaSessionRecoveryRepository } from './prisma-session-recovery.repository.js'

const enabled = process.env.EXAM_DB_TESTS === '1'
const suite = enabled ? describe : describe.skip

suite('PrismaSessionRecoveryRepository against a real database', () => {
  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)
  const recovery = new PrismaSessionRecoveryRepository(prisma)

  const id = () => randomUUID()
  const subjectId = id()
  const gradeId = id()
  const classroomId = id()
  const semesterId = id()
  const actorId = id()
  const packageIds: string[] = []
  const questionIds: string[] = []
  const scheduleIds: string[] = []
  const sessionIds: string[] = []
  const NOW = new Date('2026-11-03T02:00:00.000Z')

  async function seedSession(status: 'SUBMITTED' | 'GRADED') {
    const pkg = await prisma.examPackage.create({
      data: { title: 'Recovery DB', subjectId, gradeId, createdById: actorId },
    })
    packageIds.push(pkg.id)
    const question = await prisma.question.create({
      data: {
        packageId: pkg.id,
        subjectId,
        gradeId,
        authorEmployeeId: id(),
        type: 'MULTIPLE_CHOICE',
        createdById: actorId,
      },
    })
    questionIds.push(question.id)
    await prisma.examPackageItem.create({
      data: {
        packageId: pkg.id,
        questionId: question.id,
        questionVersion: 1,
        position: 1,
      },
    })
    const schedule = await prisma.examSchedule.create({
      data: {
        packageId: pkg.id,
        classroomId,
        semesterId,
        startsAt: new Date('2026-11-02T01:00:00.000Z'),
        endsAt: new Date('2026-11-02T04:00:00.000Z'),
        durationMinutes: 90,
        createdById: actorId,
      },
    })
    scheduleIds.push(schedule.id)
    const session = await prisma.examSession.create({
      data: {
        scheduleId: schedule.id,
        studentId: id(),
        userId: id(),
        deviceId: 'dev',
        shuffleSeed: 'seed',
        startedAt: NOW,
        deadline: NOW,
        finalizeAt: NOW,
        status,
        submittedAt: NOW,
        gradedAt: status === 'GRADED' ? NOW : null,
        rawScore: 2,
        maxScore: 2,
      },
    })
    sessionIds.push(session.id)
    return { sessionId: session.id, questionId: question.id, packageId: pkg.id }
  }

  afterAll(async () => {
    await prisma.examSessionAuditLog.deleteMany({
      where: { sessionId: { in: sessionIds } },
    })
    await prisma.scorePublication.deleteMany({
      where: { sessionId: { in: sessionIds } },
    })
    await prisma.examAnswer.deleteMany({
      where: { sessionId: { in: sessionIds } },
    })
    await prisma.examSession.deleteMany({ where: { id: { in: sessionIds } } })
    await prisma.examSchedule.deleteMany({ where: { id: { in: scheduleIds } } })
    await prisma.examPackageItem.deleteMany({
      where: { packageId: { in: packageIds } },
    })
    await prisma.question.deleteMany({ where: { id: { in: questionIds } } })
    await prisma.examPackage.deleteMany({ where: { id: { in: packageIds } } })
    await prisma.$disconnect()
  })

  it('writes the state change and the audit row together', async () => {
    const { sessionId } = await seedSession('SUBMITTED')

    const updated = await recovery.recoverOne(
      sessionId,
      () => ({ status: 'IN_PROGRESS', submittedAt: null, gradedAt: null }),
      {
        action: 'REOPEN_SESSION',
        actorId,
        reason: 'Salah tekan tombol kumpul',
        metadata: { from: 'SUBMITTED' },
      },
    )

    expect(updated).toMatchObject({ id: sessionId, status: 'IN_PROGRESS' })
    const logs = await prisma.examSessionAuditLog.findMany({
      where: { sessionId },
    })
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      action: 'REOPEN_SESSION',
      actorId,
      reason: 'Salah tekan tombol kumpul',
      metadata: { from: 'SUBMITTED' },
    })
  })

  it('rolls the whole transaction back when the state change throws', async () => {
    const { sessionId } = await seedSession('SUBMITTED')

    await expect(
      recovery.recoverOne(
        sessionId,
        () => {
          throw new Error('boom inside the transaction')
        },
        {
          action: 'REOPEN_SESSION',
          actorId,
          reason: 'Salah tekan tombol kumpul',
        },
      ),
    ).rejects.toThrow('boom inside the transaction')

    expect(
      await prisma.examSessionAuditLog.count({ where: { sessionId } }),
    ).toBe(0)
    const row = await prisma.examSession.findUnique({
      where: { id: sessionId },
    })
    expect(row?.status).toBe('SUBMITTED')
  })

  it('keeps a manually graded answer and clears only the automatic score', async () => {
    const { sessionId, questionId } = await seedSession('GRADED')
    const manual = await prisma.examAnswer.create({
      data: {
        sessionId,
        questionId,
        answer: { text: 'jawaban' },
        clientId: id(),
        score: 7.5,
        gradedById: actorId,
        gradedAt: NOW,
      },
    })

    await recovery.recoverOne(
      sessionId,
      () => ({ status: 'IN_PROGRESS', gradedAt: null }),
      {
        action: 'REOPEN_SESSION',
        actorId,
        reason: 'Salah tekan tombol kumpul',
      },
      { clearAnswerScores: true, deletePublication: true },
    )

    const kept = await prisma.examAnswer.findUnique({
      where: { id: manual.id },
    })
    expect(kept?.score).toBe(7.5)
    expect(kept?.gradedById).toBe(actorId)
    expect(kept?.gradedAt).toEqual(NOW)
  })

  it('deletes the publication row on reopen', async () => {
    const { sessionId } = await seedSession('GRADED')
    await prisma.scorePublication.create({
      data: { sessionId, status: 'SENT', attempts: 3, sentAt: NOW },
    })

    await recovery.recoverOne(
      sessionId,
      () => ({ status: 'IN_PROGRESS', gradedAt: null }),
      {
        action: 'REOPEN_SESSION',
        actorId,
        reason: 'Salah tekan tombol kumpul',
      },
      { deletePublication: true },
    )

    expect(await prisma.scorePublication.count({ where: { sessionId } })).toBe(
      0,
    )
  })

  it('resets a retried publication to PENDING with zeroed counters', async () => {
    const { sessionId, questionId } = await seedSession('GRADED')
    const answer = await prisma.examAnswer.create({
      data: {
        sessionId,
        questionId,
        answer: { key: 'B' },
        clientId: id(),
        score: 0,
      },
    })
    await prisma.scorePublication.create({
      data: {
        sessionId,
        status: 'SENT',
        attempts: 12,
        permanentFailures: 10,
        lastError: 'assessment-service down',
        lastAttemptAt: NOW,
        sentAt: NOW,
      },
    })

    await recovery.applyRescore(sessionId, {
      scores: [{ answerId: answer.id, score: 2 }],
      rawScore: 2,
      maxScore: 2,
    })

    const publication = await prisma.scorePublication.findUnique({
      where: { sessionId },
    })
    expect(publication).toMatchObject({
      status: 'PENDING',
      attempts: 0,
      permanentFailures: 0,
      lastError: null,
      lastAttemptAt: null,
      sentAt: null,
    })
    const rescored = await prisma.examAnswer.findUnique({
      where: { id: answer.id },
    })
    expect(rescored?.score).toBe(2)
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
    })
    expect(session?.rawScore).toBe(2)
  })

  it('rolls the key adjustment back when the rescore fails', async () => {
    const { sessionId, questionId, packageId } = await seedSession('GRADED')
    const answer = await prisma.examAnswer.create({
      data: {
        sessionId,
        questionId,
        answer: { key: 'B' },
        clientId: id(),
        score: 0,
      },
    })

    await expect(
      recovery.applyRescore(
        sessionId,
        {
          scores: [{ answerId: id(), score: 2 }],
          rawScore: 2,
          maxScore: 2,
        },
        {
          packageId,
          questionId,
          resolution: 'BONUS_ALL',
          overrideContent: null,
          adjustedById: actorId,
          adjustedReason: 'Soal salah kunci',
          adjustedAt: NOW,
        },
      ),
    ).rejects.toThrow()

    const item = await prisma.examPackageItem.findUnique({
      where: { packageId_questionId: { packageId, questionId } },
    })
    expect(item?.resolution).toBe('NORMAL')
    expect(item?.adjustedReason).toBeNull()
    const kept = await prisma.examAnswer.findUnique({
      where: { id: answer.id },
    })
    expect(kept?.score).toBe(0)
  })

  it('writes the key adjustment inside the same transaction as the rescore', async () => {
    const { sessionId, questionId, packageId } = await seedSession('GRADED')
    const answer = await prisma.examAnswer.create({
      data: {
        sessionId,
        questionId,
        answer: { key: 'B' },
        clientId: id(),
        score: 0,
      },
    })

    await recovery.applyRescore(
      sessionId,
      {
        scores: [{ answerId: answer.id, score: 2 }],
        rawScore: 2,
        maxScore: 2,
      },
      {
        packageId,
        questionId,
        resolution: 'BONUS_ALL',
        overrideContent: null,
        adjustedById: actorId,
        adjustedReason: 'Soal salah kunci',
        adjustedAt: NOW,
      },
    )

    const item = await prisma.examPackageItem.findUnique({
      where: { packageId_questionId: { packageId, questionId } },
    })
    expect(item).toMatchObject({
      resolution: 'BONUS_ALL',
      adjustedById: actorId,
      adjustedReason: 'Soal salah kunci',
    })
    const rescored = await prisma.examAnswer.findUnique({
      where: { id: answer.id },
    })
    expect(rescored?.score).toBe(2)
  })
})
