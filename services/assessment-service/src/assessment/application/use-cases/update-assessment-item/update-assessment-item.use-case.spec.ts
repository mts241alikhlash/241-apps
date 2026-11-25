import { BadRequestException } from '@nestjs/common'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import type {
  AssessmentItemWithDetails,
  CreateAssessmentItemRepositoryInput,
  IAssessmentItemRepository,
  UpdateAssessmentItemRepositoryInput,
} from '../../../domain/repositories/assessment-item.repository.js'
import { UpdateAssessmentItemDto } from '../../../presentation/http/dto/request/update-assessment-item.dto.js'
import { UpdateAssessmentItemUseCase } from './update-assessment-item.use-case.js'

const TA_ID_1 = '11111111-1111-4111-8111-111111111111'
const TA_ID_2 = '22222222-2222-4222-8222-222222222222'

function makeFakeRepository(initial: AssessmentItemWithDetails[] = []): {
  items: AssessmentItemWithDetails[]
  repository: IAssessmentItemRepository
} {
  const items = [...initial]

  const repository = {
    findAll: vi.fn(),
    findById: vi.fn((id: string) =>
      Promise.resolve(
        items.find((item) => item.id === id && item.deletedAt === null) ?? null,
      ),
    ),
    findNameClash: vi.fn(
      (teachingAssignmentId: string, name: string, exceptId?: string) => {
        const normalized = name.trim().toLowerCase()
        return Promise.resolve(
          items.some(
            (item) =>
              item.deletedAt === null &&
              item.teachingAssignmentId === teachingAssignmentId &&
              item.id !== exceptId &&
              item.name.trim().toLowerCase() === normalized,
          ),
        )
      },
    ),
    create: vi.fn((_input: CreateAssessmentItemRepositoryInput) =>
      Promise.reject(new Error('not used')),
    ),
    update: vi.fn((id: string, input: UpdateAssessmentItemRepositoryInput) => {
      const idx = items.findIndex((item) => item.id === id)
      const current = items[idx]
      const updated: AssessmentItemWithDetails = {
        ...current,
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.weight !== undefined && { weight: input.weight }),
        ...(input.maxScore !== undefined && { maxScore: input.maxScore }),
        ...(input.material !== undefined && { material: input.material }),
        ...(input.kktp !== undefined && { kktp: input.kktp }),
      }
      items[idx] = updated
      return Promise.resolve(updated)
    }),
    remove: vi.fn(),
    softDelete: vi.fn(),
    countScoresWithAssessmentItem: vi.fn(),
  } as unknown as IAssessmentItemRepository

  return { items, repository }
}

describe('UpdateAssessmentItemUseCase', () => {
  const item1: AssessmentItemWithDetails = {
    id: 'item-1',
    teachingAssignmentId: TA_ID_1,
    name: 'Tugas 1',
    type: AssessmentType.ASSIGNMENT,
    weight: 1,
    maxScore: 100,
    material: null,
    kktp: null,
    deletedAt: null,
  }
  const item2: AssessmentItemWithDetails = {
    id: 'item-2',
    teachingAssignmentId: TA_ID_1,
    name: 'Tugas 2',
    type: AssessmentType.ASSIGNMENT,
    weight: 1,
    maxScore: 100,
    material: null,
    kktp: null,
    deletedAt: null,
  }
  const itemOtherTa: AssessmentItemWithDetails = {
    id: 'item-3',
    teachingAssignmentId: TA_ID_2,
    name: 'Tugas 3',
    type: AssessmentType.ASSIGNMENT,
    weight: 1,
    maxScore: 100,
    material: null,
    kktp: null,
    deletedAt: null,
  }

  function makeUseCase(
    initial: AssessmentItemWithDetails[] = [item1, item2, itemOtherTa],
  ) {
    const { items, repository } = makeFakeRepository(initial)
    return {
      items,
      useCase: new UpdateAssessmentItemUseCase(repository),
    }
  }

  it('rejects a name that differs only in case and spaces from another item of the same teaching assignment', async () => {
    const { useCase } = makeUseCase()

    const promise = useCase.execute('item-2', { name: ' tugas 1 ' })

    await expect(promise).rejects.toThrow(BadRequestException)
    await expect(promise).rejects.toThrow(
      'Nama penilaian sudah dipakai di kelas dan mapel ini',
    )
  })

  it('update keeps its own name without clashing', async () => {
    const { useCase } = makeUseCase()

    const updated = await useCase.execute('item-1', { name: ' tugas 1 ' })

    expect(updated.name).toBe('tugas 1')
  })

  it('accepts the same name in another teaching assignment', async () => {
    const { useCase } = makeUseCase()

    const updated = await useCase.execute('item-3', { name: 'Tugas 1' })

    expect(updated.name).toBe('Tugas 1')
  })

  it('stores material and kktp', async () => {
    const { useCase } = makeUseCase()

    const updated = await useCase.execute('item-1', {
      material: 'Aljabar Linear',
      kktp: 78,
    })

    expect(updated.material).toBe('Aljabar Linear')
    expect(updated.kktp).toBe(78)

    const cleared = await useCase.execute('item-1', {
      material: null,
      kktp: null,
    })

    expect(cleared.material).toBeNull()
    expect(cleared.kktp).toBeNull()
  })

  describe('UpdateAssessmentItemDto validation', () => {
    async function validatePayload(payload: Record<string, unknown>) {
      const dto = plainToInstance(UpdateAssessmentItemDto, payload)
      const errors = await validate(dto)
      return { dto, errors }
    }

    it('accepts valid kktp 0..100 and material up to 500 chars', async () => {
      const minCase = await validatePayload({
        kktp: 0,
        material: 'a'.repeat(500),
      })
      const maxCase = await validatePayload({ kktp: 100 })
      const nullCase = await validatePayload({ kktp: null, material: null })

      expect(minCase.errors).toHaveLength(0)
      expect(maxCase.errors).toHaveLength(0)
      expect(nullCase.errors).toHaveLength(0)
      expect(nullCase.dto.kktp).toBeNull()
      expect(nullCase.dto.material).toBeNull()
    })

    it.each([
      { kktp: -1 },
      { kktp: 101 },
      { kktp: 75.5 },
      { material: 'a'.repeat(501) },
    ])('rejects invalid payload %j', async (invalid) => {
      const { errors } = await validatePayload(invalid)
      expect(errors.length).toBeGreaterThan(0)
    })
  })
})
