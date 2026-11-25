import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import type { PrismaService } from '../../core/database/prisma.service.js'
import { PrismaRdmImportRepository } from './prisma-rdm-import.repository.js'

describe('PrismaRdmImportRepository', () => {
  it('uses explicit interactive transaction timeout options', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'item-1' })
    const tx = {
      assessmentItem: { create, update: vi.fn() },
      studentScore: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    }
    const $transaction = vi.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    )
    const prisma = { $transaction } as unknown as PrismaService
    const repository = new PrismaRdmImportRepository(prisma)

    await repository.apply(
      {
        teachingAssignmentId: 'ta-1',
        creates: [
          {
            sheetName: 'SUM 1',
            name: 'UH 1',
            type: AssessmentType.DAILY,
            material: null,
            kktp: null,
            scores: [],
          },
        ],
        updates: [],
      },
      null,
    )

    expect($transaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 10000,
      timeout: 30000,
    })
  })
})
