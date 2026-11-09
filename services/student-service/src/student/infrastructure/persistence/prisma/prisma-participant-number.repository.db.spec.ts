import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { ParticipantNumberRow } from '../../../domain/repositories/participant-number.repository.js'
import { PrismaParticipantNumberRepository } from './prisma-participant-number.repository.js'

const enabled = process.env.STUDENT_DB_TESTS === '1'
const suite = enabled ? describe : describe.skip

suite('Prisma participant numbers against a real database', () => {
  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)
  const repository = new PrismaParticipantNumberRepository(prisma)

  const semesterId = randomUUID()
  const otherSemesterId = randomUUID()
  const gradeLevel = 8
  const anna = randomUUID()
  const budi = randomUUID()

  function draft(
    studentId: string,
    ordinal: number,
    overrides: Partial<ParticipantNumberRow> = {},
  ): ParticipantNumberRow {
    return {
      studentId,
      semesterId,
      gradeLevel,
      ordinal,
      number: `241-261-0${gradeLevel}-${String(ordinal).padStart(3, '0')}`,
      ...overrides,
    }
  }

  beforeAll(async () => {
    await prisma.student.createMany({
      data: [
        {
          id: anna,
          userId: randomUUID(),
          nis: `db-${anna.slice(0, 8)}`,
          nisn: `dbn-${anna.slice(0, 8)}`,
        },
        {
          id: budi,
          userId: randomUUID(),
          nis: `db-${budi.slice(0, 8)}`,
          nisn: `dbn-${budi.slice(0, 8)}`,
        },
      ],
    })
  })

  afterAll(async () => {
    await prisma.studentParticipantNumber.deleteMany({
      where: { semesterId: { in: [semesterId, otherSemesterId] } },
    })
    await prisma.student.deleteMany({ where: { id: { in: [anna, budi] } } })
    await prisma.$disconnect()
  })

  it('writes the ordinals it is handed and reads them back', async () => {
    const issued = await repository.issue(semesterId, (existing) => {
      expect(existing).toEqual([])
      return [draft(anna, 1), draft(budi, 2)]
    })

    expect(issued).toBe(2)
    await expect(
      repository.findByStudent(anna, semesterId),
    ).resolves.toMatchObject({
      number: '241-261-08-001',
      ordinal: 1,
    })
    await expect(
      repository.findByStudent(budi, semesterId),
    ).resolves.toMatchObject({ number: '241-261-08-002' })
  })

  it('shows the rows already issued to the next run', async () => {
    const seen: ParticipantNumberRow[][] = []

    const issued = await repository.issue(semesterId, (existing) => {
      seen.push([...existing])
      return []
    })

    expect(issued).toBe(0)
    expect(seen[0]?.map((row) => row.studentId).sort()).toEqual(
      [anna, budi].sort(),
    )
  })

  it('refuses a second row for the same ordinal', async () => {
    await expect(
      repository.issue(otherSemesterId, () => [
        draft(anna, 1, { semesterId: otherSemesterId }),
        draft(budi, 1, { semesterId: otherSemesterId }),
      ]),
    ).rejects.toThrow()
  })

  it('refuses a second row for the same student and semester', async () => {
    await expect(
      repository.issue(semesterId, () => [draft(anna, 9)]),
    ).rejects.toThrow()
  })
})
