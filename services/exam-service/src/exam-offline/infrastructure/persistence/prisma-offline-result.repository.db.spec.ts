import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../core/database/prisma.service.js'
import { PrismaOfflineResultRepository } from './prisma-offline-result.repository.js'

const enabled = process.env.EXAM_DB_TESTS === '1'
const suite = enabled ? describe : describe.skip

suite('PrismaOfflineResultRepository against a real database', () => {
  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)
  const repository = new PrismaOfflineResultRepository(prisma)
  const id = () => randomUUID()
  const userId = id()
  const T0 = new Date('2026-11-27T05:00:00.000Z')
  const T1 = new Date('2026-11-27T05:10:00.000Z')
  const scheduleIds: string[] = []

  async function schedule(): Promise<string> {
    const row = await prisma.examSchedule.create({
      data: {
        deliveryMode: 'OFFLINE',
        packageId: null,
        classroomId: id(),
        semesterId: id(),
        startsAt: T0,
        endsAt: T0,
        durationMinutes: 90,
        createdById: userId,
      },
    })
    scheduleIds.push(row.id)
    return row.id
  }

  const write = (scheduleId: string, studentId: string, rawScore: number) =>
    repository.save({
      scheduleId,
      studentId,
      rawScore,
      note: '',
      enteredById: userId,
      enteredAt: T0,
    })

  afterAll(async () => {
    await prisma.examOfflineResult.deleteMany({
      where: { scheduleId: { in: scheduleIds } },
    })
    await prisma.examSchedule.deleteMany({ where: { id: { in: scheduleIds } } })
    await prisma.$disconnect()
  })

  it('upserts one row per schedule and student and keeps its id', async () => {
    const scheduleId = await schedule()
    const studentId = id()
    const first = await write(scheduleId, studentId, 40)
    expect(first.publicationStatus).toBeNull()

    const second = await repository.save({
      scheduleId,
      studentId,
      rawScore: 45,
      note: 'ulang',
      enteredById: userId,
      enteredAt: T1,
    })

    expect(second.id).toBe(first.id)
    expect(second).toMatchObject({ rawScore: 45, note: 'ulang', enteredAt: T1 })
    const listed = await repository.listBySchedules([scheduleId])
    expect(listed).toHaveLength(1)
  })

  it('leaves the publication untouched unless asked, and resets it when asked', async () => {
    const scheduleId = await schedule()
    const studentId = id()
    const row = await write(scheduleId, studentId, 40)
    await prisma.examOfflineResult.update({
      where: { id: row.id },
      data: {
        publicationStatus: 'SENT',
        publicationAttempts: 3,
        publicationError: 'x',
      },
    })

    const kept = await repository.save({
      scheduleId,
      studentId,
      rawScore: 40,
      note: 'n',
      enteredById: userId,
      enteredAt: T1,
    })
    expect(kept).toMatchObject({
      publicationStatus: 'SENT',
      publicationAttempts: 3,
    })

    const reset = await repository.save({
      scheduleId,
      studentId,
      rawScore: 41,
      note: 'n',
      enteredById: userId,
      enteredAt: T1,
      publication: { status: 'PENDING' },
    })
    expect(reset).toMatchObject({
      publicationStatus: 'PENDING',
      publicationAttempts: 0,
      publicationError: null,
      lastAttemptAt: null,
    })
  })

  it('queues scored rows that are not SENT and only those students', async () => {
    const scheduleId = await schedule()
    const [a, b, c, d] = [id(), id(), id(), id()]
    await write(scheduleId, a, 10)
    const sent = await write(scheduleId, b, 20)
    await prisma.examOfflineResult.update({
      where: { id: sent.id },
      data: { publicationStatus: 'SENT' },
    })
    const failed = await write(scheduleId, c, 30)
    await prisma.examOfflineResult.update({
      where: { id: failed.id },
      data: { publicationStatus: 'FAILED', publicationAttempts: 4 },
    })
    await repository.save({
      scheduleId,
      studentId: d,
      rawScore: null,
      note: '',
      enteredById: userId,
      enteredAt: T0,
    })

    const queued = await repository.queue(scheduleId, [a, b, c, d])

    expect(queued).toBe(2)
    const rows = await repository.listBySchedules([scheduleId])
    const status = new Map(rows.map((row) => [row.studentId, row]))
    expect(status.get(a)?.publicationStatus).toBe('PENDING')
    expect(status.get(b)?.publicationStatus).toBe('SENT')
    expect(status.get(c)).toMatchObject({
      publicationStatus: 'PENDING',
      publicationAttempts: 0,
    })
    expect(status.get(d)?.publicationStatus).toBeNull()
  })

  it('picks PENDING rows after the backoff, never FAILED ones, and marks outcomes', async () => {
    const scheduleId = await schedule()
    const [a, b] = [id(), id()]
    const first = await write(scheduleId, a, 10)
    const second = await write(scheduleId, b, 20)
    await repository.queue(scheduleId, [a, b])

    const picked = await repository.findCandidates(T1, 500, [])
    expect(picked.map((row) => row.id)).toEqual(
      expect.arrayContaining([first.id, second.id]),
    )

    await repository.markFailed(first.id, T1, 'timeout', false, T0)
    await repository.markFailed(second.id, T1, 'ditolak', true, T0)
    const afterOne = await repository.findCandidates(
      new Date(T1.getTime() + 60_000),
      500,
      [],
    )
    const afterOneIds = afterOne.map((row) => row.id)
    expect(afterOneIds).not.toContain(second.id)
    expect(
      (
        await repository.findCandidates(
          new Date(T1.getTime() + 60_000),
          500,
          [],
        )
      ).map((row) => row.id),
    ).not.toContain(first.id)
    expect(
      (
        await repository.findCandidates(
          new Date(T1.getTime() + 120_000),
          500,
          [],
        )
      ).map((row) => row.id),
    ).toContain(first.id)
    expect(
      (
        await repository.findCandidates(new Date(T1.getTime() + 120_000), 500, [
          first.id,
        ])
      ).map((row) => row.id),
    ).not.toContain(first.id)

    const rows = new Map(
      (await repository.listBySchedules([scheduleId])).map((row) => [
        row.id,
        row,
      ]),
    )
    expect(rows.get(first.id)).toMatchObject({
      publicationStatus: 'PENDING',
      publicationAttempts: 1,
      publicationError: 'timeout',
    })
    expect(rows.get(second.id)).toMatchObject({
      publicationStatus: 'FAILED',
      publicationError: 'ditolak',
    })

    await repository.markSent(first.id, T1, T1)
    expect(
      (await repository.listBySchedules([scheduleId])).find(
        (row) => row.id === first.id,
      )?.publicationStatus,
    ).toBe('PENDING')
    await repository.markSent(first.id, T1, T0)
    expect(
      (await repository.listBySchedules([scheduleId])).find(
        (row) => row.id === first.id,
      ),
    ).toMatchObject({ publicationStatus: 'SENT', sentAt: T1 })
  })
})
