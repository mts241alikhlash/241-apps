import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IEnrollmentLookupPort } from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import {
  AttendanceDayCounts,
  ClassroomScoreStats,
  IInstitutionDashboardRepository,
  ReportCardCounts,
} from '../../../domain/repositories/institution-dashboard.repository.js'
import { ActiveSemesterRef } from '../../../domain/repositories/my-dashboard.repository.js'

const ENROLLMENT_SCAN_LIMIT = 5000

@Injectable()
export class PrismaInstitutionDashboardRepository extends IInstitutionDashboardRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicLookup: IAcademicLookupPort,
    private readonly enrollmentLookup: IEnrollmentLookupPort,
  ) {
    super()
  }

  async findActiveSemester(): Promise<ActiveSemesterRef | null> {
    const semester = await this.academicLookup.findActiveSemester()
    if (!semester) return null
    return {
      id: semester.id,
      name: semester.typeName ?? '',
      academicYearId: semester.academicYearId,
    }
  }

  async findClassroomScoreStats(
    semesterId: string,
  ): Promise<ClassroomScoreStats[]> {
    const items = await this.prisma.assessmentItem.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        teachingAssignmentId: true,
        _count: {
          select: {
            studentScores: { where: { deletedAt: null, score: { not: null } } },
          },
        },
      },
    })
    if (items.length === 0) return []

    const assignments = await this.academicLookup.listTeachingAssignments([
      ...new Set(items.map((item) => item.teachingAssignmentId)),
    ])
    const classroomOf = new Map(
      assignments
        .filter((assignment) => assignment.semesterId === semesterId)
        .map((assignment) => [assignment.id, assignment]),
    )

    const filledByClassroom = new Map<string, number[]>()
    for (const item of items) {
      const assignment = classroomOf.get(item.teachingAssignmentId)
      if (!assignment) continue
      const list = filledByClassroom.get(assignment.classroomId) ?? []
      list.push(item._count.studentScores)
      filledByClassroom.set(assignment.classroomId, list)
    }
    if (filledByClassroom.size === 0) return []

    const classroomIds = [...filledByClassroom.keys()]
    const [counts, classrooms] = await Promise.all([
      this.enrollmentLookup.countByClassrooms(classroomIds, semesterId),
      this.academicLookup.listClassrooms(classroomIds),
    ])
    const sizeOf = new Map(counts.map((row) => [row.classroomId, row.count]))
    const nameOf = new Map(
      classrooms.map((room) => [room.id, room.name ?? room.code ?? '']),
    )

    return classroomIds
      .map((classroomId) => ({
        classroomId,
        classroomName: nameOf.get(classroomId) ?? '',
        studentCount: sizeOf.get(classroomId) ?? 0,
        itemFilled: filledByClassroom.get(classroomId) ?? [],
      }))
      .sort((a, b) => a.classroomName.localeCompare(b.classroomName))
  }

  async countAttendanceOn(day: Date): Promise<AttendanceDayCounts> {
    const rows = await this.prisma.$queryRaw<
      { status: string; total: bigint }[]
    >`SELECT status::text AS status, COUNT(DISTINCT enrollment_id) AS total FROM attendances WHERE date = ${day} AND deleted_at IS NULL GROUP BY status`
    const total = (status: string) =>
      Number(rows.find((row) => row.status === status)?.total ?? 0)
    return {
      present: total('PRESENT') + total('LATE'),
      sick: total('SICK'),
      permit: total('EXCUSED'),
      absent: total('ABSENT'),
    }
  }

  async countReportCards(semesterId: string): Promise<ReportCardCounts> {
    const enrollments = await this.enrollmentLookup.search({
      semesterId,
      limit: ENROLLMENT_SCAN_LIMIT,
    })
    const enrollmentId = { in: enrollments.map((row) => row.id) }
    const [published, unpublished] = await Promise.all([
      this.prisma.reportCard.count({
        where: { deletedAt: null, isPublished: true, enrollmentId },
      }),
      this.prisma.reportCard.count({
        where: { deletedAt: null, isPublished: false, enrollmentId },
      }),
    ])
    return { published, unpublished }
  }
}
