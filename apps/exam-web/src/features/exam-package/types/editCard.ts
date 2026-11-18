import type { QuestionContent, QuestionType } from '@/features/exam-bank/types'

export interface EditCard {
  key: string
  questionId: string
  type: QuestionType
  bodyHtml: string
  content: QuestionContent
  points: number
  original: {
    bodyHtml: string
    content: QuestionContent
    points: number
  }
  error: string | null
}

export interface EditChange {
  questionId: string
  bodyHtml?: string
  content?: QuestionContent
  points?: number
}
