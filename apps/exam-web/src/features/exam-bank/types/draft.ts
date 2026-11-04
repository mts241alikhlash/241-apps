import type { QuestionContent } from './question'

export interface QuestionDraft {
  bodyHtml: string
  content: QuestionContent
  points: number
}
