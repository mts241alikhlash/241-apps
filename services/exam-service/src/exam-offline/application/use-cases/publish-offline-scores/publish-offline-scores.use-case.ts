import { Injectable, Logger } from '@nestjs/common'
import { ExamActivityRepository } from '../../../../exam-activity/domain/repositories/exam-activity.repository.js'
import { PUBLISH_BATCH } from '../../../../exam-grading/application/use-cases/publish-scores/publish-scores.use-case.js'
import { IExamRoomRepository } from '../../../../exam-room/domain/repositories/exam-room.repository.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IEnrollmentLookupPort } from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import {
  IScorePublisherPort,
  type ExamScorePayload,
} from '../../../../platform/score-publisher/score-publisher.port.js'
import { IStudentDirectoryPort } from '../../../../platform/student-directory/student-directory.port.js'
import type { OfflineResult } from '../../../domain/entities/offline-result.entity.js'
import { IOfflineResultRepository } from '../../../domain/repositories/offline-result.repository.js'
import { OFFLINE_KIND_LABELS } from '../../../domain/score-sheet.js'

const MAX_ROUNDS = 20

class Unpublishable extends Error {}

@Injectable()
export class PublishOfflineScoresUseCase {
  private readonly logger = new Logger(PublishOfflineScoresUseCase.name)

  constructor(
    private readonly results: IOfflineResultRepository,
    private readonly schedules: IExamScheduleRepository,
    private readonly activities: ExamActivityRepository,
    private readonly rooms: IExamRoomRepository,
    private readonly enrollments: IEnrollmentLookupPort,
    private readonly academic: IAcademicLookupPort,
    private readonly publisher: IScorePublisherPort,
    private readonly students: IStudentDirectoryPort,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const seen: string[] = []
    let attempted = 0
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const batch = await this.results.findCandidates(now, PUBLISH_BATCH, seen)
      for (const result of batch) {
        seen.push(result.id)
        attempted += 1
        await this.publishOne(result, now)
      }
      if (batch.length < PUBLISH_BATCH) break
    }
    return attempted
  }

  private async publishOne(result: OfflineResult, now: Date): Promise<void> {
    try {
      const outcome = await this.publisher.publish(await this.payloadOf(result))
      if (outcome.result === 'SENT') {
        await this.results.markSent(result.id, now, result.enteredAt)
      } else {
        await this.results.markFailed(
          result.id,
          now,
          outcome.reason,
          outcome.result === 'REJECTED',
          result.enteredAt,
        )
      }
    } catch (error) {
      const permanent = error instanceof Unpublishable
      const reason = permanent
        ? error.message
        : 'Data nilai tidak bisa dilengkapi, coba lagi nanti'
      if (!permanent) {
        this.logger.error(
          `Offline result ${result.id} could not be published`,
          error instanceof Error ? error.stack : String(error),
        )
      }
      try {
        await this.results.markFailed(
          result.id,
          now,
          reason,
          permanent,
          result.enteredAt,
        )
      } catch (markError) {
        this.logger.error(
          `Failure of offline result ${result.id} could not be recorded`,
          markError instanceof Error ? markError.stack : String(markError),
        )
      }
    }
  }

  private async studentRef(studentId: string) {
    try {
      return (await this.students.refsByIds([studentId])).at(0)
    } catch (error) {
      this.logger.warn(
        `Student ${studentId} could not be named: ${String(error)}`,
      )
      return undefined
    }
  }

  private async payloadOf(result: OfflineResult): Promise<ExamScorePayload> {
    if (result.rawScore === null) throw new Unpublishable('Nilai kosong')
    const schedule = await this.schedules.findById(result.scheduleId)
    if (schedule === null) {
      throw new Unpublishable('Jadwal ujian tidak ditemukan')
    }
    const activity = schedule.activityId
      ? await this.activities.findById(schedule.activityId)
      : null
    if (activity?.offlineKind == null) {
      throw new Unpublishable('Kegiatan ujian offline tidak ditemukan')
    }
    const absences = await this.rooms.listAbsencesByScheduleStudent(
      schedule.id,
      result.studentId,
    )
    if (absences.length > 0) throw new Unpublishable('Siswa tidak hadir')

    const enrollment = await this.enrollments.findActiveByStudent(
      result.studentId,
      schedule.semesterId,
    )
    if (enrollment === null) {
      throw new Unpublishable(
        'Pendaftaran siswa di semester ini tidak ditemukan',
      )
    }
    const [[classroom], [subject]] = await Promise.all([
      this.academic.classroomsByIds([schedule.classroomId]),
      this.academic.subjectsByIds([schedule.subjectId]),
    ])
    if (classroom === undefined) {
      throw new Unpublishable('Kelas tidak ditemukan')
    }
    if (subject === undefined) {
      throw new Unpublishable('Mata pelajaran tidak ditemukan')
    }

    const student = await this.studentRef(result.studentId)
    const maxScore = activity.maxScore
    return {
      examSessionId: result.id,
      enrollmentId: enrollment.id,
      studentId: result.studentId,
      studentName: student?.name ?? null,
      studentNis: student?.nis ?? null,
      subjectId: schedule.subjectId,
      gradeId: classroom.gradeId,
      classroomId: schedule.classroomId,
      semesterId: schedule.semesterId,
      examTitle: `${subject.name} (${OFFLINE_KIND_LABELS[activity.offlineKind]})`,
      rawScore: result.rawScore,
      maxScore,
      score:
        maxScore > 0
          ? Math.round((result.rawScore / maxScore) * 10000) / 100
          : 0,
      gradedAt: result.enteredAt.toISOString(),
    }
  }
}
