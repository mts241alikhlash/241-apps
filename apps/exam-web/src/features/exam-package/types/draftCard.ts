import type { QuestionDraft, QuestionType } from '@/features/exam-bank/types'

export interface DraftCard {
  key: string
  type: QuestionType
  draft: QuestionDraft
  authorId: string
  error: string | null
}
