import { Injectable, NotFoundException } from '@nestjs/common'
import { IQuestionRepository } from '../../../../question/domain/repositories/question.repository.js'
import { applyKeyOverride } from '../../../../question/domain/value-objects/question-content.js'
import type { ExamPackagePrintView } from '../../../domain/entities/exam-package.entity.js'
import { IExamPackageRepository } from '../../../domain/repositories/exam-package.repository.js'
import type { PackageViewer } from '../get-exam-package/get-exam-package.use-case.js'

@Injectable()
export class GetPackagePrintUseCase {
  constructor(
    private readonly packages: IExamPackageRepository,
    private readonly questions: IQuestionRepository,
  ) {}

  async execute(
    id: string,
    viewer?: PackageViewer,
  ): Promise<ExamPackagePrintView> {
    const found = await this.packages.findById(id)
    if (found === null) throw new NotFoundException('Paket tidak ditemukan')
    if (
      viewer !== undefined &&
      !viewer.canSeeAll &&
      found.createdById !== viewer.id &&
      found.status !== 'APPROVED' &&
      found.status !== 'LOCKED'
    ) {
      throw new NotFoundException('Paket tidak ditemukan')
    }

    const pinned = await this.questions.findPinned(
      found.items.map((item) => ({
        questionId: item.questionId,
        number: item.questionVersion,
      })),
    )
    const byKey = new Map(
      pinned.map((row) => [`${row.questionId}:${row.number}`, row]),
    )

    return {
      ...found,
      items: found.items.map((item) => {
        const row = byKey.get(`${item.questionId}:${item.questionVersion}`)
        if (row === undefined) {
          throw new NotFoundException('Versi soal pada paket tidak ditemukan')
        }
        const resolution = item.resolution ?? 'NORMAL'
        const content =
          resolution === 'KEY_OVERRIDE' && item.overrideContent != null
            ? applyKeyOverride(row.content, item.overrideContent)
            : row.content
        return {
          questionId: item.questionId,
          questionVersion: item.questionVersion,
          position: item.position,
          type: row.type,
          bodyHtml: row.bodyHtml,
          content,
          points: row.points,
          resolution,
        }
      }),
    }
  }
}
