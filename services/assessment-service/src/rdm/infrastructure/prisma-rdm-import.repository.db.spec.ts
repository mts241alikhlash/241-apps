import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import { PrismaService } from '../../core/database/prisma.service.js'
import { PrismaRdmImportRepository } from './prisma-rdm-import.repository.js'

const suite = process.env.ASSESSMENT_DB_TESTS === '1' ? describe : describe.skip

function databaseName(url: string | undefined): string {
  if (!url) return ''
  return new URL(url).pathname.replace(/^\//, '')
}

suite('PrismaRdmImportRepository against a real database', () => {
  beforeAll(() => {
    const name = databaseName(process.env.DATABASE_URL)
    if (!name || name === 'assessment') {
      throw new Error(
        'Set ASSESSMENT_TEST_DATABASE_URL to a throwaway database; refusing to run against the development database',
      )
    }
  })

  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)
  const repository = new PrismaRdmImportRepository(prisma)

  const teachingAssignmentIds: string[] = []

  afterEach(async () => {
    if (teachingAssignmentIds.length === 0) return
    await prisma.studentScore.deleteMany({
      where: {
        assessmentItem: {
          teachingAssignmentId: { in: teachingAssignmentIds },
        },
      },
    })
    await prisma.assessmentItem.deleteMany({
      where: { teachingAssignmentId: { in: teachingAssignmentIds } },
    })
    teachingAssignmentIds.length = 0
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('creates items, updates items, and writes scores with null correctedById in one transaction', async () => {
    const taId = randomUUID()
    const enrollment1 = randomUUID()
    const enrollment2 = randomUUID()
    teachingAssignmentIds.push(taId)

    const existing = await prisma.assessmentItem.create({
      data: {
        teachingAssignmentId: taId,
        name: 'UH Lama',
        type: AssessmentType.DAILY,
        weight: 2,
        maxScore: 50,
        material: 'Materi Lama',
        kktp: 70,
      },
    })

    const result = await repository.apply(
      {
        teachingAssignmentId: taId,
        creates: [
          {
            sheetName: 'SUM 1',
            name: 'UH Baru',
            type: AssessmentType.ASSIGNMENT,
            material: 'Aljabar',
            kktp: 75,
            scores: [{ enrollmentId: enrollment1, score: 88 }],
          },
        ],
        updates: [
          {
            itemId: existing.id,
            material: 'Materi Baru',
            kktp: 80,
            scores: [{ enrollmentId: enrollment2, score: 45 }],
          },
        ],
      },
      null,
    )

    expect(result).toEqual({
      itemsCreated: 1,
      itemsUpdated: 1,
      scoresWritten: 2,
    })

    const createdItem = await prisma.assessmentItem.findFirstOrThrow({
      where: { teachingAssignmentId: taId, name: 'UH Baru' },
      include: { studentScores: true },
    })
    expect(createdItem.type).toBe(AssessmentType.ASSIGNMENT)
    expect(createdItem.weight).toBe(1)
    expect(createdItem.maxScore).toBe(100)
    expect(createdItem.material).toBe('Aljabar')
    expect(createdItem.kktp).toBe(75)
    expect(createdItem.studentScores).toHaveLength(1)
    expect(createdItem.studentScores[0]?.score).toBe(88)
    expect(createdItem.studentScores[0]?.correctedById).toBeNull()
    expect(createdItem.studentScores[0]?.correctedAt).toBeNull()

    const updatedItem = await prisma.assessmentItem.findUniqueOrThrow({
      where: { id: existing.id },
      include: { studentScores: true },
    })
    expect(updatedItem.material).toBe('Materi Baru')
    expect(updatedItem.kktp).toBe(80)
    expect(updatedItem.weight).toBe(2)
    expect(updatedItem.maxScore).toBe(50)
    expect(updatedItem.studentScores).toHaveLength(1)
    expect(updatedItem.studentScores[0]?.score).toBe(45)
    expect(updatedItem.studentScores[0]?.correctedById).toBeNull()
  })

  it('rolls back the first item and its scores when writing the second item fails', async () => {
    const taId = randomUUID()
    const enrollment1 = randomUUID()
    teachingAssignmentIds.push(taId)

    await expect(
      repository.apply(
        {
          teachingAssignmentId: taId,
          creates: [
            {
              sheetName: 'SUM 1',
              name: 'Item Pertama',
              type: AssessmentType.DAILY,
              material: 'Bab 1',
              kktp: 75,
              scores: [{ enrollmentId: enrollment1, score: 90 }],
            },
          ],
          updates: [
            {
              itemId: randomUUID(),
              material: 'Gagal',
              scores: [],
            },
          ],
        },
        null,
      ),
    ).rejects.toThrow()

    const persistedItems = await prisma.assessmentItem.findMany({
      where: { teachingAssignmentId: taId },
    })
    const persistedScores = await prisma.studentScore.findMany({
      where: { enrollmentId: enrollment1 },
    })

    expect(persistedItems).toHaveLength(0)
    expect(persistedScores).toHaveLength(0)
  })
})
