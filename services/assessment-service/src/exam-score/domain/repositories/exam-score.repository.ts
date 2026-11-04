import type { PaginatedResult } from '@mts241alikhlash/nest-core/domain'
import type {
  ExamScore,
  ExamScoreInput,
} from '../entities/exam-score.entity.js'

export interface ExamScoreQuery {
  page: number
  limit: number
  semesterId?: string
  classroomId?: string
  subjectId?: string
  pairs: { subjectId: string; classroomId: string }[] | null
}

export abstract class IExamScoreRepository {
  abstract upsert(input: ExamScoreInput): Promise<ExamScore>
  abstract findPage(query: ExamScoreQuery): Promise<PaginatedResult<ExamScore>>
}
