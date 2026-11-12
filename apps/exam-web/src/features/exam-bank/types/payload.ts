import type { components } from '@mts241alikhlash/exam-api'

type Schemas = components['schemas']

export type ScopePair = Schemas['ScopePairDto']

export type QuestionScope = Schemas['QuestionScopeDto']

export interface NamedOption {
  id: string
  name: string
}

export interface GradeRecord {
  id: string
  level: number
  name: string | null
}

export type ExamFile = Schemas['ExamFileDto']

export type ImportRowError = Schemas['ImportErrorDto']

export type ImportResult = Schemas['ImportResultDto']

export type TemplateFormat = 'xlsx' | 'docx'
