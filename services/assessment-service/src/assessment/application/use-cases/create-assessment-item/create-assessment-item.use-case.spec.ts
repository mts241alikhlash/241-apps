import { BadRequestException } from '@nestjs/common'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import type { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import type {
  AssessmentItemWithDetails,
  CreateAssessmentItemRepositoryInput,
  IAssessmentItemRepository,
  UpdateAssessmentItemRepositoryInput,
} from '../../../domain/repositories/assessment-item.repository.js'
import { CreateAssessmentItemDto } from '../../../presentation/http/dto/request/create-assessment-item.dto.js'
import { CreateAssessmentItemUseCase } from './create-assessment-item.use-case.js'

const TA_ID_1 = '11111111-1111-4111-8111-111111111111'
const TA_ID_2 = '22222222-2222-4222-8222-222222222222'

function makeFakeRepository(initial: AssessmentItemWithDetails[] = []): {
  items: AssessmentItemWithDetails[]
  repository: IAssessmentItemRepository
} {
  const items = [...initial]
  let seq = initial.length

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
    create: vi.fn((input: CreateAssessmentItemRepositoryInput) => {
      seq += 1
      const created: AssessmentItemWithDetails = {
        id: `item-${seq}`,
        teachingAssignmentId: input.teachingAssignmentId,
        name: input.name,
        type: input.type,
        weight: input.weight ?? 1,
        maxScore: input.maxScore ?? 100,
        material: input.material ?? null,
        kktp: input.kktp ?? null,
        deletedAt: null,
      }
      items.push(created)
      return Promise.resolve(created)
    }),
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

describe('CreateAssessmentItemUseCase', () => {
  const existingItem: AssessmentItemWithDetails = {
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

  function makeUseCase(initial: AssessmentItemWithDetails[] = []) {
    const { items, repository } = makeFakeRepository(initial)
    const academicLookup = {
      teachingAssignmentExists: vi.fn().mockResolvedValue(true),
    } as unknown as IAcademicLookupPort
    return {
      items,
      useCase: new CreateAssessmentItemUseCase(repository, academicLookup),
    }
  }

  it('rejects a name that differs only in case and spaces from another item of the same teaching assignment', async () => {
    const { useCase, items } = makeUseCase([existingItem])

    const promise = useCase.execute({
      teachingAssignmentId: TA_ID_1,
      name: ' tugas 1 ',
      type: AssessmentType.ASSIGNMENT,
    })

    await expect(promise).rejects.toThrow(BadRequestException)
    await expect(promise).rejects.toThrow(
      'Nama penilaian sudah dipakai di kelas dan mapel ini',
    )
    expect(items).toHaveLength(1)
  })

  it('accepts the same name in another teaching assignment', async () => {
    const { useCase, items } = makeUseCase([existingItem])

    const created = await useCase.execute({
      teachingAssignmentId: TA_ID_2,
      name: ' Tugas 1 ',
      type: AssessmentType.ASSIGNMENT,
    })

    expect(created.teachingAssignmentId).toBe(TA_ID_2)
    expect(created.name).toBe('Tugas 1')
    expect(items).toHaveLength(2)
  })

  it('stores material and kktp', async () => {
    const { useCase } = makeUseCase()

    const created = await useCase.execute({
      teachingAssignmentId: TA_ID_1,
      name: '  UH Bab 1  ',
      type: AssessmentType.DAILY,
      material: 'Bilangan Bulat dan Pecahan',
      kktp: 75,
    })

    expect(created.name).toBe('UH Bab 1')
    expect(created.material).toBe('Bilangan Bulat dan Pecahan')
    expect(created.kktp).toBe(75)
  })

  it('rejects a blank or whitespace-only name', async () => {
    const { useCase, items } = makeUseCase()

    const promise = useCase.execute({
      teachingAssignmentId: TA_ID_1,
      name: '   ',
      type: AssessmentType.ASSIGNMENT,
    })

    await expect(promise).rejects.toThrow(BadRequestException)
    await expect(promise).rejects.toThrow('Nama penilaian wajib diisi')
    expect(items).toHaveLength(0)
  })

  describe('CreateAssessmentItemDto validation', () => {
    async function validatePayload(payload: Record<string, unknown>) {
      const dto = plainToInstance(CreateAssessmentItemDto, {
        teachingAssignmentId: TA_ID_1,
        name: 'UH 1',
        type: AssessmentType.DAILY,
        ...payload,
      })
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
