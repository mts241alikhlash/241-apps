import { Test, TestingModule } from '@nestjs/testing'
import { ProvisioningTokenGuard } from '@mts241alikhlash/nest-core/guards'
import { IEnrollmentRepository } from '../../domain/repositories/enrollment.repository.js'
import { EnrollmentInternalController } from './enrollment-internal.controller.js'

function makeEnrollment(
  overrides: {
    id?: string
    nis?: string | null
    nisn?: string | null
    name?: string | null
  } = {},
) {
  return {
    id: overrides.id ?? 'enr-1',
    studentId: 'stu-1',
    classroomId: 'cls-1',
    semesterId: 'sem-1',
    status: 'ACTIVE',
    student: {
      userId: 'usr-1',
      nis: overrides.nis === undefined ? '2024001' : overrides.nis,
      nisn: overrides.nisn === undefined ? '0091234567' : overrides.nisn,
      user: {
        profile: {
          name: overrides.name === undefined ? 'Ahmad Fauzi' : overrides.name,
        },
      },
    },
  }
}

describe('EnrollmentInternalController', () => {
  let controller: EnrollmentInternalController

  const mockRepo = {
    findAll: vi.fn(),
    findActiveEnrollment: vi.fn(),
    findActiveRow: vi.fn(),
    findById: vi.fn(),
    findManyActiveByIds: vi.fn(),
    countActiveByClassrooms: vi.fn(),
    countBySemesters: vi.fn(),
    rolloverToSemester: vi.fn(),
    countActiveByIds: vi.fn(),
    countByClassroom: vi.fn(),
    countBySemester: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentInternalController],
      providers: [{ provide: IEnrollmentRepository, useValue: mockRepo }],
    })
      .overrideGuard(ProvisioningTokenGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(EnrollmentInternalController)
    vi.clearAllMocks()
  })

  it('includes studentNisn in summary()', async () => {
    mockRepo.findById.mockResolvedValue(makeEnrollment({ nisn: '0087654321' }))

    const result = await controller.summary('enr-1')

    expect(result.data).toEqual({
      id: 'enr-1',
      studentId: 'stu-1',
      classroomId: 'cls-1',
      semesterId: 'sem-1',
      status: 'ACTIVE',
      studentUserId: 'usr-1',
      studentNis: '2024001',
      studentNisn: '0087654321',
      studentName: 'Ahmad Fauzi',
      studentGender: null,
    })
  })

  it('returns null studentNisn in summary() when student nisn is absent', async () => {
    mockRepo.findById.mockResolvedValue(makeEnrollment({ nisn: null }))

    const result = await controller.summary('enr-1')

    expect(result.data?.studentNisn).toBeNull()
  })

  it('includes studentNisn in active()', async () => {
    mockRepo.findActiveRow.mockResolvedValue(
      makeEnrollment({ nisn: '0091234567' }),
    )

    const result = await controller.active('stu-1', 'sem-1')

    expect(result.data?.studentNisn).toBe('0091234567')
  })

  it('active() reads the bare enrollment and resolves no name', async () => {
    const row = makeEnrollment()
    mockRepo.findActiveRow.mockResolvedValue({
      ...row,
      student: { userId: 'usr-1', nis: '2024001', nisn: '0091234567' },
    })

    const result = await controller.active('stu-1', 'sem-1')

    expect(mockRepo.findActiveRow).toHaveBeenCalledWith('stu-1', 'sem-1')
    expect(mockRepo.findActiveEnrollment).not.toHaveBeenCalled()
    expect(result.data?.studentName).toBeNull()
  })

  it('includes studentNisn in search()', async () => {
    mockRepo.findAll.mockResolvedValue({
      data: [makeEnrollment({ id: 'enr-1', nisn: '0091234567' })],
      total: 1,
      page: 1,
      limit: 1000,
    })

    const result = await controller.search({ classroomId: 'cls-1' })

    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.studentNisn).toBe('0091234567')
  })

  it('includes studentNisn in byClassroom()', async () => {
    mockRepo.findAll.mockResolvedValue({
      data: [makeEnrollment({ id: 'enr-2', nisn: '0092222222' })],
      total: 1,
      page: 1,
      limit: 1000,
    })

    const result = await controller.byClassroom('cls-1', 'sem-1')

    expect(result.data[0]?.studentNisn).toBe('0092222222')
  })

  it('includes studentNisn in byIds()', async () => {
    mockRepo.findManyActiveByIds.mockResolvedValue([
      makeEnrollment({ id: 'enr-3', nisn: '0093333333' }),
    ])

    const result = await controller.byIds({ ids: ['enr-3'] })

    expect(result.data[0]?.studentNisn).toBe('0093333333')
  })
})
