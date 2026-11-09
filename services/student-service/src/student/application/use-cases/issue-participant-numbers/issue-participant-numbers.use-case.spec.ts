import { NotFoundException } from '@nestjs/common'
import { IEnrollmentRepository } from '../../../../enrollment/domain/repositories/enrollment.repository.js'
import {
  IAcademicLookupPort,
  SemesterContext,
} from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IProfileLookupPort } from '../../../../platform/profile-lookup/profile-lookup.port.js'
import {
  IParticipantNumberRepository,
  ParticipantNumberRow,
} from '../../../domain/repositories/participant-number.repository.js'
import { IStudentIdentityReadPort } from '../../../domain/repositories/student-identity-read.port.js'
import { IssueParticipantNumbersUseCase } from './issue-participant-numbers.use-case.js'

const semester: SemesterContext = {
  id: 'sem-1',
  academicYearId: 'year-1',
  academicYearName: '2026/2027',
  typeId: 'type-1',
  typeName: 'Ganjil',
  isActive: true,
  sequence: 1,
}

interface StudentSeed {
  id: string
  userId: string
  nis: string
  gradeId?: string | null
  name?: string
  classroomId: string
  gradeLevel: number | null
}

function setup(seeds: StudentSeed[], context: SemesterContext = semester) {
  const rows: ParticipantNumberRow[] = []
  const participantRepository = {
    findByStudent: vi.fn(
      async (studentId: string, semesterId: string) =>
        rows.find(
          (row) => row.studentId === studentId && row.semesterId === semesterId,
        ) ?? null,
    ),
    issue: vi.fn(
      async (
        semesterId: string,
        build: (
          existing: readonly ParticipantNumberRow[],
        ) => Promise<ParticipantNumberRow[]> | ParticipantNumberRow[],
      ) => {
        const drafts = await build(
          rows.filter((row) => row.semesterId === semesterId),
        )
        rows.push(...drafts)
        return drafts.length
      },
    ),
  }

  const useCase = new IssueParticipantNumbersUseCase(
    {
      findSemesterContext: vi.fn().mockResolvedValue(context),
      listClassroomsByIds: vi.fn().mockImplementation(async () =>
        seeds.map((seed) => ({
          id: seed.classroomId,
          code: '7A',
          name: null,
          gradeId: 'grade-1',
          academicYearId: 'year-1',
          capacity: 30,
          gradeLevel: seed.gradeLevel,
          gradeName: null,
        })),
      ),
      listGradesByIds: vi.fn().mockImplementation(async () =>
        seeds.map((seed) => ({
          id: seed.gradeId ?? 'grade-unknown',
          level: 8,
          name: null,
        })),
      ),
    } as unknown as IAcademicLookupPort,
    {
      listActiveForSemester: vi.fn().mockImplementation(async () =>
        seeds.map((seed) => ({
          studentId: seed.id,
          classroomId: seed.classroomId,
        })),
      ),
    } as unknown as IEnrollmentRepository,
    {
      listRefsByIds: vi.fn().mockImplementation(async () =>
        seeds.map(({ id, userId, nis, gradeId }) => ({
          id,
          userId,
          nis,
          gradeId,
        })),
      ),
    } as unknown as IStudentIdentityReadPort,
    {
      findByUserIds: vi
        .fn()
        .mockImplementation(async () =>
          seeds
            .filter((seed) => seed.name !== undefined)
            .map((seed) => ({ userId: seed.userId, name: seed.name })),
        ),
    } as unknown as IProfileLookupPort,
    participantRepository as unknown as IParticipantNumberRepository,
  )

  return { useCase, rows, participantRepository }
}

const ani: StudentSeed = {
  id: 'student-ani',
  userId: 'user-ani',
  nis: '2026003',
  gradeId: 'grade-8',
  name: 'Ani',
  classroomId: 'classroom-8a',
  gradeLevel: 8,
}

const budi: StudentSeed = {
  id: 'student-budi',
  userId: 'user-budi',
  nis: '2026001',
  gradeId: 'grade-8',
  name: 'Budi',
  classroomId: 'classroom-8a',
  gradeLevel: 8,
}

describe('IssueParticipantNumbersUseCase', () => {
  it('numbers a grade by student name, not by NIS', async () => {
    const { useCase } = setup([budi, ani])

    const result = await useCase.execute('sem-1')

    expect(result).toEqual({ issued: 2, skipped: [] })
  })

  it('formats the number from school code, year, term, grade and ordinal', async () => {
    const { useCase, rows } = setup([budi, ani])

    await useCase.execute('sem-1')

    expect(
      rows.sort((a, b) => a.ordinal - b.ordinal).map((row) => row.number),
    ).toEqual(['241-261-08-001', '241-261-08-002'])
    expect(rows.find((row) => row.studentId === 'student-ani')?.number).toBe(
      '241-261-08-001',
    )
    expect(rows.find((row) => row.studentId === 'student-budi')?.number).toBe(
      '241-261-08-002',
    )
  })

  it('issues nothing on a second run and never renumbers', async () => {
    const { useCase, rows } = setup([budi, ani])

    await useCase.execute('sem-1')
    const second = await useCase.execute('sem-1')

    expect(second).toEqual({ issued: 0, skipped: [] })
    expect(rows.map((row) => row.number).sort()).toEqual([
      '241-261-08-001',
      '241-261-08-002',
    ])
  })

  it('gives a late joiner the next ordinal without touching the others', async () => {
    const seeds = [budi, ani]
    const { useCase, rows } = setup(seeds)
    await useCase.execute('sem-1')

    seeds.push({
      id: 'student-citra',
      userId: 'user-citra',
      nis: '2026000',
      gradeId: 'grade-8',
      name: 'Citra',
      classroomId: 'classroom-8a',
      gradeLevel: 8,
    })
    const result = await useCase.execute('sem-1')

    expect(result).toEqual({ issued: 1, skipped: [] })
    expect(rows.find((row) => row.studentId === 'student-citra')?.number).toBe(
      '241-261-08-003',
    )
    expect(rows.find((row) => row.studentId === 'student-ani')?.number).toBe(
      '241-261-08-001',
    )
  })

  it('starts another grade at 001', async () => {
    const { useCase, rows } = setup([
      ani,
      {
        id: 'student-dewi',
        userId: 'user-dewi',
        nis: '2026004',
        gradeId: 'grade-7',
        name: 'Dewi',
        classroomId: 'classroom-7a',
        gradeLevel: 7,
      },
    ])

    await useCase.execute('sem-1')

    expect(rows.find((row) => row.studentId === 'student-dewi')?.number).toBe(
      '241-261-07-001',
    )
  })

  it('orders students without a name by NIS', async () => {
    const { useCase, rows } = setup([
      { ...budi, name: undefined },
      { ...ani, name: undefined },
    ])

    await useCase.execute('sem-1')

    expect(rows.find((row) => row.studentId === 'student-budi')?.number).toBe(
      '241-261-08-001',
    )
    expect(rows.find((row) => row.studentId === 'student-ani')?.number).toBe(
      '241-261-08-002',
    )
  })

  it('takes the term from the semester type sequence', async () => {
    const { useCase, rows } = setup([ani], {
      ...semester,
      typeName: 'Genap',
      sequence: 2,
    })

    await useCase.execute('sem-1')

    expect(rows[0]?.number).toBe('241-262-08-001')
  })

  it('skips a student no grade can be resolved for', async () => {
    const { useCase, rows } = setup([
      ani,
      {
        id: 'student-ungraded',
        userId: 'user-ungraded',
        nis: '2026009',
        gradeId: null,
        name: 'Eko',
        classroomId: 'classroom-unknown',
        gradeLevel: null,
      },
    ])

    const result = await useCase.execute('sem-1')

    expect(result).toEqual({ issued: 1, skipped: ['student-ungraded'] })
    expect(rows.map((row) => row.studentId)).toEqual(['student-ani'])
  })

  it('fails when the semester has no 4-digit academic year', async () => {
    const { useCase } = setup([ani], {
      ...semester,
      academicYearName: null,
    })

    await expect(useCase.execute('sem-1')).rejects.toThrow(/academic year/)
  })

  it('fails when the term sequence is outside 1-9', async () => {
    const { useCase } = setup([ani], { ...semester, sequence: 99 })

    await expect(useCase.execute('sem-1')).rejects.toThrow(/sequence 99/)
  })

  it('fails when the semester is unknown', async () => {
    const { useCase } = setup([ani], null as unknown as SemesterContext)

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException)
  })
})
