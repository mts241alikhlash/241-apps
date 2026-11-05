import { IInstitutionDashboardRepository } from '../../../domain/repositories/institution-dashboard.repository.js'
import { GetInstitutionDashboardUseCase } from './get-institution-dashboard.use-case.js'

function repo(overrides: Partial<IInstitutionDashboardRepository> = {}) {
  return {
    findActiveSemester: vi
      .fn()
      .mockResolvedValue({ id: 'sem-1', name: 'Ganjil', academicYearId: 'ay' }),
    findClassroomScoreStats: vi.fn().mockResolvedValue([]),
    countAttendanceOn: vi
      .fn()
      .mockResolvedValue({ present: 0, sick: 0, permit: 0, absent: 0 }),
    countReportCards: vi
      .fn()
      .mockResolvedValue({ published: 0, unpublished: 0 }),
    ...overrides,
  }
}

describe('GetInstitutionDashboardUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T17:30:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('computes score completeness per class from items, students and filled scores', async () => {
    const port = repo({
      findClassroomScoreStats: vi.fn().mockResolvedValue([
        {
          classroomId: 'c1',
          classroomName: '7A',
          studentCount: 10,
          itemFilled: [10, 5],
        },
        {
          classroomId: 'c2',
          classroomName: '7B',
          studentCount: 4,
          itemFilled: [0],
        },
      ]),
    })
    const result = await new GetInstitutionDashboardUseCase(port).execute()
    expect(result.scoreCompleteness).toEqual([
      { classroomId: 'c1', classroomName: '7A', filled: 15, expected: 20 },
      { classroomId: 'c2', classroomName: '7B', filled: 0, expected: 4 },
    ])
    expect(result.semester).toEqual({ id: 'sem-1', name: 'Ganjil' })
  })

  it('asks for the attendance of the day a scan at 00:30 local time belongs to', async () => {
    const port = repo()
    const result = await new GetInstitutionDashboardUseCase(port).execute()
    expect(port.countAttendanceOn).toHaveBeenCalledWith(
      new Date('2026-11-05T00:00:00Z'),
    )
    expect(result.attendanceToday.date).toEqual(
      new Date('2026-11-05T00:00:00Z'),
    )
  })

  it('splits report cards into published and unpublished', async () => {
    const port = repo({
      countReportCards: vi
        .fn()
        .mockResolvedValue({ published: 3, unpublished: 9 }),
    })
    expect(
      (await new GetInstitutionDashboardUseCase(port).execute()).examScores,
    ).toEqual({ published: 3, unpublished: 9 })
  })

  it('returns empty completeness and zero report cards without an active semester', async () => {
    const port = repo({ findActiveSemester: vi.fn().mockResolvedValue(null) })
    const result = await new GetInstitutionDashboardUseCase(port).execute()
    expect(result.semester).toBeNull()
    expect(result.scoreCompleteness).toEqual([])
    expect(result.examScores).toEqual({ published: 0, unpublished: 0 })
  })
})
