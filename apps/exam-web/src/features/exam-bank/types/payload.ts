import type { components as AcademicComponents } from '@mts241alikhlash/academic-api'
import type { components } from '@mts241alikhlash/exam-api'

type Schemas = components['schemas']
type AcademicSchemas = AcademicComponents['schemas']

export type ScopePair = Schemas['ScopePairDto']

export type QuestionScope = Schemas['QuestionScopeDto']

export interface NamedOption {
  id: string
  name: string
}

export type GradeRecord = AcademicSchemas['GradePageItemResponseDto']

export type ExamFile = Schemas['ExamFileDto']

export type ImportRowError = Schemas['ImportErrorDto']

export type ImportResult = Schemas['ImportResultDto']

export type TemplateFormat = 'xlsx' | 'docx'
