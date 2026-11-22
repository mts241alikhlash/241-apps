import { Injectable, NotFoundException } from '@nestjs/common'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
import { IStudentDirectoryPort } from '../../../../platform/student-directory/student-directory.port.js'
import type { PaginatedResult } from '@mts241alikhlash/nest-core/domain'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'

export interface ScheduleSessionRow extends ExamSession {
  studentName: string | null
  studentNis: string | null
  participantNumber: string | null
}

@Injectable()
export class ListScheduleSessionsUseCase {
  constructor(
    private readonly schedules: IExamScheduleRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly students: IStudentDirectoryPort,
    private readonly participantNumbers: IParticipantNumberPort,
  ) {}

  async execute(
    scheduleId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<ScheduleSessionRow>> {
    const schedule = await this.schedules.findById(scheduleId)
    if (schedule === null) {
      throw new NotFoundException('Jadwal tidak ditemukan')
    }
    const result = await this.sessions.findPageBySchedule(
      scheduleId,
      page,
      limit,
    )
    const refs = new Map(
      (
        await this.students.refsByIds(result.data.map((row) => row.studentId))
      ).map((ref) => [ref.id, ref]),
    )
    const numbers = await this.numbersOf(
      result.data.map((row) => row.studentId),
      schedule.semesterId,
    )
    return {
      ...result,
      data: result.data.map((row) => ({
        ...row,
        studentName: refs.get(row.studentId)?.name ?? null,
        studentNis: refs.get(row.studentId)?.nis ?? null,
        participantNumber: numbers.get(row.studentId) ?? null,
      })),
    }
  }

  private async numbersOf(
    studentIds: string[],
    semesterId: string,
  ): Promise<Map<string, string>> {
    if (studentIds.length === 0) return new Map()
    try {
      return await this.participantNumbers.findNumbers(studentIds, semesterId)
    } catch {
      return new Map()
    }
  }
}
