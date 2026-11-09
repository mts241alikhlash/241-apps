import { Injectable, NotFoundException } from '@nestjs/common'
import { IEnrollmentRepository } from '../../../../enrollment/domain/repositories/enrollment.repository.js'
import {
  IAcademicLookupPort,
  SemesterContext,
} from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IProfileLookupPort } from '../../../../platform/profile-lookup/profile-lookup.port.js'
import { IStudentIdentityReadPort } from '../../../domain/repositories/student-identity-read.port.js'
import {
  IParticipantNumberRepository,
  ParticipantNumberRow,
} from '../../../domain/repositories/participant-number.repository.js'
import {
  GRADE_LEVEL_WIDTH,
  ORDINAL_WIDTH,
  SCHOOL_CODE,
} from '../../../constants/participant-number.constants.js'

interface Candidate {
  studentId: string
  nis: string
  name: string | null
  gradeLevel: number
}

@Injectable()
export class IssueParticipantNumbersUseCase {
  constructor(
    private readonly academicLookup: IAcademicLookupPort,
    private readonly enrollmentRepository: IEnrollmentRepository,
    private readonly studentIdentity: IStudentIdentityReadPort,
    private readonly profileLookup: IProfileLookupPort,
    private readonly participantNumbers: IParticipantNumberRepository,
  ) {}

  async execute(semesterId: string): Promise<{ issued: number }> {
    const semester = await this.academicLookup.findSemesterContext(semesterId)
    if (!semester) {
      throw new NotFoundException(`Semester ${semesterId} not found`)
    }

    const enrollments =
      await this.enrollmentRepository.listActiveForSemester(semesterId)
    if (enrollments.length === 0) return { issued: 0 }

    const refs = await this.studentIdentity.listRefsByIds(
      enrollments.map((enrollment) => enrollment.studentId),
    )
    const [profiles, classrooms] = await Promise.all([
      this.profileLookup.findByUserIds(refs.map((ref) => ref.userId)),
      this.academicLookup.listClassroomsByIds([
        ...new Set(enrollments.map((enrollment) => enrollment.classroomId)),
      ]),
    ])

    const classroomById = new Map(classrooms.map((row) => [row.id, row]))
    const nameByUserId = new Map(profiles.map((row) => [row.userId, row.name]))
    const enrollmentByStudent = new Map(
      enrollments.map((row) => [row.studentId, row]),
    )
    const gradeLevelFromClassroom = (studentId: string) =>
      classroomById.get(enrollmentByStudent.get(studentId)?.classroomId ?? '')
        ?.gradeLevel ?? null
    const gradeIds = refs
      .filter((ref) => gradeLevelFromClassroom(ref.id) === null)
      .map((ref) => ref.gradeId)
      .filter((id): id is string => id !== null)
    const grades =
      gradeIds.length > 0
        ? await this.academicLookup.listGradesByIds(gradeIds)
        : []
    const levelByGradeId = new Map(grades.map((row) => [row.id, row.level]))

    const candidates: Candidate[] = refs.map((ref) => ({
      studentId: ref.id,
      nis: ref.nis,
      name: nameByUserId.get(ref.userId)?.trim() || null,
      gradeLevel:
        gradeLevelFromClassroom(ref.id) ??
        (ref.gradeId ? levelByGradeId.get(ref.gradeId) : undefined) ??
        0,
    }))

    const prefix = numberPrefix(semester)
    const issued = await this.participantNumbers.issue(
      semesterId,
      (existing) => {
        const numbered = new Set(existing.map((row) => row.studentId))
        const nextOrdinal = new Map<number, number>()
        for (const row of existing) {
          nextOrdinal.set(
            row.gradeLevel,
            Math.max(nextOrdinal.get(row.gradeLevel) ?? 0, row.ordinal),
          )
        }

        const drafts: ParticipantNumberRow[] = []
        for (const candidate of sortByGradeThenName(candidates)) {
          if (numbered.has(candidate.studentId)) continue
          const ordinal = (nextOrdinal.get(candidate.gradeLevel) ?? 0) + 1
          nextOrdinal.set(candidate.gradeLevel, ordinal)
          drafts.push({
            studentId: candidate.studentId,
            semesterId,
            gradeLevel: candidate.gradeLevel,
            ordinal,
            number:
              `${prefix}${String(candidate.gradeLevel).padStart(GRADE_LEVEL_WIDTH, '0')}` +
              `-${String(ordinal).padStart(ORDINAL_WIDTH, '0')}`,
          })
        }
        return drafts
      },
    )

    return { issued }
  }
}

function numberPrefix(semester: SemesterContext): string {
  const startYear = semester.academicYearName?.match(/\d{4}/)?.[0]
  const year = startYear
    ? Number(startYear) % 100
    : new Date().getFullYear() % 100
  const term =
    semester.sequence >= 1 && semester.sequence <= 9 ? semester.sequence : 1
  return `${SCHOOL_CODE}-${String(year).padStart(2, '0')}${term}-`
}

function sortByGradeThenName(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => {
    if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel
    if (a.name && b.name) {
      return a.name.localeCompare(b.name) || a.nis.localeCompare(b.nis)
    }
    if (a.name) return -1
    if (b.name) return 1
    return a.nis.localeCompare(b.nis)
  })
}
