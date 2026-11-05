import { ApiProperty } from '@nestjs/swagger'
import type { InstitutionDashboard } from '../../../../application/use-cases/get-institution-dashboard/get-institution-dashboard.use-case.js'

export class InstitutionSemesterResponseDto {
  @ApiProperty({ type: String })
  id!: string

  @ApiProperty({ type: String })
  name!: string
}

export class ScoreCompletenessResponseDto {
  @ApiProperty({ type: String })
  classroomId!: string

  @ApiProperty({ type: String })
  classroomName!: string

  @ApiProperty({ type: Number })
  filled!: number

  @ApiProperty({ type: Number })
  expected!: number
}

export class InstitutionAttendanceTodayResponseDto {
  @ApiProperty({ type: Number })
  present!: number

  @ApiProperty({ type: Number })
  sick!: number

  @ApiProperty({ type: Number })
  permit!: number

  @ApiProperty({ type: Number })
  absent!: number

  @ApiProperty({ type: String, format: 'date-time' })
  date!: string
}

export class InstitutionExamScoresResponseDto {
  @ApiProperty({ type: Number })
  published!: number

  @ApiProperty({ type: Number })
  unpublished!: number
}

export class InstitutionDashboardResponseDto {
  @ApiProperty({ type: () => InstitutionSemesterResponseDto, nullable: true })
  semester!: InstitutionSemesterResponseDto | null

  @ApiProperty({ type: () => [ScoreCompletenessResponseDto] })
  scoreCompleteness!: ScoreCompletenessResponseDto[]

  @ApiProperty({ type: () => InstitutionAttendanceTodayResponseDto })
  attendanceToday!: InstitutionAttendanceTodayResponseDto

  @ApiProperty({ type: () => InstitutionExamScoresResponseDto })
  examScores!: InstitutionExamScoresResponseDto

  static fromDomain(
    domain: InstitutionDashboard,
  ): InstitutionDashboardResponseDto {
    const dto = new InstitutionDashboardResponseDto()
    dto.semester = domain.semester
      ? { id: domain.semester.id, name: domain.semester.name }
      : null
    dto.scoreCompleteness = domain.scoreCompleteness.map((row) => ({
      classroomId: row.classroomId,
      classroomName: row.classroomName,
      filled: row.filled,
      expected: row.expected,
    }))
    dto.attendanceToday = {
      present: domain.attendanceToday.present,
      sick: domain.attendanceToday.sick,
      permit: domain.attendanceToday.permit,
      absent: domain.attendanceToday.absent,
      date: domain.attendanceToday.date.toISOString(),
    }
    dto.examScores = {
      published: domain.examScores.published,
      unpublished: domain.examScores.unpublished,
    }
    return dto
  }
}
