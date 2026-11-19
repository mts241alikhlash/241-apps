import type { QuestionDraft, QuestionType } from '@/features/exam-bank/types'

export interface CardEntry {
  key: string
  type: QuestionType
  error: string | null
}

export interface DraftCard extends CardEntry {
  draft: QuestionDraft
  authorId: string
}
