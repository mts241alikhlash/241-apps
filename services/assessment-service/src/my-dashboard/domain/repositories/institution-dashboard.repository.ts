import { ActiveSemesterRef } from './my-dashboard.repository.js'

export interface ClassroomScoreStats {
  classroomId: string
  classroomName: string
  studentCount: number
  itemFilled: number[]
}

export interface AttendanceDayCounts {
  present: number
  sick: number
  permit: number
  absent: number
}

export interface ReportCardCounts {
  published: number
  unpublished: number
}

export abstract class IInstitutionDashboardRepository {
  abstract findActiveSemester(): Promise<ActiveSemesterRef | null>
  abstract findClassroomScoreStats(
    semesterId: string,
  ): Promise<ClassroomScoreStats[]>
  abstract countAttendanceOn(day: Date): Promise<AttendanceDayCounts>
  abstract countReportCards(semesterId: string): Promise<ReportCardCounts>
}
