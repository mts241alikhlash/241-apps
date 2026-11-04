import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { PrismaExamSessionRepository } from './prisma-exam-session.repository.js'

const enabled = process.env.EXAM_DB_TESTS === '1'
const suite = enabled ? describe : describe.skip

suite('Prisma session absence against a real database', () => {
  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)
  const sessions = new PrismaExamSessionRepository(prisma)

  const id = () => randomUUID()
  const subjectId = id()
  const gradeId = id()
  const classroomId = id()
  const userId = id()
  const packageIds: string[] = []
  const scheduleIds: string[] = []
  const sessionIds: string[] = []
  const NOW = new Date('2026-11-03T02:00:00.000Z')

  async function session() {
    const pkg = await prisma.examPackage.create({
      data: { title: 'Absence DB', subjectId, gradeId, createdById: userId },
    })
    packageIds.push(pkg.id)
    const schedule = await prisma.examSchedule.create({
      data: {
        packageId: pkg.id,
        classroomId,
        semesterId: id(),
        startsAt: NOW,
        endsAt: NOW,
        durationMinutes: 90,
        tokenRotation: 0,
        createdById: userId,
      },
    })
    scheduleIds.push(schedule.id)
    const row = await prisma.examSession.create({
      data: {
        scheduleId: schedule.id,
        studentId: id(),
        userId,
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

  afterAll(async () => {
    await prisma.examSession.deleteMany({ where: { id: { in: sessionIds } } })
    await prisma.examSchedule.deleteMany({
      where: { id: { in: scheduleIds } },
    })
    await prisma.examPackage.deleteMany({ where: { id: { in: packageIds } } })
    await prisma.$disconnect()
  })

  it('stores and clears absentSince through applyRecovery', async () => {
    const sessionId = await session()
    const leftAt = new Date(NOW.getTime() - 60_000)

    const marked = await sessions.applyRecovery(sessionId, {
      absentSince: leftAt,
      lastSeenAt: NOW,
    })
    expect(marked?.absentSince).toEqual(leftAt)

    const cleared = await sessions.applyRecovery(sessionId, {
      absentSince: null,
    })
    expect(cleared?.absentSince).toBeNull()
  })

  it('defaults absentSince to null for a fresh session', async () => {
    const sessionId = await session()
    const found = await sessions.findById(sessionId)
    expect(found?.absentSince).toBeNull()
  })
})
