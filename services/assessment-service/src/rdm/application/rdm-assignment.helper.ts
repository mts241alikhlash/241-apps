import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { AssessmentItemWithDetails } from '../../assessment/domain/repositories/assessment-item.repository.js'
import type { IStudentScoreRepository } from '../../assessment/domain/repositories/student-score.repository.js'
import type { IAcademicLookupPort } from '../../platform/academic-lookup/academic-lookup.port.js'
import type { IEnrollmentLookupPort } from '../../platform/enrollment-lookup/enrollment-lookup.port.js'
import type { RosterStudent } from '../domain/rdm-rules.js'

export interface AssignmentMeta {
  classroomId: string
  semesterId: string
  classroomCode: string
  classroomName: string | null
  subjectName: string
}

export async function resolveAssignmentMeta(
  academicLookup: IAcademicLookupPort,
  teachingAssignmentId: string,
  allItems: AssessmentItemWithDetails[],
): Promise<AssignmentMeta> {
  const ref = allItems.find(
    (item) => item.teachingAssignment !== undefined,
  )?.teachingAssignment
  if (ref?.classroom && ref.subject) {
    return {
      classroomId: ref.classroomId,
      semesterId: ref.semesterId,
      classroomCode: ref.classroom.code,
      classroomName: ref.classroom.name,
      subjectName: ref.subject.name,
    }
  }

  const [detail] = await academicLookup.listTeachingAssignments([
    teachingAssignmentId,
  ])
  if (!detail) {
    throw new NotFoundException('Penugasan mengajar tidak ditemukan')
  }
  return {
    classroomId: detail.classroomId,
    semesterId: detail.semesterId,
    classroomCode: detail.classroomCode,
    classroomName: detail.classroomName,
    subjectName: detail.subjectName,
  }
}

export async function loadRoster(
  enrollmentLookup: IEnrollmentLookupPort,
  classroomId: string,
  semesterId: string,
): Promise<RosterStudent[]> {
  const enrollments = await enrollmentLookup.search({
    classroomId,
    semesterId,
  })
  return enrollments
    .filter((enrollment) => enrollment.status === 'ACTIVE')
    .map((enrollment) => ({
      enrollmentId: enrollment.id,
      nis: enrollment.studentNis,
      nisn: enrollment.studentNisn,
      name: enrollment.studentName ?? '',
    }))
}

export async function loadScoresByItem(
  studentScoreRepository: IStudentScoreRepository,
  itemIds: string[],
  enrollmentIds: string[],
): Promise<Map<string, Map<string, number | null>>> {
  const rawScores = await studentScoreRepository.findScoresForItems(
    itemIds,
    enrollmentIds,
  )
  const scoreMap = new Map<string, Map<string, number | null>>()
  for (const row of rawScores) {
    let byEnrollment = scoreMap.get(row.assessmentItemId)
    if (!byEnrollment) {
      byEnrollment = new Map<string, number | null>()
      scoreMap.set(row.assessmentItemId, byEnrollment)
    }
    byEnrollment.set(row.enrollmentId, row.score)
  }
  return scoreMap
}

export function buildSasCountError(
  sasType: string,
  items: AssessmentItemWithDetails[],
): BadRequestException {
  const names =
    [...items]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => item.name)
      .join(', ') || '-'
  return new BadRequestException(
    `Template SAS membutuhkan tepat satu penilaian jenis ${sasType}; ditemukan ${items.length}: ${names}`,
  )
}
