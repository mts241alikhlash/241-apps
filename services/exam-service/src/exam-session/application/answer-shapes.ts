import { NotFoundException } from '@nestjs/common'
import { IExamPackageRepository } from '../../exam-package/domain/repositories/exam-package.repository.js'
import { IExamScheduleRepository } from '../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IQuestionRepository } from '../../question/domain/repositories/question.repository.js'
import type { PaperSource } from '../domain/policies/build-paper.policy.js'

export type AnswerShape = Pick<PaperSource, 'type' | 'content'>

const MAX_ENTRIES = 5000

export class AnswerShapeCache {
  private readonly shapes = new Map<string, AnswerShape>()

  get(questionId: string, version: number): AnswerShape | undefined {
    return this.shapes.get(shapeKey(questionId, version))
  }

  set(questionId: string, version: number, shape: AnswerShape): void {
    const key = shapeKey(questionId, version)
    if (!this.shapes.has(key) && this.shapes.size >= MAX_ENTRIES) {
      const oldest = this.shapes.keys().next()
      if (!oldest.done) this.shapes.delete(oldest.value)
    }
    this.shapes.set(key, shape)
  }
}

function shapeKey(questionId: string, version: number): string {
  return `${questionId}:${version}`
}

export async function loadAnswerShapes(
  schedules: IExamScheduleRepository,
  packages: IExamPackageRepository,
  questions: IQuestionRepository,
  scheduleId: string,
  cache: AnswerShapeCache,
): Promise<Map<string, AnswerShape>> {
  const schedule = await schedules.findById(scheduleId)
  if (schedule === null) {
    throw new NotFoundException('Jadwal ujian tidak ditemukan')
  }
  const pkg =
    schedule.packageId === null
      ? null
      : await packages.findById(schedule.packageId)
  if (pkg === null) throw new NotFoundException('Paket soal tidak ditemukan')

  const missing = pkg.items.filter(
    (item) => cache.get(item.questionId, item.questionVersion) === undefined,
  )
  if (missing.length > 0) {
    const pinned = await questions.findPinned(
      missing.map((item) => ({
        questionId: item.questionId,
        number: item.questionVersion,
      })),
    )
    for (const row of pinned) {
      cache.set(row.questionId, row.number, {
        type: row.type,
        content: row.content,
      })
    }
  }

  const shapes = new Map<string, AnswerShape>()
  for (const item of pkg.items) {
    const shape = cache.get(item.questionId, item.questionVersion)
    if (shape !== undefined) shapes.set(item.questionId, shape)
  }
  return shapes
}
