import { SchoolTimeService } from '@mts241alikhlash/nest-core/time'
import { Injectable } from '@nestjs/common'
import {
  AttendanceDayCounts,
  IInstitutionDashboardRepository,
  ReportCardCounts,
} from '../../../domain/repositories/institution-dashboard.repository.js'

export interface InstitutionDashboard {
  semester: { id: string; name: string } | null
  scoreCompleteness: {
    classroomId: string
    classroomName: string
    filled: number
    expected: number
  }[]
  attendanceToday: AttendanceDayCounts & { date: Date }
  examScores: ReportCardCounts
}

@Injectable()
export class GetInstitutionDashboardUseCase {
  constructor(
    private readonly repository: IInstitutionDashboardRepository,
    private readonly schoolTime: SchoolTimeService,
  ) {}

  async execute(): Promise<InstitutionDashboard> {
    const date = this.schoolTime.today()
    const semester = await this.repository.findActiveSemester()
    const [stats, attendance, reportCards] = await Promise.all([
      semester
        ? this.repository.findClassroomScoreStats(semester.id)
        : Promise.resolve([]),
      this.repository.countAttendanceOn(date),
      semester
        ? this.repository.countReportCards(semester.id)
        : Promise.resolve({ published: 0, unpublished: 0 }),
    ])
    return {
      semester: semester ? { id: semester.id, name: semester.name } : null,
      scoreCompleteness: stats.map((row) => ({
        classroomId: row.classroomId,
        classroomName: row.classroomName,
        filled: row.itemFilled.reduce((sum, count) => sum + count, 0),
        expected: row.itemFilled.length * row.studentCount,
      })),
      attendanceToday: { ...attendance, date },
      examScores: reportCards,
    }
  }
}
